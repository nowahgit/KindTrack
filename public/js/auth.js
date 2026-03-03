import { auth } from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { showToast } from './utils.js';

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

function validateAuthForm(email, password, name, isRegister) {
    if (isRegister && (!name || name.trim().length < 2)) {
        return 'Full name must be at least 2 characters.';
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
        return 'Please enter a valid email address.';
    }
    if (!password || password.length < 6) {
        return 'Password must be at least 6 characters.';
    }
    if (isRegister && password.length < 8) {
        return 'For better security, use at least 8 characters.';
    }
    return null; // valid
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
            const name = nameInput ? nameInput.value.trim() : '';
            const submitBtn = document.getElementById('submit-btn');

            // Client Validation
            const validationError = validateAuthForm(email, password, name, isRegisterMode);
            if (validationError) {
                showToast(validationError, 'error');
                return;
            }

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
                    showToast('Account created! Let\'s be kind today.', 'success');
                }

                // Small delay for toast visibility
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                console.error('[Auth Error]', error.code, error.message);
                showToast(getAuthErrorMessage(error.code), 'error');
                setButtonLoading(submitBtn, false, isRegisterMode ? 'Create Account' : 'Sign In');
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
        showToast('Logout failed. Please try again.', 'error');
    }
};
