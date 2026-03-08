import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    addDoc,
    where,
    deleteDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { escapeHtml, formatDate, getCategoryColor, getCategoryIcon, showToast } from './utils.js';
import { logout } from './auth.js';

let currentUser = null;
let currentUserName = "Kind Stranger";
let currentUserAvatar = "U";

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (sidebarName) sidebarName.textContent = user.displayName || user.email;
        if (sidebarAvatar) sidebarAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserName = userDoc.data().name || user.displayName || user.email.split('@')[0];
                if (userDoc.data().avatarUrl) currentUserAvatar = userDoc.data().avatarUrl;
            } else {
                currentUserName = user.displayName || user.email.split('@')[0];
            }
        } catch (e) {
            currentUserName = user.displayName || user.email.split('@')[0];
        }

        await loadCommunityFeed();
    });
});

async function loadCommunityFeed() {
    const feedContainer = document.getElementById('feed-container');

    try {
        const kindnessRef = collection(db, 'kindness');
        const q = query(
            kindnessRef,
            where('isPublic', '==', true),
            orderBy('timestamp', 'desc'),
            limit(20)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedContainer.innerHTML = `
                <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: var(--text);">Belum ada aksi kebaikan</h3>
                    <p>Jadilah yang pertama menginspirasi komunitas!</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = '';

        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data();
            const postId = docSnapshot.id;
            const authorId = data.userId;

            // Get post author details from users collection to be fresh
            let authorName = data.authorName || "Kind Stranger";
            let authorAvatarStr = authorName.charAt(0).toUpperCase();

            // Default author info
            try {
                const authorDoc = await getDoc(doc(db, 'users', authorId));
                if (authorDoc.exists()) {
                    if (authorDoc.data().name) authorName = authorDoc.data().name;
                    if (authorDoc.data().avatarUrl) {
                        authorAvatarStr = `<img src="${authorDoc.data().avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    }
                }
            } catch (e) { }

            const dateStr = formatDate(data.date || data.timestamp);
            const icon = getCategoryIcon(data.category);
            const color = getCategoryColor(data.category);

            // Fetch Likes count and status
            const likesQ = query(collection(db, 'likes'), where('postId', '==', postId));
            const likesSnap = await getDocs(likesQ);
            const totalLikes = likesSnap.size;
            let isLiked = false;
            let likeDocId = null;
            likesSnap.forEach(ld => {
                if (ld.data().userId === currentUser.uid) {
                    isLiked = true;
                    likeDocId = ld.id;
                }
            });

            // Fetch Comments
            const commentsQ = query(collection(db, 'comments'), where('postId', '==', postId), orderBy('timestamp', 'asc'));
            const commentsSnap = await getDocs(commentsQ);
            const commentsCount = commentsSnap.size;
            let commentsHtml = '';
            commentsSnap.forEach(cd => {
                const cdata = cd.data();
                const canDelete = (cdata.userId === currentUser.uid) || (authorId === currentUser.uid);
                commentsHtml += `
                    <div id="comment-${cd.id}" style="margin-bottom: 0.8rem; padding: 0.5rem; background: var(--bg-1); border-radius: 8px; position: relative;">
                        <span style="font-weight:700; font-size: 0.85rem;">${escapeHtml(cdata.authorName)}</span>
                        <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.5rem;">${formatDate(cdata.timestamp)}</span>
                        ${canDelete ? `<button class="delete-comment-btn" data-comment-id="${cd.id}" style="position:absolute; right:0.5rem; top:0.5rem; background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-trash-alt" style="font-size:0.8rem;"></i></button>` : ''}
                        <div style="font-size: 0.9rem; margin-top: 0.2rem;">${escapeHtml(cdata.text)}</div>
                    </div>
                `;
            });

            // Fetch Follow status
            let isFollowing = false;
            let followDocId = null;
            if (authorId !== currentUser.uid) {
                const followQ = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid), where('followingId', '==', authorId));
                const followSnap = await getDocs(followQ);
                if (!followSnap.empty) {
                    isFollowing = true;
                    followDocId = followSnap.docs[0].id;
                }
            }

            const post = document.createElement('div');
            post.className = 'post-card animate-fade-up';
            post.id = `post-${postId}`;
            post.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar" style="padding:0; overflow:hidden;">${authorAvatarStr}</div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="post-author">
                                ${escapeHtml(authorName)}
                                ${authorId !== currentUser.uid ? `
                                    <button class="follow-btn ${isFollowing ? 'following' : ''}" data-author-id="${authorId}" data-follow-id="${followDocId}" style="margin-left: 0.5rem; background: ${isFollowing ? 'var(--bg-2)' : 'var(--primary-soft)'}; color: ${isFollowing ? 'var(--text-muted)' : 'var(--primary)'}; border: none; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                                        ${isFollowing ? 'Diikuti' : 'Ikuti'}
                                    </button>
                                ` : ''}
                            </div>
                            <!-- Report Button -->
                            ${authorId !== currentUser.uid ? `
                                <button class="report-btn" data-post-id="${postId}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;" title="Laporkan postingan ini">
                                    <i class="fas fa-flag"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="post-meta">
                            <span><i class="far fa-clock"></i> ${dateStr}</span>
                            •
                            <span class="badge" style="background:${color}18; color:${color}; font-size:0.7rem;"><i class="fas ${icon}" style="margin-right:3px;"></i> ${data.category}</span>
                        </div>
                    </div>
                </div>
                <div class="post-title">${escapeHtml(data.title)}</div>
                ${data.description ? `<div class="post-desc">${escapeHtml(data.description)}</div>` : ''}
                ${data.photoUrl ? `<img src="${data.photoUrl}" alt="Act of Kindness" class="post-photo">` : ''}
                
                <div class="post-footer">
                    <div class="post-actions">
                        <div class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}" data-like-id="${likeDocId}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> <span class="like-count">${totalLikes}</span>
                        </div>
                        <div class="action-btn comment-toggle">
                            <i class="far fa-comment"></i> Beri Apresiasi
                        </div>
                    </div>
                    ${data.points ? `<div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-dark);"><i class="fas fa-star" style="color:var(--accent);"></i> +${data.points} pts</div>` : ''}
                </div>

                <!-- Comments Section -->
                <div class="comments-section" style="display:none; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-light);">
                    <div class="comments-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem;">
                        ${commentsHtml || '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Belum ada apresiasi. Katakan sesuatu yang baik!</div>'}
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <input type="text" class="form-control comment-input" placeholder="Tulis komentar baik..." style="padding: 0.5rem 0.8rem; font-size: 0.9rem;">
                        <button class="btn btn-primary submit-comment-btn" data-post-id="${postId}" style="padding: 0.5rem 1rem;">Kirim</button>
                    </div>
                </div>
            `;

            feedContainer.appendChild(post);
        }

        attachEventListeners();

    } catch (error) {
        console.error("Error loading community feed:", error);
        feedContainer.innerHTML = `
            <div style="text-align:center; padding: 2rem; color: #ef4444; background: #fef2f2; border-radius: 12px;">
                <i class="fas fa-exclamation-triangle" style="margin-bottom: 0.5rem; font-size: 1.5rem;"></i>
                <p>Gagal memuat kiriman komunitas.</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.8;">Detail Error: ${error.message}</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">Pastikan aturan dan indeks Firestore telah diperbarui!</p>
            </div>
        `;
    }
}

function attachEventListeners() {
    // Like logic
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (this.style.pointerEvents === 'none') return; // Debounce

            const postId = this.getAttribute('data-post-id');
            const likeId = this.getAttribute('data-like-id');
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);

            this.style.pointerEvents = 'none'; // Lock button ephemeral

            if (this.classList.contains('liked')) {
                // Unlike
                this.classList.remove('liked');
                icon.classList.remove('fas');
                icon.classList.add('far');
                countSpan.textContent = count - 1;
                this.setAttribute('data-like-id', '');

                if (likeId && likeId !== 'null') {
                    deleteDoc(doc(db, 'likes', likeId)).catch(err => console.error(err));
                }
            } else {
                // Like
                this.classList.add('liked');
                icon.classList.remove('far');
                icon.classList.add('fas');
                countSpan.textContent = count + 1;
                this.style.transform = 'scale(1.2)';
                setTimeout(() => this.style.transform = 'scale(1)', 150);

                const likeDoc = await addDoc(collection(db, 'likes'), {
                    postId: postId,
                    userId: currentUser.uid,
                    timestamp: serverTimestamp()
                });
                this.setAttribute('data-like-id', likeDoc.id);
            }
            this.style.pointerEvents = 'auto'; // Unlock after Firestore update
        });
    });

    // Toggle comments
    document.querySelectorAll('.comment-toggle').forEach(btn => {
        btn.addEventListener('click', function () {
            const section = this.closest('.post-card').querySelector('.comments-section');
            if (section.style.display === 'none') {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    });

    // Submit comment
    document.querySelectorAll('.submit-comment-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const postId = this.getAttribute('data-post-id');
            const input = this.parentElement.querySelector('.comment-input');
            const list = this.closest('.comments-section').querySelector('.comments-list');
            const text = input.value.trim();

            if (!text) return;

            this.disabled = true;
            this.textContent = '...';

            try {
                const docRef = await addDoc(collection(db, 'comments'), {
                    postId: postId,
                    userId: currentUser.uid,
                    authorName: currentUserName,
                    text: text,
                    timestamp: serverTimestamp()
                });

                // Optimistic UI updates
                if (list.innerHTML.includes('No applauds yet')) {
                    list.innerHTML = '';
                }
                list.innerHTML += `
                    <div id="comment-${docRef.id}" style="margin-bottom: 0.8rem; padding: 0.5rem; background: var(--bg-1); border-radius: 8px; animation: fadeUp 0.3s forwards; position: relative;">
                        <span style="font-weight:700; font-size: 0.85rem;">${escapeHtml(currentUserName)}</span>
                        <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.5rem;">Baru saja</span>
                        <button class="delete-comment-btn" data-comment-id="${docRef.id}" style="position:absolute; right:0.5rem; top:0.5rem; background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-trash-alt" style="font-size:0.8rem;"></i></button>
                        <div style="font-size: 0.9rem; margin-top: 0.2rem;">${escapeHtml(text)}</div>
                    </div>
                `;
                input.value = '';
                list.scrollTop = list.scrollHeight;
            } catch (err) {
                console.error(err);
                showToast("Gagal mengirim komentar", "error");
            } finally {
                this.disabled = false;
                this.textContent = 'Kirim';
            }
        });
    });

    // Report Logic
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const postId = this.getAttribute('data-post-id');
            const confirmReport = confirm("Apakah Anda ingin melaporkan postingan ini ke admin?");
            if (confirmReport) {
                try {
                    await addDoc(collection(db, 'reports'), {
                        postId: postId,
                        reporterId: currentUser.uid,
                        timestamp: serverTimestamp()
                    });
                    showToast("Postingan dilaporkan. Terima kasih telah menjaga keamanan komunitas kami!", "success");
                    this.parentElement.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fas fa-flag"></i> Dilaporkan</span>`;
                } catch (e) {
                    showToast("Gagal melaporkan", "error");
                }
            }
        });
    });

    // Follow Logic
    document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (this.style.pointerEvents === 'none') return; // Debounce
            this.style.pointerEvents = 'none';

            const authorId = this.getAttribute('data-author-id');
            let followId = this.getAttribute('data-follow-id');

            if (this.classList.contains('following')) {
                // Unfollow
                this.classList.remove('following');
                this.textContent = 'Ikuti';
                this.style.background = 'var(--primary-soft)';
                this.style.color = 'var(--primary)';
                this.setAttribute('data-follow-id', '');

                if (followId && followId !== 'null') {
                    deleteDoc(doc(db, 'follows', followId)).catch(e => console.error(e));
                }
                showToast("Berhenti mengikuti pengguna.", "success");
            } else {
                // Follow
                this.classList.add('following');
                this.textContent = 'Diikuti';
                this.style.background = 'var(--bg-2)';
                this.style.color = 'var(--text-muted)';

                const docRef = await addDoc(collection(db, 'follows'), {
                    followerId: currentUser.uid,
                    followingId: authorId,
                    timestamp: serverTimestamp()
                });
                this.setAttribute('data-follow-id', docRef.id);
                showToast("Anda sekarang mengikuti pengguna ini!", "success");
            }
            this.style.pointerEvents = 'auto'; // Reset after process
        });
    });

    // Delete comment logic (global event listener to handle normally and optimistically added ones)
    if (!window.deleteCommentListenerAdded) {
        document.addEventListener('click', async function (e) {
            const btn = e.target.closest('.delete-comment-btn');
            if (btn) {
                const commentId = btn.getAttribute('data-comment-id');
                const confirmDelete = confirm("Apakah Anda yakin ingin menghapus komentar ini?");
                if (confirmDelete) {
                    try {
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        await deleteDoc(doc(db, 'comments', commentId));
                        const commentEl = document.getElementById(`comment-${commentId}`);
                        if (commentEl) {
                            commentEl.style.display = 'none';
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Gagal menghapus komentar", "error");
                        btn.innerHTML = originalHtml;
                    }
                }
            }
        });
        window.deleteCommentListenerAdded = true;
    }
}
