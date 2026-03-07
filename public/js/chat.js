import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { showToast } from './utils.js';

let currentUser = null;
let currentUserRole = 'user';
let activeChatUserId = null;
let chatUnsubscribe = null;
let allUsers = [];

// DOM Elements
const chatContactListView = document.getElementById('chat-contact-list-view');
const chatActiveView = document.getElementById('chat-active-view');
const chatContactsContainer = document.getElementById('chat-contacts-container');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSearch = document.getElementById('chat-search');
const chatBackBtn = document.getElementById('chat-back-btn');
const chatActiveName = document.getElementById('chat-active-name');
const chatActiveRole = document.getElementById('chat-active-role');
const chatActiveAvatar = document.getElementById('chat-active-avatar');
const chatEditId = document.getElementById('chat-edit-id');
const chatCancelEditBtn = document.getElementById('chat-cancel-edit-btn');
const chatSubmitBtn = document.getElementById('chat-submit-btn');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (window.location.pathname.includes('support.html') || window.location.pathname.includes('community.html')) {
            window.location.href = 'login.html';
        }
        return;
    }
    currentUser = user;

    // Fetch user role
    try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
            currentUserRole = uDoc.data().role || 'user';
        }
    } catch (e) { }

    initChat();
});

function initChat() {
    loadContacts();

    if (chatSearch) {
        chatSearch.addEventListener('input', (e) => {
            renderContacts(e.target.value.toLowerCase());
        });
    }

    if (chatBackBtn) {
        chatBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            activeChatUserId = null;
            window.activeChatUserId = null;
            if (chatUnsubscribe) chatUnsubscribe();
            chatActiveView.style.display = 'none';
            chatContactListView.style.display = 'flex';
        });
    }

    if (chatCancelEditBtn) {
        chatCancelEditBtn.addEventListener('click', () => {
            cancelEdit();
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text || !activeChatUserId) return;

            const editId = chatEditId.value;

            try {
                if (editId) {
                    // Update existing
                    await updateDoc(doc(db, 'chats', editId), {
                        text,
                        isEdited: true,
                        // DO NOT override serverTimestamp for updates
                    });
                    showToast("Message edited", "success");
                    cancelEdit();
                } else {
                    // Sending new message
                    const chatID = [currentUser.uid, activeChatUserId].sort().join('_');
                    await addDoc(collection(db, 'chats'), {
                        chatID,
                        senderId: currentUser.uid,
                        receiverId: activeChatUserId,
                        text,
                        timestamp: serverTimestamp(),
                        senderRole: currentUserRole,
                        isEdited: false
                    });
                    chatInput.value = '';
                }
            } catch (e) {
                console.error(e);
                showToast("Failed to process message", "error");
            }
        });
    }
}

async function loadContacts() {
    // For simplicity, fetch all users. In a large app, we would only fetch users we have active chats with.
    if (!chatContactsContainer) return;

    try {
        const snapshot = await getDocs(query(collection(db, 'users'), orderBy('name')));
        allUsers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.id !== currentUser.uid); // exclude self

        renderContacts('');
    } catch (err) {
        console.error("Error loading contacts: ", err);
    }
}

function renderContacts(filterText) {
    if (!chatContactsContainer) return;
    chatContactsContainer.innerHTML = '';

    let filtered = [];

    if (currentUserRole === 'admin') {
        filtered = allUsers.filter(u =>
            (u.name && u.name.toLowerCase().includes(filterText)) ||
            (u.username && u.username.toLowerCase().includes(filterText)) ||
            (u.role && u.role.toLowerCase().includes(filterText))
        );
    } else {
        if (!filterText) {
            chatContactsContainer.innerHTML = `<div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.95rem;">
                <i class="fas fa-search" style="font-size:2rem; margin-bottom:1rem; opacity:0.5;"></i><br>
                Explore other users by typing their exact username to start a chat.
            </div>`;
            return;
        }
        filtered = allUsers.filter(u =>
            (u.username && u.username.toLowerCase() === filterText) ||
            (u.username && u.username.toLowerCase().startsWith(filterText))
        );
    }

    if (filtered.length === 0) {
        chatContactsContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No contacts found.</div>`;
        return;
    }

    filtered.forEach(user => {
        const div = document.createElement('div');
        div.className = 'chat-contact-item';
        div.style.cssText = `
            display: flex; align-items: center; gap: 0.75rem;
            padding: 1rem; border-bottom: 1px solid var(--border-light);
            cursor: pointer; transition: background 0.2s;
        `;
        div.onmouseover = () => div.style.background = 'var(--bg-1)';
        div.onmouseout = () => div.style.background = 'transparent';

        const avatarContent = user.avatarUrl
            ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
            : `${user.name ? user.name[0].toUpperCase() : 'U'}`;

        div.innerHTML = `
            <div style="width:40px; height:40px; border-radius:50%; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
                ${avatarContent}
            </div>
            <div style="flex:1;">
                <div style="font-weight:700; color:var(--text); font-size:0.95rem;">${user.name || 'Unknown'} <span style="font-size:0.7rem; font-weight:normal; background:var(--bg-2); padding:0.1rem 0.4rem; border-radius:var(--r-full); color:var(--text-muted);">${user.role === 'admin' ? 'Admin' : 'User'}</span></div>
                <div style="font-size:0.8rem; color:var(--text-muted);">Click to open chat</div>
            </div>
        `;

        div.addEventListener('click', () => openChat(user));
        chatContactsContainer.appendChild(div);
    });
}

function openChat(user) {
    activeChatUserId = user.id;
    window.activeChatUserId = user.id;
    chatContactListView.style.display = 'none';
    chatActiveView.style.display = 'flex';

    chatActiveName.textContent = user.name || 'Unknown User';
    chatActiveRole.textContent = user.role === 'admin' ? 'Admin' : 'Community Member';

    if (user.avatarUrl) {
        chatActiveAvatar.innerHTML = `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        chatActiveAvatar.textContent = user.name ? user.name[0].toUpperCase() : 'U';
    }

    loadMessages(user.id);
}

