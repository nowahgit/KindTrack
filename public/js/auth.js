import { auth } from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { db } from './firebase-init.js';
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { showToast, showConfirmModal, showAlert } from './utils.js';

// ─── Friendly Error Messages ──────────────────────────────────────────────────

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Invalid email format. Please check your address.',
        'auth/user-disabled': 'This account has been disabled. Contact support.',
        'auth/user-not-found': 'Email not found. Try signing up instead.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Email or password does not match. Please check again.',
        'auth/email-already-in-use': 'Email is already registered. Try signing in.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/too-many-requests': 'Too many failed attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet.',
        'auth/popup-closed-by-user': 'Login cancelled. Try again.',
        'auth/requires-recent-login': 'Your session has expired. Please login again.',
        'auth/missing-password': 'Password cannot be empty.',
        'auth/missing-email': 'Email cannot be empty.',
    };
    return messages[errorCode] || `An unexpected error occurred (${errorCode}).`;
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
            showFieldError('auth-name', 'Full name must be at least 2 characters.');
            isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(name)) {
            showFieldError('auth-name', 'Name can only contain letters and spaces.');
            isValid = false;
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showFieldError('auth-email', 'Please enter a valid email address.');
        isValid = false;
    }

    if (!isRegisterMode && (!password || password.length < 6)) {
        showFieldError('auth-password', 'Password must be at least 6 characters.');
        isValid = false;
    }

    if (isRegisterMode) {
        if (!password || password.length < 8) {
            showFieldError('auth-password', 'Use at least 8 characters.');
            isValid = false;
        } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            showFieldError('auth-password', 'Include uppercase, lowercase, and a number.');
            isValid = false;
        }
    }

    if (!isValid) form.classList.add('was-validated');
    return isValid;
}

// ─── Button Loading State ─────────────────────────────────────────────────────

function setButtonLoading(btn, loading, text = 'Sign In') {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
        ? `<i class="fas fa-spinner fa-spin"></i> Loading...`
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
                authTitle.textContent = 'Create Account';
                authSubtitle.textContent = 'Join the kindness movement today.';
                nameGroup.style.display = 'block';
                if (nameInput) nameInput.setAttribute('required', 'true');
                if (submitText) submitText.textContent = 'Create Account';
                if (toggleText) toggleText.textContent = 'Already have an account?';
                authToggle.textContent = 'Sign in';
            } else {
                authTitle.textContent = 'Welcome back';
                authSubtitle.textContent = 'Enter your details to sign in to KindTrack.';
                nameGroup.style.display = 'none';
                if (nameInput) nameInput.removeAttribute('required');
                if (submitText) submitText.textContent = 'Sign In';
                if (toggleText) toggleText.textContent = "Don't have an account?";
                authToggle.textContent = 'Sign up';
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
                setButtonLoading(submitBtn, true, isRegisterMode ? 'Creating Account' : 'Signing In');

                if (!isRegisterMode) {
                    // Login
                    await signInWithEmailAndPassword(auth, email, password);
                    showToast('Login successful! Welcome back.', 'success');
                } else {
                    // Register
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(userCredential.user, { displayName: name });

                    // NEW: Ensure we create a Firestore document for email/password users!
                    // If the user's email is an admin email, automatically grant admin role.
                    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
                    const userDocRef = doc(db, 'users', userCredential.user.uid);
                    await setDoc(userDocRef, {
                        name: name,
                        email: email,
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                        role: role,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    showToast('Account created! Let\'s be kind today.', 'success');
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
                setButtonLoading(submitBtn, false, isRegisterMode ? 'Create Account' : 'Sign In');
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
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }

                const role = userDoc.exists() ? userDoc.data().role : 'user';
                showToast(`Welcome, ${user.displayName}!`, "success");

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
        title: 'Sign Out',
        message: 'Are you sure you want to sign out? Your kindness journey is waiting for you!',
        confirmText: 'Sign Me Out',
        cancelText: 'Stay Here',
        onConfirm: async () => {
            try {
                await signOut(auth);
                window.location.href = '../index.html';
            } catch (error) {
                console.error('[Logout Error]', error.code, error.message);
                showToast('Logout failed. Please try again.', 'error');
            }
        }
    });
};
