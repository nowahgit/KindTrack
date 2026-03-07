import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                const defaultName = data.name || user.displayName || user.email.split('@')[0];

                // Sidebar Name Update
                const sidebarNameArr = document.querySelectorAll('#sidebar-user-name');
                sidebarNameArr.forEach(el => el.textContent = defaultName);

                // Dashboard Header Name Update
                const headerName = document.getElementById('user-name');
                if (headerName) headerName.textContent = defaultName.split(' ')[0];

                // Sidebar Avatar Update
                const sidebarAvatarArr = document.querySelectorAll('#sidebar-avatar');
                if (data.avatarUrl) {
                    sidebarAvatarArr.forEach(el => {
                        el.innerHTML = `<img src="${data.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                        el.style.background = 'transparent';
                        el.style.color = 'transparent'; // hiding 'U' if glitch
                    });
                }

                // Admin Dashboard Link Injection
                if (data.role === 'admin') {
                    const sidebarNav = document.querySelector('.sidebar-nav');
                    const adminLinkExists = document.getElementById('sidebar-admin-link');

                    if (sidebarNav && !adminLinkExists) {
                        const adminDivider = document.createElement('p');
                        adminDivider.className = 'sidebar-section-label';
                        adminDivider.style.marginTop = '1.5rem';
                        adminDivider.textContent = 'Administration';

                        const adminLink = document.createElement('a');
                        adminLink.href = 'admin.html';
                        adminLink.className = 'sidebar-item';
                        adminLink.id = 'sidebar-admin-link';
                        adminLink.style.color = '#ef4444';
                        adminLink.innerHTML = '<i class="fas fa-hammer"></i> Admin Panel';

                        sidebarNav.appendChild(adminDivider);
                        sidebarNav.appendChild(adminLink);
                    }
                }

                // Support Link for all users
                const sidebarNav = document.querySelector('.sidebar-nav');
                const supportLinkExists = document.getElementById('sidebar-support-link');
                if (sidebarNav && !supportLinkExists) {
                    const supportLink = document.createElement('a');
                    supportLink.href = 'support.html';
                    supportLink.className = 'sidebar-item';
                    supportLink.id = 'sidebar-support-link';
                    supportLink.innerHTML = '<i class="fas fa-comments"></i> Messages';
                    sidebarNav.appendChild(supportLink);
                }

                // Global Chat Notification Listener
                let initialChatLoad = true;
                const chatQ = query(
                    collection(db, 'chats'),
                    where('receiverId', '==', user.uid),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                );

                onSnapshot(chatQ, (snapshot) => {
                    if (initialChatLoad) {
                        initialChatLoad = false;
                        return;
                    }
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const msg = change.doc.data();

                            // Check if actively chatting in chat.js or admin.js
                            if (window.activeChatUserId === msg.senderId) return;

                            // get sender name
                            let senderName = 'Someone';
                            try {
                                const sDoc = await getDoc(doc(db, 'users', msg.senderId));
                                if (sDoc.exists()) senderName = sDoc.data().name || sDoc.data().username || 'A user';
                            } catch (e) { }

                            showToast(`New message from ${senderName}`, 'info');

                            const supportLink = document.getElementById('sidebar-support-link');
                            if (supportLink && !supportLink.querySelector('.chat-badge')) {
                                supportLink.innerHTML += ' <span class="chat-badge" style="background:var(--primary); color:white; padding:2px 6px; border-radius:10px; font-size:0.7rem; margin-left:5px;">New</span>';
                            }

                            const mobileSupportLink = document.getElementById('mnav-messages');
                            if (mobileSupportLink && !mobileSupportLink.querySelector('.chat-badge')) {
                                mobileSupportLink.style.position = 'relative';
                                mobileSupportLink.innerHTML += ' <span class="chat-badge" style="position:absolute; top:0; right:10%; background:var(--primary); color:white; padding:1px 4px; border-radius:10px; font-size:0.6rem;">New</span>';
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Failed to load global profile:", error);
        }
    }
});

// Mobile Nav Active State
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    const navMapping = {
        'dashboard.html': 'mnav-dashboard',
        'activity.html': 'mnav-activity',
        'add-kindness.html': 'mnav-add',
        'community.html': 'mnav-community',
        'support.html': 'mnav-messages',
        'profile.html': 'mnav-profile'
    };

    const activeId = navMapping[currentPage];
    if (activeId) {
        const activeNav = document.getElementById(activeId);
        if (activeNav) activeNav.classList.add('active');
    }
});

