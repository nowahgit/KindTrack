import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    increment,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Common Utils
import { showToast, showAlert } from './utils.js';
import { logout } from './auth.js';

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

    // Photo Preview
    const photoInput = document.getElementById('kindness-photo');
    const photoPreviewText = document.getElementById('photo-preview-text');
    if (photoInput && photoPreviewText) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update only the preview text area, NOT the parent which contains the input
                    photoPreviewText.innerHTML = `
                        <img src="${event.target.result}" style="max-height: 150px; border-radius: 8px; margin-bottom: 0.5rem; display: block; margin: 0 auto;">
                        <p style="font-size:0.75rem; color:var(--primary); margin:0; font-weight:600;">Foto terpilih: ${file.name}</p>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Character counter & Description warning
    const descInput = document.getElementById('kindness-desc');
    const descCounter = document.getElementById('desc-counter');
    const descWarning = document.getElementById('desc-warning');
    if (descInput && descCounter) {
        descInput.addEventListener('input', () => {
            const len = descInput.value.length;
            descCounter.textContent = `${len}/500`;
            descCounter.style.color = len > 450 ? '#ef4444' : 'var(--text-muted)';

            if (len > 0 && len < 20) {
                descWarning.style.display = 'block';
            } else {
                descWarning.style.display = 'none';
            }
        });
    }


    // Form Submit
    const kindnessForm = document.getElementById('add-kindness-form');
    if (kindnessForm) {
        kindnessForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                showAlert('add-kindness-form', 'Silakan masuk terlebih dahulu.');
                window.location.href = 'login.html';
                return;
            }

            const title = document.getElementById('kindness-title').value.trim();
            const radioCategory = document.querySelector('input[name="category"]:checked');
            const category = radioCategory ? radioCategory.value : '';
            const description = document.getElementById('kindness-desc').value.trim();
            const date = document.getElementById('kindness-date').value;
            const photoInput = document.getElementById('kindness-photo');
            const isPublic = document.getElementById('kindness-public')?.checked ?? true;

            // Specific Validation
            let isValid = true;
            clearFormErrors(kindnessForm);

            if (!title || title.length < 3) {
                showFieldError('kindness-title', 'Judul minimal 3 karakter.');
                isValid = false;
            }
            if (!category) {
                const feedback = document.getElementById('category-feedback');
                if (feedback) feedback.style.display = 'block';
                isValid = false;
            }
            if (description && description.trim().length < 20) {
                showFieldError('kindness-desc', 'Deskripsi minimal harus 20 karakter nyata.');
                isValid = false;
            }
            if (!date) {
                showFieldError('kindness-date', 'Harap pilih tanggal.');
                isValid = false;
            }

            if (!isValid) {
                kindnessForm.classList.add('was-validated');
                return;
            }

            const submitBtn = document.getElementById('submit-btn');
            // FIX: Prevent double submission
            if (submitBtn.disabled) return;

            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

                // ─── Rate Limiting (Server side should be in rules, but client checks first) ───
                const todayStr = new Date().toISOString().split('T')[0];
                const q = query(collection(db, 'kindness'),
                    where('userId', '==', user.uid),
                    where('date', '==', todayStr));
                const snapshot = await getDocs(q);

                let actsTodayCount = snapshot.size;
                let pointsEarned = 0;

                if (actsTodayCount >= 5) {
                    showToast('Batas poin harian tercapai, tapi aksi Anda tetap dicatat.', 'info');
                } else {
                    pointsEarned = 10; // Base points
                    if (description.length >= 20) pointsEarned += 5; // Good description bonus
                }

                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

                // ─── Photo Upload (Base64 Alternative) ───
                let photoUrl = null;
                if (photoInput && photoInput.files[0]) {
                    const file = photoInput.files[0];
                    if (actsTodayCount < 5) pointsEarned += 20; // Social proof bonus

                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses foto...';

                    // Convert to compressed Base64 using Canvas to avoid Storage pricing plan issues
                    photoUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = (event) => {
                            const img = new Image();
                            img.src = event.target.result;
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 500;
                                const MAX_HEIGHT = 500;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                    if (width > MAX_WIDTH) {
                                        height *= MAX_WIDTH / width;
                                        width = MAX_WIDTH;
                                    }
                                } else {
                                    if (height > MAX_HEIGHT) {
                                        width *= MAX_HEIGHT / height;
                                        height = MAX_HEIGHT;
                                    }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);

                                // Compress heavily as JPEG to stay under 1MB Firestore limit
                                resolve(canvas.toDataURL('image/jpeg', 0.6));
                            };
                            img.onerror = (err) => reject(err);
                        };
                        reader.onerror = (err) => reject(err);
                    });
                }

                // ─── Save Document ───
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

                await addDoc(collection(db, 'kindness'), {
                    userId: user.uid,
                    authorName: user.displayName || user.email.split('@')[0] || "Anonymous",
                    title,
                    category,
                    description,
                    date,
                    photoUrl: photoUrl,
                    points: pointsEarned,
                    isPublic: isPublic,
                    timestamp: serverTimestamp()
                });

                // Update User Total Points for Global Leaderboard
                if (pointsEarned > 0) {
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, {
                        totalPoints: increment(pointsEarned),
                        lastActivityDate: date
                    }, { merge: true });
                }

                if (pointsEarned > 0) {
                    showToast(`Aksi kebaikan dicatat! Anda mendapatkan ${pointsEarned} poin.`, 'success');
                } else {
                    showToast('Aktivitas disimpan! Tidak ada poin tambahan hari ini.', 'success');
                }

                kindnessForm.reset();
                if (descCounter) descCounter.textContent = '0/500';
                if (dateInput) dateInput.value = todayStr;
                if (photoPreviewText) {
                    photoPreviewText.innerHTML = `
                        <i class="fas fa-camera" style="font-size: 1.5rem; color: var(--text-light); margin-bottom: 0.5rem;"></i>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Klik atau seret foto ke sini</p>
                    `;
                }

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } catch (error) {
                console.error('[Save Error]', error);
                showAlert('add-kindness-form', 'Gagal menyimpan data. Periksa koneksi Anda.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});
