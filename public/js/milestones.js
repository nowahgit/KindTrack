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

        await loadMilestones(user);
    });
});

async function loadMilestones(user) {
    const container = document.getElementById('milestones-container');

    try {
        const kindnessRef = collection(db, 'kindness');
        const q = query(kindnessRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        let totalActs = snapshot.size;
        let points = 0;
        let photosUpload = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            points += (data.points || 0);
            if (data.photoUrl) photosUpload++;
        });

        // Define Milestones logic
        const badges = [
            {
                id: 'first_act',
                title: 'First Step',
                desc: 'Log your very first act of kindness.',
                icon: '<i class="fas fa-shoe-prints"></i>',
                req: 1,
                current: totalActs,
                type: 'standard'
            },
            {
                id: 'five_acts',
                title: 'Kindness Novice',
                desc: 'Complete 5 acts of kindness.',
                icon: '<i class="fas fa-hand-holding-heart"></i>',
                req: 5,
                current: totalActs,
                type: 'standard'
            },
            {
                id: 'pts_100',
                title: 'Century Impact',
                desc: 'Earn 100 kindness points.',
                icon: '<i class="fas fa-star"></i>',
                req: 100,
                current: points,
                type: 'gold' // Gold highlighting
            },
            {
                id: 'photo_proof',
                title: 'Social Proof',
                desc: 'Upload 1 photo as proof of your act.',
                icon: '<i class="fas fa-camera"></i>',
                req: 1,
                current: photosUpload,
                type: 'standard'
            },
            {
                id: 'fifty_acts',
                title: 'Heart of Gold',
                desc: 'Complete 50 acts of kindness.',
                icon: '<i class="fas fa-crown"></i>',
                req: 50,
                current: totalActs,
                type: 'gold'
            }
        ];

        container.innerHTML = '';

        badges.forEach(badge => {
            const unlocked = badge.current >= badge.req;
            const progressPct = Math.min(100, (badge.current / badge.req) * 100);

            const card = document.createElement('div');
            card.className = `milestone-card ${unlocked ? 'unlocked' : ''} ${badge.type}`;

            card.innerHTML = `
                <div class="milestone-icon">
                    ${badge.icon}
                </div>
                <div class="milestone-info">
                    <div class="milestone-title">${badge.title}</div>
                    <div class="milestone-desc">${badge.desc}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="progress-text">${Math.min(badge.current, badge.req)} / ${badge.req}</div>
                </div>
                <div class="locked-overlay">
                    <i class="fas fa-lock" style="font-size: 2rem; color: #475569;"></i>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Failed to load milestones:", error);
    }
}
