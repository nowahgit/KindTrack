import { auth } from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ─── Toast Notification ───────────────────────────────────────────────────────
function showToast(message, type = 'error') {
    // Remove existing toast
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

    // Inject animation if not exists
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

// ─── Friendly Error Messages ──────────────────────────────────────────────────
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Format email tidak valid. Periksa kembali alamat email kamu.',
        'auth/user-disabled': 'Akun ini telah dinonaktifkan. Hubungi support untuk bantuan.',
        'auth/user-not-found': 'Email tidak terdaftar. Coba daftar akun baru.',
        'auth/wrong-password': 'Password salah. Coba lagi atau gunakan lupa password.',
        'auth/invalid-credential': 'Email atau password tidak cocok. Periksa kembali.',
        'auth/email-already-in-use': 'Email ini sudah terdaftar. Coba sign in, atau gunakan email lain.',
        'auth/weak-password': 'Password terlalu lemah. Gunakan minimal 6 karakter.',
        'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.',
        'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa jaringan kamu.',
        'auth/popup-closed-by-user': 'Login dibatalkan. Coba lagi.',
        'auth/requires-recent-login': 'Sesi kamu sudah lama. Silakan login ulang.',
        'auth/missing-password': 'Password tidak boleh kosong.',
        'auth/missing-email': 'Email tidak boleh kosong.',
    };
    return messages[errorCode] || `Terjadi kesalahan (${errorCode}). Coba lagi.`;
}

// ─── Form Validation ──────────────────────────────────────────────────────────
function validateAuthForm(email, password, name, isRegister) {
    if (isRegister && (!name || name.trim().length < 2)) {
        return 'Nama harus diisi minimal 2 karakter.';
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
        return 'Masukkan alamat email yang valid.';
    }
    if (!password || password.length < 6) {
        return 'Password minimal 6 karakter.';
    }
    if (isRegister && password.length < 8) {
        return 'Untuk keamanan, gunakan password minimal 8 karakter.';
    }
    return null; // valid
}

// ─── Button Loading State ─────────────────────────────────────────────────────
function setButtonLoading(btn, loading, text = 'Sign In') {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? `<i class="fas fa-spinner fa-spin"></i> Loading...`
        : `<span>${text}</span>`;
}

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const authForm = document.getElementById('auth-form');
const authToggle = document.getElementById('auth-toggle');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const nameGroup = document.getElementById('name-group');
const submitText = document.getElementById('submit-text');
const toggleText = document.getElementById('toggle-text');
const nameInput = document.getElementById('auth-name');

let isLogin = true;

// ─── Toggle Login / Register ──────────────────────────────────────────────────
if (authToggle) {
    authToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;

        if (isLogin) {
            authTitle.innerText = 'Welcome Back';
            authSubtitle.innerText = 'Enter your details to sign in';
            nameGroup.style.display = 'none';
            nameInput.removeAttribute('required');
            submitText.innerText = 'Sign In';
            toggleText.innerText = "Don't have an account?";
            authToggle.innerText = 'Sign up';
        } else {
            authTitle.innerText = 'Create Account';
            authSubtitle.innerText = 'Join the kindness movement';
            nameGroup.style.display = 'block';
            nameInput.setAttribute('required', 'true');
            submitText.innerText = 'Create Account';
            toggleText.innerText = 'Already have an account?';
            authToggle.innerText = 'Sign in';
        }
    });
}

// ─── Form Submit ──────────────────────────────────────────────────────────────
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = nameInput ? nameInput.value.trim() : '';
        const submitBtn = authForm.querySelector('button[type="submit"]');

        // Client-side validation
        const validationError = validateAuthForm(email, password, name, !isLogin);
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }

        setButtonLoading(submitBtn, true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                showToast('Login berhasil! Mengalihkan...', 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                showToast('Akun berhasil dibuat! Selamat datang 🎉', 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            }
        } catch (error) {
            console.error('[Auth Error]', error.code, error.message);
            showToast(getAuthErrorMessage(error.code), 'error');
            setButtonLoading(submitBtn, false, isLogin ? 'Sign In' : 'Create Account');
        }
    });
}

// ─── Auth State Guard ─────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');
    const isInPages = path.includes('/pages/');

    if (user && isLoginPage) {
        window.location.href = 'dashboard.html';
    } else if (!user && isInPages && !isLoginPage) {
        window.location.href = 'login.html';
    }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async () => {
    try {
        await signOut(auth);
        window.location.href = '../index.html';
    } catch (error) {
        console.error('[Logout Error]', error.code, error.message);
    }
};
