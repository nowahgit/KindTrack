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

        await loadAnalytics(user);
    });
});

async function loadAnalytics(user) {
    try {
        const kindnessRef = collection(db, 'kindness');
        const q = query(kindnessRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        const activities = [];
        snapshot.forEach(doc => activities.push(doc.data()));

        renderCategoryChart(activities);
        renderWeeklyChart(activities);

    } catch (error) {
        console.error("Failed to load analytics:", error);
    }
}

function renderCategoryChart(acts) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    // Default categories if empty
    const counts = {
        'Membantu Sesama': 0,
        'Sedekah': 0,
        'Dukungan': 0,
        'Relawan': 0,
        'Motivasi': 0
    };

    // Add real data
    acts.forEach(a => {
        if (a.category && counts[a.category] !== undefined) {
            counts[a.category]++;
        }
    });

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Membantu Sesama', 'Sedekah', 'Dukungan', 'Relawan', 'Motivasi'],
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    '#3B82F6', // Helping
                    '#F59E0B', // Charity
                    '#EC4899', // Support
                    '#8B5CF6', // Volunteer
                    '#10B981'  // Encourage
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { family: 'Mulish' } } }
            },
            cutout: '70%'
        }
    });
}

function renderWeeklyChart(acts) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat

    acts.forEach(a => {
        const d = a.date ? new Date(a.date) : (a.timestamp ? a.timestamp.toDate() : null);
        if (d) {
            dayCounts[d.getDay()]++;
        }
    });

    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
            datasets: [{
                label: 'Aksi Dicatat',
                data: dayCounts,
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}
