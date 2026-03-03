import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── Toast Notification ───────────────────────────────────────────────────────
function showToast(message, type = 'error') {
    const existing = document.getElementById('kt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'kt-toast';
    const bg = type === 'success' ? '#22C55E' : type === 'info' ? '#3B82F6' : '#ef4444';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle';

    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        background: ${bg}; color: white; padding: 1rem 1.5rem;
        border-radius: 12px; font-family: var(--font-body, Inter, sans-serif);
        font-size: 0.9rem; font-weight: 500; display: flex; align-items: center;
        gap: 0.75rem; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease; max-width: 380px;
    `;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Form Validation ──────────────────────────────────────────────────────────
function validateKindnessForm(title, category, description) {
    if (!title || title.trim().length < 3) {
        return 'Judul kebaikan minimal 3 karakter.';
    }
    if (!category) {
        return 'Pilih kategori terlebih dahulu.';
    }
    if (description && description.trim().length > 500) {
        return 'Deskripsi maksimal 500 karakter.';
    }
    return null; // valid
}

// ─── Auth Guard & Form ────────────────────────────────────────────────────────
import { logout } from './auth.js';
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Sidebar user info
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarName) sidebarName.textContent = user.displayName || user.email;
    if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
});

const kindnessForm = document.getElementById('add-kindness-form');

if (kindnessForm) {
    // Set default date to today
    const dateInput = document.getElementById('kindness-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today; // Can't log future kindness
    }

    // Character counter for description
    const descInput = document.getElementById('kindness-desc');
    const descCounter = document.getElementById('desc-counter');
    if (descInput && descCounter) {
        descInput.addEventListener('input', () => {
            const len = descInput.value.length;
            descCounter.textContent = `${len}/500`;
            descCounter.style.color = len > 450 ? '#ef4444' : 'var(--text-muted)';
        });
    }

    kindnessForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            showToast('Kamu harus login terlebih dahulu.', 'error');
            window.location.href = 'login.html';
            return;
        }

        const title = document.getElementById('kindness-title').value.trim();
        const radioCategory = document.querySelector('input[name="category"]:checked');
        const category = radioCategory
            ? radioCategory.value
            : (document.getElementById('kindness-category')?.value || '');
        const description = document.getElementById('kindness-desc').value.trim();
        const date = document.getElementById('kindness-date').value;

        // Client-side validation
        const validationError = validateKindnessForm(title, category, description);
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }

        const submitBtn = kindnessForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            await addDoc(collection(db, 'kindness'), {
                userId: user.uid,
                title,
                category,
                description,
                date,
                timestamp: serverTimestamp()
            });

            showToast('Kebaikan berhasil dicatat! ✨', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);

        } catch (error) {
            console.error('[Firestore Error]', error.code, error.message);

            let msg = 'Gagal menyimpan. Coba lagi.';
            if (error.code === 'permission-denied') {
                msg = 'Akses ditolak. Pastikan kamu sudah login.';
            } else if (error.code === 'unavailable') {
                msg = 'Koneksi ke server gagal. Periksa internet kamu.';
            }
            showToast(msg, 'error');

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Activity';
        }
    });
}
