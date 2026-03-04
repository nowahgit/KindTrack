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

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

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
            showToast("Failed to process image.", "error");
        }
    });

    // Handle Form Submit
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const newName = nameInput.value.trim();
            const newBio = bioInput.value.trim();

            // 1. Update Firebase Auth Profile (Display Name)
            if (newName !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName: newName });
            }

            // 2. Update Firestore User Document (Avatar & Bio)
            const userDocRef = doc(db, 'users', currentUser.uid);
            const updateData = {
                name: newName,
                bio: newBio,
                updatedAt: new Date()
            };

            if (newAvatarBase64) {
                updateData.avatarUrl = newAvatarBase64;
            }

            // setDoc with merge:true will update existing fields or create doc if it doesn't exist
            await setDoc(userDocRef, updateData, { merge: true });

            showToast("Profile updated successfully!", "success");

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
            showToast("Failed to save changes.", "error");
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });
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
