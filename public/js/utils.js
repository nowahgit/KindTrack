/**
 * KindTrack Shared Utilities
 * Production-ready modular helpers
 */

// ─── Category Helpers ─────────────────────────────────────────────────────────

export function getCategoryEmoji(category) {
    switch (category) {
        case 'Helping Others': return '🤝';
        case 'Charity': return '🎁';
        case 'Support': return '💬';
        case 'Volunteering': return '🙋';
        case 'Encouragement': return '⭐';
        default: return '💚';
    }
}

export function getCategoryColor(category) {
    switch (category) {
        case 'Helping Others': return '#22C55E';
        case 'Charity': return '#3B82F6';
        case 'Support': return '#F59E0B';
        case 'Volunteering': return '#8B5CF6';
        case 'Encouragement': return '#EC4899';
        default: return '#22C55E';
    }
}

export function getCategoryIcon(category) {
    switch (category) {
        case 'Helping Others': return 'fa-hands-helping';
        case 'Charity': return 'fa-hand-holding-heart';
        case 'Support': return 'fa-comment-alt';
        case 'Volunteering': return 'fa-user-friends';
        case 'Encouragement': return 'fa-smile';
        default: return 'fa-heart';
    }
}

// ─── String & Security ────────────────────────────────────────────────────────

export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

export function showToast(message, type = 'error') {
    // Remove existing
    const existing = document.getElementById('kt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'kt-toast';
    toast.className = `success ${type}`; // Add type as class (success, error, info)

    // Fallback inline styles if CSS hasn't loaded variants yet
    const bg = type === 'success' ? '#22C55E' : type === 'info' ? '#3B82F6' : '#ef4444';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle';

    // Premium styling (matches style.css but with dynamic colors for safety)
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        background: ${bg}; color: white; padding: 1rem 1.5rem;
        border-radius: 12px; font-family: sans-serif;
        font-size: 0.9rem; font-weight: 500; display: flex; align-items: center;
        gap: 0.75rem; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: 380px; border: 1px solid rgba(255,255,255,0.1);
    `;

    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    // Inject animation if needed
    if (!document.getElementById('toast-keyframe-util')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframe-util';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ─── Tailwind-style Alerts (Form level) ───────────────────────────────────────

export function showAlert(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing
    const existing = container.querySelector('.alert');
    if (existing) existing.remove();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';

    alert.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    // Insert at the beginning of container
    container.prepend(alert);

    // Auto remove after 5s if success
    if (type === 'success') {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
}

// ─── Custom Modern Confirm Modal ──────────────────────────────────────────────

export function showConfirmModal({ title, message, confirmText, cancelText, onConfirm, type = 'danger' }) {
    // Remove existing if any
    const existing = document.getElementById('kt-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kt-modal-overlay';
    overlay.className = 'modal-overlay';

    const iconClass = type === 'warning' ? 'icon-warning' : '';
    const iconI = type === 'warning' ? 'fa-exclamation-triangle' : 'fa-sign-out-alt';

    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-icon ${iconClass}">
                    <i class="fas ${iconI}"></i>
                </div>
                <div class="modal-title">${title || 'Are you sure?'}</div>
            </div>
            <div class="modal-body">
                ${message}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="modal-cancel-btn">${cancelText || 'Cancel'}</button>
                <button class="btn ${type === 'danger' ? 'btn-primary' : 'btn-primary'}" id="modal-confirm-btn" style="${type === 'danger' ? 'background:#ef4444; border-color:#ef4444;' : ''}">
                    ${confirmText || 'Confirm'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => overlay.classList.add('active'), 10);

    const close = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#modal-cancel-btn').onclick = close;
    overlay.querySelector('#modal-confirm-btn').onclick = () => {
        if (onConfirm) onConfirm();
        close();
    };

    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatDate(val) {
    if (!val) return 'Recently';
    let date;
    if (typeof val === 'string') date = new Date(val);
    else if (val.toDate) date = val.toDate(); // Firebase Timestamp
    else date = new Date(val);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
