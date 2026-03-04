import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        'profile.html': 'mnav-profile'
    };

    const activeId = navMapping[currentPage];
    if (activeId) {
        const activeNav = document.getElementById(activeId);
        if (activeNav) activeNav.classList.add('active');
    }
});

