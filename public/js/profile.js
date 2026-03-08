import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { showToast } from './utils.js';
import { logout } from './auth.js';

let currentUser = null;
let newAvatarBase64 = null;

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('is-invalid');
    const group = field.closest('.form-group');
    const feedback = group?.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.style.display = 'block';
    }
}

function clearFormErrors(form) {
    form.classList.remove('was-validated');
    form.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', logout);

    const usernameInput = document.getElementById('profile-username');
    const nameInput = document.getElementById('profile-name');
    const bioInput = document.getElementById('profile-bio');
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('avatar-preview');
    const greetingName = document.getElementById('greeting-name');
    const greetingEmail = document.getElementById('greeting-email');
    const profileForm = document.getElementById('profile-form');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // Set Basic Info
        const defaultName = user.displayName || user.email.split('@')[0];
        nameInput.value = defaultName;
        greetingName.textContent = defaultName;
        greetingEmail.textContent = user.email;

        // Sidebar user info
        const sidebarName = document.getElementById('sidebar-user-name');
        if (sidebarName) sidebarName.textContent = defaultName;

        // Fetch Extra User Data from Firestore (Bio & Avatar Base64)
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.username) usernameInput.value = data.username;
                if (data.bio) bioInput.value = data.bio;
                if (data.avatarUrl) {
                    avatarPreview.innerHTML = `<img src="${data.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    // Also update sidebar avatar if valid URL
                    const sidebarAvatar = document.getElementById('sidebar-avatar');
                    if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${data.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                } else {
                    avatarPreview.textContent = defaultName[0].toUpperCase();
                }
            } else {
                avatarPreview.textContent = defaultName[0].toUpperCase();
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            avatarPreview.textContent = defaultName[0].toUpperCase();
        }
    });

    // Handle Avatar Preview & Compression
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            newAvatarBase64 = await compressImageToBase64(file);
            avatarPreview.innerHTML = `<img src="${newAvatarBase64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } catch (err) {
            showToast("Gagal memproses gambar.", "error");
        }
    });

    // Handle Form Submit
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

        try {
            const newUsername = usernameInput.value.trim().toLowerCase();
            const newName = nameInput.value.trim();
            const newBio = bioInput.value.trim();
            const newPassword = document.getElementById('profile-password')?.value;

            // 0. Validation
            let isValid = true;
            clearFormErrors(profileForm);

            if (!newUsername || newUsername.length < 3 || !/^[a-z0-9_]+$/.test(newUsername)) {
                showFieldError('profile-username', 'Username minimal 3 karakter (huruf, angka, garis bawah).');
                isValid = false;
            }

            if (!newName || newName.length < 2) {
                showFieldError('profile-name', 'Nama tampilan minimal harus 2 karakter.');
                isValid = false;
            }

            if (newPassword && newPassword.length < 8) {
                showFieldError('profile-password', 'Kata sandi baru minimal harus 8 karakter.');
                isValid = false;
            }

            if (!isValid) {
                profileForm.classList.add('was-validated');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
            }

            // 1. Update Firebase Auth Profile (Display Name)
            if (newName !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName: newName });
            }

            // 2. Update Firestore User Document (Avatar, Bio, Username)
            const userDocRef = doc(db, 'users', currentUser.uid);
            const updateData = {
                username: newUsername,
                name: newName,
                bio: newBio,
                updatedAt: new Date()
            };

            if (newAvatarBase64) {
                updateData.avatarUrl = newAvatarBase64;
            }

            // setDoc with merge:true will update existing fields or create doc if it doesn't exist
            await setDoc(userDocRef, updateData, { merge: true });

            showToast("Profil berhasil diperbarui!", "success");

            // Re-render local displays
            greetingName.textContent = newName;
            document.getElementById('sidebar-user-name').textContent = newName;
            if (newAvatarBase64) {
                document.getElementById('sidebar-avatar').innerHTML = `<img src="${newAvatarBase64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            }

            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }, 1000);

        } catch (error) {
            console.error(error);
            showToast("Gagal menyimpan perubahan.", "error");
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });

    // Handle Account Deletion (Danger Zone)
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const confirmed = confirm("⚠ PERINGATAN FATAL: Apakah Anda yakin ingin menghapus akun secara permanen? Seluruh riwayat kebaikan dan poin Anda akan hilang selamanya.");
            if (!confirmed) return;

            const secondConfirm = confirm("PERINGATAN TERAKHIR: Tindakan ini tidak dapat dibatalkan. Semua data profil dan sejarah komunitas Anda akan dihapus. Lanjutkan?");
            if (!secondConfirm) return;

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';

            try {
                // 1. Clean up Firestore (Mark as deleted)
                await setDoc(doc(db, 'users', currentUser.uid), {
                    status: 'deleted',
                    deletedAt: new Date()
                }, { merge: true });

                // 2. Delete Auth Account
                await currentUser.delete();

                showToast("Akun Anda telah dihapus. Sampai jumpa.", "info");
                setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (error) {
                console.error(error);
                if (error.code === 'auth/requires-recent-login') {
                    showToast("Harap keluar dan masuk kembali sebelum menghapus akun demi alasan keamanan.", "error");
                } else {
                    showToast("Gagal menghapus akun sepenuhnya. Hubungi dukungan.", "error");
                }
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-user-slash"></i> Hapus Akun Saya Secara Permanen';
            }
        });
    }
});

// Helper for Base64 Compression
function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Target avatar size (e.g. 200x200 max)
                const MAX_SIZE = 200;
                let width = img.width;
                let height = img.height;

                // Crop / Resize logically
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // JPEG compression for light data
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
