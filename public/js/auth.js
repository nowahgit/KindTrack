import { auth } from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from './firebase-init.js';
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { showToast, showConfirmModal, showAlert } from './utils.js';

// ─── Friendly Error Messages ──────────────────────────────────────────────────

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Format email tidak valid. Silakan periksa kembali.',
        'auth/user-disabled': 'Akun ini telah dinonaktifkan. Hubungi dukungan.',
        'auth/user-not-found': 'Email tidak ditemukan. Silakan daftar terlebih dahulu.',
        'auth/wrong-password': 'Kata sandi salah. Silakan coba lagi.',
        'auth/invalid-credential': 'Email atau kata sandi tidak cocok. Periksa kembali.',
        'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
        'auth/weak-password': 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
        'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi nanti.',
        'auth/network-request-failed': 'Kesalahan jaringan. Periksa koneksi internet Anda.',
        'auth/popup-closed-by-user': 'Login dibatalkan. Coba lagi.',
        'auth/requires-recent-login': 'Sesi Anda telah berakhir. Silakan login kembali.',
        'auth/missing-password': 'Kata sandi tidak boleh kosong.',
        'auth/missing-email': 'Email tidak boleh kosong.',
    };
    return messages[errorCode] || `Terjadi kesalahan tak terduga (${errorCode}).`;
}

// ─── Form Validation ──────────────────────────────────────────────────────────

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('is-invalid');
    const feedback = field.closest('.form-group')?.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.style.display = 'block';
    }
}

function clearFormErrors(form) {
    form.classList.remove('was-validated');
    form.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(el => {
        el.style.display = 'none';
    });
}

function validateAuthForm(email, password, name, isRegisterMode) {
    let isValid = true;
    const form = document.getElementById('auth-form');
    clearFormErrors(form);

    if (isRegisterMode) {
        if (!name || name.trim().length < 2) {
            showFieldError('auth-name', 'Nama lengkap minimal 2 karakter.');
            isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(name)) {
            showFieldError('auth-name', 'Nama hanya boleh berisi huruf dan spasi.');
            isValid = false;
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFieldError('auth-email', 'Harap masukkan alamat email yang valid.');
        isValid = false;
    }

    if (!isRegisterMode && (!password || password.length < 6)) {
        showFieldError('auth-password', 'Kata sandi minimal 6 karakter.');
        isValid = false;
    }

    if (isRegisterMode) {
        if (!password || password.length < 8) {
            showFieldError('auth-password', 'Gunakan minimal 8 karakter.');
            isValid = false;
        } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            showFieldError('auth-password', 'Sertakan huruf besar, huruf kecil, dan angka.');
            isValid = false;
        }
    }

    if (!isValid) form.classList.add('was-validated');
    return isValid;
}

// ─── Button Loading State ─────────────────────────────────────────────────────

function setButtonLoading(btn, loading, text = 'Masuk') {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
        ? `<i class="fas fa-spinner fa-spin"></i> Memuat...`
        : `<span>${text}</span>`;
}

