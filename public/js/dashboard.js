import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Common Utils
import {
    getCategoryColor,
    getCategoryEmoji,
    getCategoryIcon,
    formatDate,
    showToast
} from './utils.js';

import { getAIReflection, getDailyIdea } from './ai.js';
import { logout } from './auth.js';

// ─── Lifecycle ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Logout listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // AI Refresh
    const refreshAiBtn = document.getElementById('refresh-ai');
    if (refreshAiBtn) {
        refreshAiBtn.addEventListener('click', async () => {
            if (window.dashboardActivities) {
                refreshAiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
                const reflection = await getAIReflection(window.dashboardActivities);
                document.getElementById('ai-reflection-text').textContent = reflection;
                refreshAiBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Refresh';
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Header & Sidebar Info
            const userNameEl = document.getElementById('user-name');
            const sidebarName = document.getElementById('sidebar-user-name');
            const sidebarAvatar = document.getElementById('sidebar-avatar');

            if (userNameEl) userNameEl.textContent = user.displayName?.split(' ')[0] || 'there';
            if (sidebarName) sidebarName.textContent = user.displayName || user.email;
            if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

            // Load Data
            loadDashboardData(user.uid);

            // Fetch daily idea
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

// ─── Data Loading ─────────────────────────────────────────────────────────────

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
        const errorMsg = error.code === 'permission-denied'
            ? 'Access denied. Please login again.'
            : 'Failed to load data. Please refresh the page.';

        const statEl = document.getElementById('stat-total');
        if (statEl) {
            const container = statEl.closest('.stats-grid');
            if (container) {
                container.insertAdjacentHTML('beforebegin', `
                    <div style="background:#fef2f2;color:#ef4444;padding:1rem 1.5rem;border-radius:12px;margin-bottom:1.5rem;font-size:0.9rem;">
                        <i class="fas fa-exclamation-circle"></i> ${errorMsg}
                    </div>
                `);
            }
        }
    }
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

function updateStats(activities) {
    const total = activities.length;
    document.getElementById('stat-total').textContent = total;

    // Simple impact calculation mock
    const totalEstimatedImpact = total * 3;
    document.getElementById('stat-impact').textContent = total > 0 ? totalEstimatedImpact : 0;

    // Kindness Score (Sum of points earned)
    const score = activities.reduce((acc, a) => acc + (a.points || 0), 0);
    document.getElementById('stat-score').textContent = score || 0;

    // Streak logic (Mock for now, or use real date logic)
    document.getElementById('stat-streak').textContent = total > 0 ? `${total % 10 + 1} days` : '0 days';
}

function renderRecentActivities(activities) {
    const container = document.getElementById('recent-activities');
    if (!container) return;

    if (activities.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:1.5rem 0;">No activities yet. Start spreading kindness!</p>';
        return;
    }

    container.innerHTML = '';
    activities.forEach(activity => {
        const div = document.createElement('div');
        div.className = 'activity-item';

        const date = formatDate(activity.date || activity.timestamp);
        const color = getCategoryColor(activity.category);
        const emoji = getCategoryEmoji(activity.category);

        div.innerHTML = `
            <div class="activity-icon" style="background-color: ${color}18; color: ${color}; font-size:1.1rem;">
                ${emoji}
            </div>
            <div class="activity-details" style="flex: 1;">
                <div class="activity-name">${activity.title}</div>
                <div class="activity-date">${date}</div>
            </div>
            ${activity.photoUrl ? `<img src="${activity.photoUrl}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-light);" alt="photo">` : ''}
        `;
        container.appendChild(div);
    });
}

function renderImpactChart(activities) {
    const ctx = document.getElementById('impactChart');
    if (!ctx) return;

    // Group by month
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

    // Destroy existing chart if any (to prevent multiple instances on refresh)
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Acts Logged',
                data: monthData,
                borderColor: '#22C55E',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22C55E',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 10 }
                    },
                    grid: { color: 'rgba(0,0,0,0.03)' }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 10 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderHeatmap(activities) {
    const container = document.getElementById('kindness-heatmap');
    if (!container) return;
    container.innerHTML = '';

    const dateMap = {};
    activities.forEach(a => {
        const dateStr = a.date || (a.timestamp?.toDate ? a.timestamp.toDate().toISOString().split('T')[0] : null);
        if (dateStr) dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });

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
