import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const activityGrid = document.getElementById('activity-grid');
const filterCategory = document.getElementById('filter-category');
const activityCount = document.getElementById('activity-count');

let allActivities = [];

import { logout } from './auth.js';
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Sidebar user info
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        if (sidebarName) sidebarName.textContent = user.displayName || user.email;
        if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

        await loadActivities(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

async function loadActivities(userId) {
    try {
        const kindnessRef = collection(db, 'kindness');
        const q = query(
            kindnessRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);

        allActivities = [];
        querySnapshot.forEach((doc) => {
            allActivities.push({ id: doc.id, ...doc.data() });
        });

        renderActivities(allActivities);
    } catch (error) {
        console.error("Error loading activities:", error);
        activityGrid.innerHTML = '<p class="text-center py-8">Error loading activities. Please refresh.</p>';
    }
}

function renderActivities(activities) {
    activityGrid.innerHTML = '';

    if (activityCount) {
        activityCount.textContent = `${activities.length} act${activities.length !== 1 ? 's' : ''} found`;
    }

    if (activities.length === 0) {
        activityGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <h3>No activities here yet.</h3>
                <p>Every journey starts with a single step. Log your first act of kindness.</p>
                <a href="add-kindness.html" class="btn btn-primary">Log Your First Act</a>
            </div>
        `;
        return;
    }

    activities.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'activity-card animate-fade-up';

        const date = activity.date
            || (activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently');
        const icon = getCategoryIcon(activity.category);
        const color = getCategoryColor(activity.category);
        const emoji = getCategoryEmoji(activity.category);

        card.innerHTML = `
            <div class="activity-card-header">
                <div class="activity-icon" style="background-color:${color}18;color:${color};font-size:1.25rem;width:44px;height:44px;">
                    ${emoji}
                </div>
                <span style="font-size:0.75rem;color:var(--text-muted);">${date}</span>
            </div>
            <div class="activity-card-body">
                <h3>${escapeHtml(activity.title)}</h3>
                <p>${activity.description ? escapeHtml(activity.description) : '<em style="opacity:0.5;">No description.</em>'}</p>
            </div>
            <div class="activity-card-footer">
                <span class="badge" style="background:${color}18;color:${color};">${emoji} ${activity.category}</span>
                <button class="delete-btn" data-id="${activity.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        activityGrid.appendChild(card);
    });

    // Delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Delete this act of kindness?')) {
                await deleteActivity(id);
            }
        });
    });
}

async function deleteActivity(id) {
    try {
        await deleteDoc(doc(db, 'kindness', id));
        // Refresh
        allActivities = allActivities.filter(a => a.id !== id);
        renderActivities(allActivities);
    } catch (error) {
        console.error("Error deleting activity:", error);
    }
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

function getCategoryEmoji(category) {
    switch (category) {
        case 'Helping Others': return '🤝';
        case 'Charity': return '🎁';
        case 'Support': return '💬';
        case 'Volunteering': return '🙋';
        case 'Encouragement': return '⭐';
        default: return '💚';
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

if (filterCategory) {
    filterCategory.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'all') {
            renderActivities(allActivities);
        } else {
            const filtered = allActivities.filter(a => a.category === value);
            renderActivities(filtered);
        }
    });
}
