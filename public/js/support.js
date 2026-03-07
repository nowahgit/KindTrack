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
        where('chatID', '>=', ''), // Dummy to allow complex filter if needed, but we'll filter in JS if necessary
        orderBy('timestamp', 'asc')
    );

    // Filter messages for this user in memory for simplicity or use composite index
    onSnapshot(q, (snapshot) => {
        const msgContainer = document.getElementById('chat-messages');
        const initialMsg = `<div class="msg msg-admin">Hello! How can we help you today? Feel free to ask anything about KindTrack.</div>`;
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
    const text = input.value.trim();
    if (!text) return;

    // For simplicity, we send to a conceptual 'admin' 
    // The admin will see it in the list because their UID will be part of the chatID logic in admin.js
    // Let's use a fixed ID for the "Main Admin" if we had one, 
    // but here we'll just tag it so admins can find it.

    await addDoc(collection(db, 'admin_chats'), {
        chatID: `admin_${currentUser.uid}`, // Simplified chatID for users -> any admin
        senderId: currentUser.uid,
        receiverId: 'admin', // Flag for any admin to pick up
        text,
        timestamp: serverTimestamp()
    });

    input.value = '';
});
