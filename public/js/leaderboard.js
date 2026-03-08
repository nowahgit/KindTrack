import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (sidebarName) sidebarName.textContent = user.displayName || user.email;
        if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

        await loadLeaderboard(user);
    });
});

async function loadLeaderboard(currentUser) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('totalPoints', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);

        let leaderboardData = [];
        let currentUserFound = false;

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const isMe = id === currentUser.uid;
            if (isMe) currentUserFound = true;

            leaderboardData.push({
                name: data.name || data.username || "Kind Stranger",
                score: data.totalPoints || 0,
                id: id,
                isCurrentUser: isMe
            });
        });

        // Ensure current user is shown if not in top 50
        if (!currentUserFound) {
            const myRef = query(usersRef, where('id', '==', currentUser.uid)); // uid search
            // Actually querying by doc ID is better: doc(db, 'users', uid)
            const myDoc = await getDocs(query(usersRef, where('__name__', '==', currentUser.uid)));
            if (!myDoc.empty) {
                const d = myDoc.docs[0].data();
                leaderboardData.push({
                    name: d.name || "Anda",
                    score: d.totalPoints || 0,
                    id: currentUser.uid,
                    isCurrentUser: true,
                    rank: "Belum Teranking"
                });
            }
        }

        const listContainer = document.getElementById('leaderboard-list');
        listContainer.innerHTML = '';

        leaderboardData.forEach((player, index) => {
            const isMe = player.isCurrentUser;
            const rank = player.rank || (index + 1);
            const rankClass = (typeof rank === 'number' && rank <= 3) ? `rank-${rank}` : '';
            const highlightClass = isMe ? 'highlight' : '';

            const item = document.createElement('div');
            item.className = `leaderboard-item ${rankClass} ${highlightClass}`;

            let iconText = (typeof rank === 'number') ? `#${rank}` : rank;
            if (rank === 1) iconText = '<i class="fas fa-crown"></i>';
            else if (rank === 2) iconText = '<i class="fas fa-medal"></i>';
            else if (rank === 3) iconText = '<i class="fas fa-award"></i>';

            item.innerHTML = `
                <div class="rank-number">${iconText}</div>
                <div class="leader-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="leader-info">
                    <div class="leader-name">${player.name} ${isMe ? '<small>(Anda)</small>' : ''}</div>
                    <div class="leader-score-wrapper">
                        <i class="fas fa-star" style="color:var(--accent);"></i>
                        <span class="leader-score">${player.score}</span> poin
                    </div>
                </div>
            `;
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading leaderboard:", error);
        document.getElementById('leaderboard-list').innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                Gagal memuat papan peringkat. Silakan coba lagi nanti.
            </div>
        `;
    }
}
