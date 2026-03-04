import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
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
        // Fetch current user acts to calculate their true score
        const kindnessRef = collection(db, 'kindness');
        const q = query(kindnessRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        let userScore = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            userScore += (data.points || 0);
        });

        // Generate leaderboard data - currently just the logged in user
        const currentUserName = currentUser.displayName || currentUser.email.split('@')[0] || "You";
        const currentUserEntry = {
            name: currentUserName,
            score: userScore,
            id: currentUser.uid,
            isCurrentUser: true
        };

        const leaderboardData = [currentUserEntry].sort((a, b) => b.score - a.score);

        const listContainer = document.getElementById('leaderboard-list');
        listContainer.innerHTML = '';

        leaderboardData.forEach((player, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const highlightClass = player.isCurrentUser ? 'highlight' : '';

            const item = document.createElement('div');
            item.className = `leaderboard-item ${rankClass} ${highlightClass}`;

            // Generate icon
            let iconText = `#${rank}`;
            if (rank === 1) iconText = '<i class="fas fa-crown"></i>';
            else if (rank === 2) iconText = '<i class="fas fa-medal"></i>';
            else if (rank === 3) iconText = '<i class="fas fa-award"></i>';

            item.innerHTML = `
                <div class="rank-number">${iconText}</div>
                <div class="leader-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="leader-info">
                    <div class="leader-name">${player.name}</div>
                    <div class="leader-score-wrapper">
                        <i class="fas fa-star" style="color:var(--accent);"></i>
                        <span class="leader-score">${player.score}</span> pts
                    </div>
                </div>
            `;

            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading leaderboard:", error);
        document.getElementById('leaderboard-list').innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                Failed to load leaderboard. Please try again later.
            </div>
        `;
    }
}