function loadMessages(targetUserId) {
    if (chatUnsubscribe) chatUnsubscribe();
    chatMessagesContainer.innerHTML = '';

    const chatID = [currentUser.uid, targetUserId].sort().join('_');
    const q = query(collection(db, 'chats'), where('chatID', '==', chatID), orderBy('timestamp', 'asc'));

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        chatMessagesContainer.innerHTML = '';

        if (snapshot.empty) {
            chatMessagesContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-top:1rem;">Send a message to start chatting!</div>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const id = docSnap.id;
            const isMe = msg.senderId === currentUser.uid;

            const mDiv = document.createElement('div');
            mDiv.className = `msg ${isMe ? 'msg-me' : 'msg-them'}`;
            // Base styles
            mDiv.style.maxWidth = '85%';
            mDiv.style.padding = '0.65rem 0.9rem';
            mDiv.style.borderRadius = '12px';
            mDiv.style.fontSize = '0.9rem';
            mDiv.style.lineHeight = '1.4';
            mDiv.style.position = 'relative';

            if (isMe) {
                mDiv.style.alignSelf = 'flex-end';
                mDiv.style.background = 'var(--primary)';
                mDiv.style.color = 'white';
                mDiv.style.borderBottomRightRadius = '2px';
            } else {
                mDiv.style.alignSelf = 'flex-start';
                mDiv.style.background = 'white';
                mDiv.style.border = '1px solid var(--border-light)';
                mDiv.style.borderBottomLeftRadius = '2px';
                mDiv.style.color = 'var(--text)';
            }

            // Edit flag
            const editedTag = msg.isEdited ? `<span style="font-size:0.65rem; opacity:0.7; margin-left:5px;">(edited)</span>` : '';

            mDiv.innerHTML = `<div>${escapeHtml(msg.text)} ${editedTag}</div>`;

            // Setup actions (Edit/Delete). 
            // Rule: "dan chatnya bisa dihapus dan diedit, kecuali chat dari user yang rolenya admin."
            // So if senderRole is admin, nobody can edit or delete it.
            // If sender is ME and I am not an admin, I can edit/delete my own message.
            if (isMe && msg.senderRole !== 'admin') {
                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = `
                    display: flex; gap: 0.5rem; justify-content: flex-end; 
                    margin-top: 0.25rem; font-size: 0.7rem; opacity: 0.8;
                `;

                const editBtn = document.createElement('span');
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.style.cursor = 'pointer';
                editBtn.title = 'Edit';
                editBtn.onclick = () => enableEdit(id, msg.text);

                const delBtn = document.createElement('span');
                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                delBtn.style.cursor = 'pointer';
                delBtn.title = 'Delete';
                delBtn.onclick = () => deleteMessage(id);

                actionsDiv.appendChild(editBtn);
                actionsDiv.appendChild(delBtn);
                mDiv.appendChild(actionsDiv);
            }

            chatMessagesContainer.appendChild(mDiv);
        });

        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
}

function enableEdit(id, currentText) {
    chatEditId.value = id;
    chatInput.value = currentText;
    chatInput.focus();
    chatCancelEditBtn.style.display = 'inline-block';
    chatSubmitBtn.innerHTML = '<i class="fas fa-check"></i>';
}

function cancelEdit() {
    chatEditId.value = '';
    chatInput.value = '';
    chatCancelEditBtn.style.display = 'none';
    chatSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
}

window.deleteMessage = async (id) => {
    if (confirm("Delete this message?")) {
        try {
            await deleteDoc(doc(db, 'chats', id));
            showToast("Message deleted", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to delete", "error");
        }
    }
};

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
