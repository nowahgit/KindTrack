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

import { escapeHtml, formatDate, getCategoryEmoji, getCategoryColor, showToast } from './utils.js';
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
        const q = query(kindnessRef, orderBy('timestamp', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            feedContainer.innerHTML = `
                <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: var(--text);">No acts of kindness yet</h3>
                    <p>Be the first to inspire the community!</p>
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
            const emoji = getCategoryEmoji(data.category);
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
                                        ${isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                ` : ''}
                            </div>
                            <!-- Report Button -->
                            ${authorId !== currentUser.uid ? `
                                <button class="report-btn" data-post-id="${postId}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;" title="Report this post">
                                    <i class="fas fa-flag"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="post-meta">
                            <span><i class="far fa-clock"></i> ${dateStr}</span>
                            •
                            <span class="badge" style="background:${color}18; color:${color}; font-size:0.7rem;">${emoji} ${data.category}</span>
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
                            <i class="far fa-comment"></i> Applaud
                        </div>
                    </div>
                    ${data.points ? `<div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-dark);"><i class="fas fa-star" style="color:var(--accent);"></i> +${data.points} pts</div>` : ''}
                </div>

                <!-- Comments Section -->
                <div class="comments-section" style="display:none; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-light);">
                    <div class="comments-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem;">
                        ${commentsHtml || '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">No applauds yet. Say something kind!</div>'}
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <input type="text" class="form-control comment-input" placeholder="Write a kind comment..." style="padding: 0.5rem 0.8rem; font-size: 0.9rem;">
                        <button class="btn btn-primary submit-comment-btn" data-post-id="${postId}" style="padding: 0.5rem 1rem;">Post</button>
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
                <p>Failed to load community feed. Make sure Firestore rules are updated!</p>
            </div>
        `;
    }
}

function attachEventListeners() {
    // Like logic
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const postId = this.getAttribute('data-post-id');
            const likeId = this.getAttribute('data-like-id');
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);

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
                        <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.5rem;">Just now</span>
                        <button class="delete-comment-btn" data-comment-id="${docRef.id}" style="position:absolute; right:0.5rem; top:0.5rem; background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-trash-alt" style="font-size:0.8rem;"></i></button>
                        <div style="font-size: 0.9rem; margin-top: 0.2rem;">${escapeHtml(text)}</div>
                    </div>
                `;
                input.value = '';
                list.scrollTop = list.scrollHeight;
            } catch (err) {
                console.error(err);
                showToast("Failed to post comment", "error");
            } finally {
                this.disabled = false;
                this.textContent = 'Post';
            }
        });
    });

    // Report Logic
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const postId = this.getAttribute('data-post-id');
            const confirmReport = confirm("Do you want to report this post to the admins?");
            if (confirmReport) {
                try {
                    await addDoc(collection(db, 'reports'), {
                        postId: postId,
                        reporterId: currentUser.uid,
                        timestamp: serverTimestamp()
                    });
                    showToast("Post reported. Thank you for keeping our community safe!", "success");
                    this.parentElement.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fas fa-flag"></i> Reported</span>`;
                } catch (e) {
                    showToast("Failed to report", "error");
                }
            }
        });
    });

    // Follow Logic
    document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const authorId = this.getAttribute('data-author-id');
            let followId = this.getAttribute('data-follow-id');

            if (this.classList.contains('following')) {
                // Unfollow
                this.classList.remove('following');
                this.textContent = 'Follow';
                this.style.background = 'var(--primary-soft)';
                this.style.color = 'var(--primary)';
                this.setAttribute('data-follow-id', '');

                if (followId && followId !== 'null') {
                    deleteDoc(doc(db, 'follows', followId)).catch(e => console.error(e));
                }
                showToast("Unfollowed user.", "success");
            } else {
                // Follow
                this.classList.add('following');
                this.textContent = 'Following';
                this.style.background = 'var(--bg-2)';
                this.style.color = 'var(--text-muted)';

                const docRef = await addDoc(collection(db, 'follows'), {
                    followerId: currentUser.uid,
                    followingId: authorId,
                    timestamp: serverTimestamp()
                });
                this.setAttribute('data-follow-id', docRef.id);
                showToast("You are now following this user!", "success");
            }
        });
    });

    // Delete comment logic (global event listener to handle normally and optimistically added ones)
    if (!window.deleteCommentListenerAdded) {
        document.addEventListener('click', async function (e) {
            const btn = e.target.closest('.delete-comment-btn');
            if (btn) {
                const commentId = btn.getAttribute('data-comment-id');
                const confirmDelete = confirm("Are you sure you want to delete this comment?");
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
                        showToast("Failed to delete comment", "error");
                        btn.innerHTML = originalHtml;
                    }
                }
            }
        });
        window.deleteCommentListenerAdded = true;
    }
}
