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

import { getAIReflection, getDailyIdea } from './ai.js';

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const refreshAiBtn = document.getElementById('refresh-ai');
    if (refreshAiBtn) {
        refreshAiBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                refreshAiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
                const reflection = await getAIReflection(window.dashboardActivities || []);
                document.getElementById('ai-reflection-text').textContent = reflection;
                refreshAiBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Refresh';
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Header
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = user.displayName?.split(' ')[0] || 'there';

            // Sidebar user info
            const sidebarName = document.getElementById('sidebar-user-name');
            const sidebarAvatar = document.getElementById('sidebar-avatar');
            if (sidebarName) sidebarName.textContent = user.displayName || user.email;
            if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

            loadDashboardData(user.uid);

            const dailyIdea = await getDailyIdea();
            const ideaElement = document.getElementById('daily-idea-text');
            if (ideaElement) ideaElement.textContent = dailyIdea;
        } else {
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'login.html';
            }
        }
    });
});

async function loadDashboardData(userId) {
    try {
        const kindnessRef = collection(db, 'kindness');
        const q = query(
            kindnessRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const activities = [];
        querySnapshot.forEach((doc) => {
            activities.push({ id: doc.id, ...doc.data() });
        });

        window.dashboardActivities = activities;

        updateStats(activities);
        renderRecentActivities(activities.slice(0, 3));
        renderImpactChart(activities);
        renderHeatmap(activities);

        // Load AI Reflection
        const reflection = await getAIReflection(activities);
        const reflectionElement = document.getElementById('ai-reflection-text');
        if (reflectionElement) reflectionElement.textContent = reflection;

    } catch (error) {
        console.error('[Dashboard Error]', error.code, error.message);
        // Show user-friendly error in the stats area
        const errorMsg = error.code === 'permission-denied'
            ? 'Akses ditolak. Coba login ulang.'
            : error.code === 'unavailable'
                ? 'Koneksi ke server terputus. Periksa internet kamu.'
                : 'Gagal memuat data. Coba refresh halaman.';
        const statEl = document.getElementById('stat-total');
        if (statEl) statEl.closest('.stats-grid')?.insertAdjacentHTML(
            'beforebegin',
            `<div style="background:#fef2f2;color:#ef4444;padding:1rem 1.5rem;border-radius:12px;margin-bottom:1.5rem;font-size:0.9rem;">
                <i class="fas fa-exclamation-circle"></i> ${errorMsg}
            </div>`
        );
    }
}

function updateStats(activities) {
    const total = activities.length;
    document.getElementById('stat-total').textContent = total;

    // Simple impact calculation: each act impacts at least 1 person
    document.getElementById('stat-impact').textContent = total > 0 ? total + 5 : 0;

    // Kindness Score (0-100)
    const score = Math.min(100, Math.floor((total / 10) * 100)); // Just a mock formula
    document.getElementById('stat-score').textContent = score;

    // Streak (Mock for now)
    document.getElementById('stat-streak').textContent = total > 0 ? "3 days" : "0 days";
}

function renderRecentActivities(activities) {
    const container = document.getElementById('recent-activities');
    if (activities.length === 0) return;

    container.innerHTML = '';
    activities.forEach(activity => {
        const div = document.createElement('div');
        div.className = 'activity-item';

        const date = activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleDateString() : 'Just now';
        const icon = getCategoryIcon(activity.category);
        const color = getCategoryColor(activity.category);

        div.innerHTML = `
            <div class="activity-icon" style="background-color: ${color}20; color: ${color};">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-name">${activity.title}</div>
                <div class="activity-date">${date}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function getCategoryIcon(category) {
    switch (category) {
        case 'Helping Others': return 'fa-hands-helping';
        case 'Charity': return 'fa-hand-holding-heart';
        case 'Support': return 'fa-comment-alt';
        case 'Volunteering': return 'fa-user-friends';
        case 'Encouragement': return 'fa-smile';
        default: return 'fa-heart';
    }
}

function getCategoryColor(category) {
    switch (category) {
        case 'Helping Others': return '#22C55E';
        case 'Charity': return '#3B82F6';
        case 'Support': return '#F59E0B';
        case 'Volunteering': return '#8B5CF6';
        case 'Encouragement': return '#EC4899';
        default: return '#22C55E';
    }
}

function renderImpactChart(activities) {
    const ctx = document.getElementById('impactChart');
    if (!ctx) return;

    // Group activities by month (last 6 months)
    const now = new Date();
    const monthLabels = [];
    const monthData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push(d.toLocaleString('default', { month: 'short' }));
        const count = activities.filter(a => {
            const ts = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date);
            return ts.getMonth() === d.getMonth() && ts.getFullYear() === d.getFullYear();
        }).length;
        monthData.push(count);
    }

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Acts of Kindness',
                data: monthData,
                borderColor: '#22C55E',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22C55E',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderHeatmap(activities) {
    const container = document.getElementById('kindness-heatmap');
    if (!container) return;
    container.innerHTML = '';

    // Build a map of date -> count using real data
    const dateMap = {};
    activities.forEach(a => {
        const dateStr = a.date || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString().split('T')[0] : null);
        if (dateStr) {
            dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
        }
    });

    // Render last 90 days
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `${dateStr}: ${dateMap[dateStr] || 0} act(s)`;

        const count = dateMap[dateStr] || 0;
        if (count >= 4) cell.classList.add('level-4');
        else if (count === 3) cell.classList.add('level-3');
        else if (count === 2) cell.classList.add('level-2');
        else if (count === 1) cell.classList.add('level-1');

        container.appendChild(cell);
    }
}

