import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    addDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
const adminId = 'HScR2Y9xI0P5iJv5jX8v5n5'; // Placeholder or any admin ID

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    loadMessages();
});

function loadMessages() {
    // We'll simplify: Find any chat where this user is sender or receiver
    // But since it's 1-on-1 with "admin", we use the same chatID logic as admin.js
    // Note: Better to fetch admin list or just use a shared 'support' tag.
    // For now, let's look for chats with any admin (where user is part of chatID)

    // In our admin.js, we used chatID = [admin.uid, user.uid].sort().join('_')
    // Since we don't know the adminId here easily without fetching, 
    // we'll filter by receiverId == user.uid OR senderId == user.uid

    const q = query(
        collection(db, 'admin_chats'),
        where('chatID', '==', `admin_${currentUser.uid}`),
        orderBy('timestamp', 'asc')
    );

    onSnapshot(q, (snapshot) => {
        const msgContainer = document.getElementById('chat-messages');
        const initialMsg = `<div class="msg msg-admin">Halo! Ada yang bisa kami bantu hari ini? Jangan ragu untuk bertanya apa pun tentang KindTrack.</div>`;
        msgContainer.innerHTML = initialMsg;

        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            // Show only if this user is involved
            if (msg.senderId === currentUser.uid || msg.receiverId === currentUser.uid) {
                const mDiv = document.createElement('div');
                mDiv.className = `msg ${msg.senderId === currentUser.uid ? 'msg-user' : 'msg-admin'}`;
                mDiv.textContent = msg.text;
                msgContainer.appendChild(mDiv);
            }
        });
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const submitBtn = e.target.querySelector('button');
    const text = input.value.trim();

    if (!text || submitBtn.disabled) return;
    if (text.length > 500) {
        alert("Pesan terlalu panjang (maksimal 500 karakter)");
        return;
    }

    try {
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await addDoc(collection(db, 'admin_chats'), {
            chatID: `admin_${currentUser.uid}`,
            senderId: currentUser.uid,
            receiverId: 'admin',
            text,
            timestamp: serverTimestamp()
        });

        input.value = '';
    } catch (err) {
        console.error("Gagal mengirim:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
});
