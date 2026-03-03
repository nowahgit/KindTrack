import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Common Utils
import { showToast } from './utils.js';
import { logout } from './auth.js';

// ─── Lifecycle & Auth ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Logout listener
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

    // Default date to today
    const dateInput = document.getElementById('kindness-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Character counter
    const descInput = document.getElementById('kindness-desc');
    const descCounter = document.getElementById('desc-counter');
    if (descInput && descCounter) {
        descInput.addEventListener('input', () => {
            const len = descInput.value.length;
            descCounter.textContent = `${len}/500`;
            descCounter.style.color = len > 450 ? '#ef4444' : 'var(--text-muted)';
        });
    }

    // Form Submit
    const kindnessForm = document.getElementById('add-kindness-form');
    if (kindnessForm) {
        kindnessForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                showToast('Please sign in first.', 'error');
                window.location.href = 'login.html';
                return;
            }

            const title = document.getElementById('kindness-title').value.trim();
            const radioCategory = document.querySelector('input[name="category"]:checked');
            const category = radioCategory ? radioCategory.value : '';
            const description = document.getElementById('kindness-desc').value.trim();
            const date = document.getElementById('kindness-date').value;

            // Simple Validation
            if (!title) {
                showToast('Please enter what you did.', 'error');
                return;
            }
            if (!category) {
                showToast('Please select a category.', 'error');
                return;
            }

            const submitBtn = document.getElementById('submit-btn');
            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                await addDoc(collection(db, 'kindness'), {
                    userId: user.uid,
                    title,
                    category,
                    description,
                    date,
                    timestamp: serverTimestamp()
                });

                showToast('Act of kindness logged! Keep it up.', 'success');
                kindnessForm.reset();

                // Reset counter & date
                if (descCounter) descCounter.textContent = '0/500';
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } catch (error) {
                console.error('[Save Error]', error);
                showToast('Gagal menyimpan data kebaikan.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});
