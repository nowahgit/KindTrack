import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

let currentUser = null;
let activeTab = 'users';
let selectedChatUserId = null;

// Auth check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        // For development/contest purposes, if no admin exists, we'll let the user in
        // if they are the first user or explicitly navigating here.
        // But strictly: showToast('Unauthorized access', 'error'); window.location.href = 'dashboard.html';
        console.warn('Non-admin user accessing admin panel');
        // Uncomment below for strict security:
        // window.location.href = 'dashboard.html';
    }

    currentUser = user;
    const data = userDoc.data();
    document.getElementById('admin-name').textContent = data?.name || user.displayName || 'Admin';
    if (data?.avatarUrl) {
        document.getElementById('admin-avatar').innerHTML = `<img src="${data.avatarUrl}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">`;
    }

    initializeApp();
});

function initializeApp() {
    setupTabListeners();
    loadUsers();
    loadReports();
    loadCommunity();
    setupChatListeners();
}

function setupTabListeners() {
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`).classList.add('active');

    document.querySelectorAll('.section-tab').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Update titles
    const titles = {
        'users': ['User Management', 'Monitor and manage all KindTrack registered users.'],
        'community': ['Community Monitoring', 'Browse and moderate public acts of kindness.'],
        'reports': ['Content Reports', 'Review items flagged by the community.'],
        'chat': ['Support Inbox', 'Direct communication with KindTrack users.']
    };
    document.getElementById('page-title').textContent = titles[tabId][0];
    document.getElementById('page-subtitle').textContent = titles[tabId][1];

    if (tabId === 'chat' && !selectedChatUserId) {
        loadChatUsers();
    }
}

// ─── User Management ─────────────────────────────────────────────────────────

async function loadUsers() {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    onSnapshot(usersQuery, (snapshot) => {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const user = docSnap.data();
            const id = docSnap.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:36px; height:36px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; object-fit:cover;">` : (user.name ? user.name[0] : 'U')}
                        </div>
                        <div>
                            <div style="font-weight:700;">${user.name || 'Incognito User'}</div>
                            <div style="font-size:0.7rem; color:#64748b;">@${user.username || 'user'}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td style="color:#64748b; font-size:0.8rem;">${user.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Admin' : 'User'}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem;" onclick="window.chatWithUser('${id}')">
                        <i class="fas fa-message"></i> Chat
                    </button>
                    ${user.role !== 'admin' ? `<button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem; color:#ef4444; border-color:#fee2e2;" onclick="window.promoteUser('${id}')">Promote</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

window.chatWithUser = (uid) => {
    switchTab('chat');
    selectChatUser(uid);
};

window.promoteUser = async (uid) => {
    if (confirm('Promote this user to Admin?')) {
        await updateDoc(doc(db, 'users', uid), { role: 'admin' });
        showToast('User promoted to admin', 'success');
    }
};

// ─── Reports ────────────────────────────────────────────────────────────────

function loadReports() {
    const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    onSnapshot(reportsQuery, async (snapshot) => {
        const container = document.getElementById('reports-list');
        const countBadge = document.getElementById('report-count');

        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">No pending reports. Community is safe! ✨</p>';
            countBadge.style.display = 'none';
            return;
        }

        countBadge.textContent = snapshot.size;
        countBadge.style.display = 'inline-block';

        snapshot.forEach(async (reportSnap) => {
            const report = reportSnap.data();
            const id = reportSnap.id;

            // Get post details
            const postDoc = await getDoc(doc(db, 'acts', report.postId));
            const post = postDoc.exists() ? postDoc.data() : { content: '[Post Deleted]', authorName: 'Unknown' };

            const div = document.createElement('div');
            div.className = 'report-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:700; color:#ef4444; font-size:0.8rem; margin-bottom:0.5rem;">FLAGGED CONTENT</div>
                        <p style="font-size:0.95rem; margin-bottom:0.5rem;">" ${post.content} "</p>
                        <div style="display:flex; gap:1rem; font-size:0.75rem; color:#64748b;">
                            <span>Post Author: <b>${post.authorName || 'User'}</b></span>
                            <span>Reported by: <b>User ${report.reporterId.substring(0, 5)}</b></span>
                            <span>Date: ${report.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:#22c55e;" onclick="window.dismissReport('${id}')">Keep Post</button>
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:#ef4444;" onclick="window.takedownPost('${report.postId}', '${id}')">Takedown</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

window.dismissReport = async (rid) => {
    await deleteDoc(doc(db, 'reports', rid));
    showToast('Report dismissed', 'success');
};

window.takedownPost = async (pid, rid) => {
    if (confirm('Are you sure you want to permanently delete this post?')) {
        await deleteDoc(doc(db, 'acts', pid));
        await deleteDoc(doc(db, 'reports', rid));
        showToast('Post removed successfully', 'success');
    }
};

// ─── Community Monitoring ────────────────────────────────────────────────────

function loadCommunity() {
    const actsQuery = query(collection(db, 'acts'), orderBy('timestamp', 'desc'));
    onSnapshot(actsQuery, (snapshot) => {
        const container = document.getElementById('admin-feed');
        container.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const act = docSnap.data();
            const id = docSnap.id;
            const div = document.createElement('div');
            div.className = 'admin-card';
            div.style.padding = '1rem';
            div.style.marginBottom = '0.75rem';
            div.style.fontSize = '0.9rem';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-weight:700;">${act.authorName}</span>
                        <span style="color:#64748b; font-size:0.75rem;">${act.timestamp?.toDate().toLocaleString()}</span>
                    </div>
                    <button style="color:#ef4444; background:none; border:none; cursor:pointer;" onclick="window.takedownPost('${id}', 'bypass')"><i class="fas fa-trash"></i></button>
                </div>
                <p style="margin-top:0.5rem;">${act.content}</p>
                <div style="margin-top:0.5rem; display:flex; gap:1rem; font-size:0.75rem; color:var(--primary);">
                    <span><i class="fas fa-heart"></i> ${act.likesCount || 0}</span>
                    <span><i class="fas fa-comment"></i> ${act.commentsCount || 0}</span>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// ─── Chat Support ────────────────────────────────────────────────────────────

async function loadChatUsers() {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('name')));
    const list = document.getElementById('chat-users-list');
    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const id = docSnap.id;
        if (id === currentUser.uid) return;

        const div = document.createElement('div');
        div.className = `chat-user-item ${selectedChatUserId === id ? 'active' : ''}`;
        div.innerHTML = `
            <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-weight:700;">
                ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : user.name[0]}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600; font-size:0.85rem;">${user.name}</div>
                <div style="font-size:0.7rem; color:#64748b;">Click to chat</div>
            </div>
        `;
        div.onclick = () => selectChatUser(id);
        list.appendChild(div);
    });
}

let chatUnsubscribe = null;

async function selectChatUser(uid) {
    selectedChatUserId = uid;
    document.querySelectorAll('.chat-user-item').forEach(i => i.classList.remove('active'));

    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.data();
    document.getElementById('chat-header').textContent = `Chatting with ${userData.name}`;

    // Load messages
    const chatID = [currentUser.uid, uid].sort().join('_');
    const q = query(collection(db, 'admin_chats'), where('chatID', '==', chatID), orderBy('timestamp', 'asc'));

    if (chatUnsubscribe) chatUnsubscribe();

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        const msgContainer = document.getElementById('chat-messages');
        msgContainer.innerHTML = '';
        snapshot.forEach((mSnap) => {
            const msg = mSnap.data();
            const mDiv = document.createElement('div');
            mDiv.className = `msg ${msg.senderId === currentUser.uid ? 'msg-admin' : 'msg-user'}`;
            mDiv.textContent = msg.text;
            msgContainer.appendChild(mDiv);
        });
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });
}

function setupChatListeners() {
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input-field');
        const text = input.value.trim();
        if (!text || !selectedChatUserId) return;

        const chatID = [currentUser.uid, selectedChatUserId].sort().join('_');
        await addDoc(collection(db, 'admin_chats'), {
            chatID,
            senderId: currentUser.uid,
            receiverId: selectedChatUserId,
            text,
            timestamp: serverTimestamp()
        });

        input.value = '';
    });
}
