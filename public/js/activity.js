import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Common Utils
import {
    getCategoryColor,
    getCategoryEmoji,
    getCategoryIcon,
    escapeHtml,
    formatDate,
    showToast
} from './utils.js';

import { logout } from './auth.js';

const activityGrid = document.getElementById('activity-grid');
const filterCategory = document.getElementById('filter-category');
const activityCount = document.getElementById('activity-count');

let allActivities = [];

// ─── Lifecycle ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
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

    if (filterCategory) {
        filterCategory.addEventListener('change', () => {
            const val = filterCategory.value;
            const filtered = val === 'all'
                ? allActivities
                : allActivities.filter(a => a.category === val);
            renderActivities(filtered);
        });
    }
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

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
        console.error('[Load Error]', error);
        showToast('Gagal memuat data kebaikan.', 'error');
    }
}

async function deleteActivity(id) {
    try {
        await deleteDoc(doc(db, 'kindness', id));
        showToast('Act of kindness deleted.', 'success');
        // Update local list
        allActivities = allActivities.filter(a => a.id !== id);
        renderActivities(allActivities);
    } catch (error) {
        console.error('[Delete Error]', error);
        showToast('Gagal menghapus data.', 'error');
    }
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

function renderActivities(activities) {
    if (!activityGrid) return;
    activityGrid.innerHTML = '';

    if (activityCount) {
        activityCount.textContent = `${activities.length} act${activities.length !== 1 ? 's' : ''} found`;
    }

    if (activities.length === 0) {
        activityGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <h3>No activities found.</h3>
                <p>Every journey starts with a single step. Log your first act of kindness.</p>
                <a href="add-kindness.html" class="btn btn-primary" style="margin-top:1rem;">Log Your First Act</a>
            </div>
        `;
        return;
    }

    activities.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'activity-card animate-fade-up';

        const date = formatDate(activity.date || activity.timestamp);
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
                ${activity.photoUrl ? `<div style="margin-top: 1rem; border-radius: 12px; overflow: hidden; max-height: 200px;"><img src="${activity.photoUrl}" alt="Act of Kindness" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
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
