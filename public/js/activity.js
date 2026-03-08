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
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        let activities = [];
        querySnapshot.forEach((doc) => {
            activities.push({ id: doc.id, ...doc.data() });
        });

        // Sort in-memory to avoid composite index requirements
        activities.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.date).getTime();
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.date).getTime();
            return timeB - timeA;
        });

        allActivities = activities;
        renderActivities(allActivities);
    } catch (error) {
        console.error('[Load Error]', error);
        showToast('Gagal memuat data kebaikan.', 'error');
    }
}

async function deleteActivity(id) {
    try {
        // 1. Cascading cleanup of likes
        const likesQ = query(collection(db, 'likes'), where('postId', '==', id));
        const likesSnap = await getDocs(likesQ);
        likesSnap.forEach(l => deleteDoc(doc(db, 'likes', l.id)));

        // 2. Cascading cleanup of comments
        const commentsQ = query(collection(db, 'comments'), where('postId', '==', id));
        const commentsSnap = await getDocs(commentsQ);
        commentsSnap.forEach(c => deleteDoc(doc(db, 'comments', c.id)));

        // 3. Delete actual activity doc
        await deleteDoc(doc(db, 'kindness', id));

        showToast('Aksi kebaikan dan interaksi terkait berhasil dihapus.', 'success');

        // Update local list
        allActivities = allActivities.filter(a => a.id !== id);
        renderActivities(allActivities);
    } catch (error) {
        console.error('[Delete Error]', error);
        showToast('Gagal menghapus aktivitas. Silakan coba lagi.', 'error');
    }
}

// ─── UI Rendering ─────────────────────────────────────────────────────────────

function renderActivities(activities) {
    if (!activityGrid) return;
    activityGrid.innerHTML = '';

    if (activityCount) {
        activityCount.textContent = `${activities.length} aksi ditemukan`;
    }

    if (activities.length === 0) {
        activityGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-seedling"></i></div>
                <h3>Belum ada aktivitas.</h3>
                <p>Setiap perjalanan dimulai dengan satu langkah. Catat aksi kebaikan pertama Anda.</p>
                <a href="add-kindness.html" class="btn btn-primary" style="margin-top:1rem;">Catat Aksi Pertama</a>
            </div>
        `;
        return;
    }

    activities.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'activity-card animate-fade-up';

        const date = formatDate(activity.date || activity.timestamp);
        const color = getCategoryColor(activity.category);
        const icon = getCategoryIcon(activity.category);

        card.innerHTML = `
            <div class="activity-card-header">
                <div class="activity-icon" style="background-color:${color}18;color:${color};font-size:1.25rem;width:44px;height:44px;">
                    <i class="fas ${icon}"></i>
                </div>
                <span style="font-size:0.75rem;color:var(--text-muted);">${date}</span>
            </div>
            <div class="activity-card-body">
                <h3>${escapeHtml(activity.title)}</h3>
                <p>${activity.description ? escapeHtml(activity.description) : '<em style="opacity:0.5;">Tanpa deskripsi.</em>'}</p>
                ${activity.photoUrl ? `<div style="margin-top: 1rem; border-radius: 12px; overflow: hidden; max-height: 200px;"><img src="${activity.photoUrl}" alt="Act of Kindness" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
            </div>
            <div class="activity-card-footer">
                <span class="badge" style="background:${color}18;color:${color};"><i class="fas ${icon}" style="margin-right:3px;"></i> ${activity.category}</span>
                <button class="delete-btn" data-id="${activity.id}" title="Hapus">
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
            if (confirm('Hapus aksi kebaikan ini?')) {
                await deleteActivity(id);
            }
        });
    });
}