// ─── Main Auth Logic ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const authToggle = document.getElementById('auth-toggle');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const nameGroup = document.getElementById('name-group');
    const submitText = document.getElementById('submit-text');
    const toggleText = document.getElementById('toggle-text');
    const nameInput = document.getElementById('auth-name');

    let isRegisterMode = false;

    // Toggle Handler
    if (authToggle) {
        authToggle.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;

            if (isRegisterMode) {
                authTitle.textContent = 'Daftar Akun';
                authSubtitle.textContent = 'Bergabunglah dengan gerakan kebaikan hari ini.';
                nameGroup.style.display = 'block';
                if (nameInput) nameInput.setAttribute('required', 'true');
                if (submitText) submitText.textContent = 'Daftar Sekarang';
                if (toggleText) toggleText.textContent = 'Sudah punya akun?';
                authToggle.textContent = 'Masuk';
            } else {
                authTitle.textContent = 'Selamat Datang';
                authSubtitle.textContent = 'Masukkan detail Anda untuk masuk ke KindTrack.';
                nameGroup.style.display = 'none';
                if (nameInput) nameInput.removeAttribute('required');
                if (submitText) submitText.textContent = 'Masuk';
                if (toggleText) toggleText.textContent = "Belum punya akun?";
                authToggle.textContent = 'Daftar';
            }
        });
    }

    // Submit Handler
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;
            const name = isRegisterMode ? document.getElementById('auth-name').value.trim() : '';
            const submitBtn = document.getElementById('submit-btn');

            // Client Validation
            clearFormErrors(authForm); // Clear errors first
            const isValid = validateAuthForm(email, password, name, isRegisterMode);
            if (!isValid) return;

            // Remove previous alerts
            const existingAlert = authForm.querySelector('.alert');
            if (existingAlert) existingAlert.remove();

            try {
                setButtonLoading(submitBtn, true, isRegisterMode ? 'Mendaftar...' : 'Masuk...');

                if (!isRegisterMode) {
                    // Login
                    await signInWithEmailAndPassword(auth, email, password);
                    showToast('Login berhasil! Selamat datang kembali.', 'success');
                } else {
                    // Register
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { displayName: name });

                    try {
                        await sendEmailVerification(userCredential.user);
                    } catch (e) {
                        console.error('Email verification error:', e);
                    }

                    // NEW: Ensure we create a Firestore document for email/password users!
                    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
                    const userDocRef = doc(db, 'users', userCredential.user.uid);
                    await setDoc(userDocRef, {
                        name: name,
                        email: email,
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                        role: role,
                        totalPoints: 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    showToast('Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.', 'success');
                }

                // Check user role for redirection
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

                // Small delay for toast visibility
                setTimeout(() => {
                    window.location.href = isAdmin ? 'admin.html' : 'dashboard.html';
                }, 1000);

            } catch (error) {
                console.error('[Auth Error]', error.code, error.message);
                showAlert('auth-form', getAuthErrorMessage(error.code));
                setButtonLoading(submitBtn, false, isRegisterMode ? 'Daftar' : 'Masuk');
            }
        });
    }

    // Google Sign-in Handler
    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Create/Update user doc in Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    await setDoc(userDocRef, {
                        name: user.displayName,
                        email: user.email,
                        avatarUrl: user.photoURL,
                        role: 'user', // Default role for Google sign-in
                        totalPoints: 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }

                const role = userDoc.exists() ? userDoc.data().role : 'user';
                showToast(`Selamat datang, ${user.displayName}!`, "success");

                setTimeout(() => {
                    window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('[Google Auth Error]', error.code, error.message);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showToast(getAuthErrorMessage(error.code), 'error');
                }
            }
        });
    }
});

// ─── State Persistence & Guards ───────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');
    const isInPages = path.includes('/pages/');

    if (user && isLoginPage) {
        // We already have a check inside the submit handler, 
        // but for persistence, let's also check here
        getDoc(doc(db, 'users', user.uid)).then(userDoc => {
            const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
            window.location.href = isAdmin ? 'admin.html' : 'dashboard.html';
        });
    } else if (!user && isInPages && !isLoginPage) {
        window.location.href = 'login.html';
    }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async () => {
    showConfirmModal({
        title: 'Keluar Akun',
        message: 'Apakah Anda yakin ingin keluar? Perjalanan kebaikan Anda sedang menunggu!',
        confirmText: 'Keluar Sekarang',
        cancelText: 'Tetap di Sini',
        onConfirm: async () => {
            try {
                await signOut(auth);
                window.location.href = '../index.html';
            } catch (error) {
                console.error('[Logout Error]', error.code, error.message);
                showToast('Gagal keluar. Silakan coba lagi.', 'error');
            }
        }
    });
};
