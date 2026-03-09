import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    where,
    limit,
    startAfter
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirmModal } from './utils.js';
import { logout } from './auth.js';

let currentUser = null;
let activeTab = 'users';
let selectedChatUserId = null;

// Auth check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        showToast('Akses tidak diizinkan. Khusus admin.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        return;
    }

    currentUser = user;
    const data = userDoc.data();
    document.getElementById('admin-name').textContent = data?.name || user.displayName || 'Admin';
    if (data?.avatarUrl) {
        document.getElementById('admin-avatar').innerHTML = `<img src="${data.avatarUrl}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">`;
    }

    document.getElementById('admin-profile-name').value = data?.name || '';
    document.getElementById('admin-profile-avatar').value = data?.avatarUrl || '';

    initializeApp();
});

function initializeApp() {
    setupTabListeners();
    loadUsers();
    loadReports();
    loadCommunity();
    setupChatListeners();
    setupProfileListener();

    // Logout listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

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
    if (!form) return;
    form.classList.remove('was-validated');
    form.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');
}

function setupProfileListener() {
    const form = document.getElementById('admin-profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('admin-profile-save');
        const originalText = btn.textContent;

        const nameInput = document.getElementById('admin-profile-name');
        const avatarInput = document.getElementById('admin-profile-avatar');

        const name = nameInput.value.trim();
        const avatarUrl = avatarInput.value.trim();

        // Validation
        let isValid = true;
        clearFormErrors(form);

        if (!name || name.length < 2) {
            showFieldError('admin-profile-name', 'Nama tampilan harus minimal 2 karakter.');
            isValid = false;
        }

        if (avatarUrl && !avatarUrl.startsWith('http')) {
            showFieldError('admin-profile-avatar', 'Silakan masukkan URL yang valid (diawali dengan http/https).');
            isValid = false;
        }

        if (!isValid) {
            form.classList.add('was-validated');
            return;
        }

        try {
            btn.textContent = 'Menyimpan...';
            btn.disabled = true;

            await updateDoc(doc(db, 'users', currentUser.uid), {
                name,
                avatarUrl
            });
            showToast('Profil Admin berhasil diperbarui!', 'success');

            // update UI immediately
            document.getElementById('admin-name').textContent = name || 'Admin';
            const avatarDiv = document.getElementById('admin-avatar');
            if (avatarUrl) {
                avatarDiv.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">`;
            } else {
                avatarDiv.innerHTML = name ? name[0].toUpperCase() : 'A';
            }
        } catch (err) {
            console.error(err);
            showToast('Gagal memperbarui profil', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

function setupTabListeners() {
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`).classList.add('active');

    document.querySelectorAll('.section-tab').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Update titles
    const titles = {
        'users': ['Manajemen Pengguna', 'Pantau dan kelola semua pengguna terdaftar KindTrack.'],
        'community': ['Pemantauan Komunitas', 'Jelajahi dan moderasi aksi kebaikan publik.'],
        'reports': ['Laporan Konten', 'Tinjau item yang ditandai oleh komunitas.'],
        'chat': ['Pesan', 'Komunikasi langsung dengan pengguna KindTrack.'],
        'profile': ['Profil Admin', 'Kelola detail tampilan dan avatar Anda.']
    };
    document.getElementById('page-title').textContent = titles[tabId][0];
    document.getElementById('page-subtitle').textContent = titles[tabId][1];

    if (tabId === 'chat' && !selectedChatUserId) {
        loadChatUsers();
    }
}

// ─── User Management ─────────────────────────────────────────────────────────

let usersLastVisible = null;
let currentUsersArray = [];

async function loadUsers(loadMore = false) {
    let usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(15));

    if (loadMore && usersLastVisible) {
        usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(usersLastVisible), limit(15));
    }

    const snapshot = await getDocs(usersQuery);
    const tbody = document.getElementById('users-tbody');

    if (!loadMore) {
        tbody.innerHTML = '';
        currentUsersArray = [];
    }

    if (!snapshot.empty) {
        usersLastVisible = snapshot.docs[snapshot.docs.length - 1];
    } else {
        if (loadMore) showToast("Tidak ada lagi pengguna untuk dimuat", "info");
        return;
    }

    snapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const id = docSnap.id;
        currentUsersArray.push({ id, ...user });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width:36px; height:36px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; overflow:hidden; font-weight:700;">
                        ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; object-fit:cover;">` : (user.name ? user.name[0] : 'U')}
                    </div>
                    <div>
                        <div style="font-weight:700;">${user.name || 'Pengguna Anonim'}</div>
                        <div style="font-size:0.7rem; color:#64748b;">@${user.username || 'user'}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td style="color:#64748b; font-size:0.8rem;">${user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Admin' : 'User'}</span></td>
            <td>
                <button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem;" onclick="window.chatWithUser('${id}')">
                    <i class="fas fa-message"></i> Chat
                </button>
                ${user.role !== 'admin' ? `
                    <button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem; color:var(--primary); border-color:var(--primary-soft);" onclick="window.promoteUser('${id}')">Promosikan</button>
                    <button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem; color:#ef4444; border-color:#fee2e2;" onclick="window.deleteUser('${id}')">Hapus</button>
                ` : `
                    <button class="btn btn-outline" style="padding:0.4rem 0.75rem; font-size:0.75rem; color:#f59e0b; border-color:#fef3c7;" onclick="window.demoteUser('${id}')">Turunkan</button>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add Load More button
    if (snapshot.docs.length === 15) {
        const existingBtn = document.getElementById('load-more-users');
        if (!existingBtn) {
            const trBtn = document.createElement('tr');
            trBtn.id = 'load-more-btn-row';
            trBtn.innerHTML = `<td colspan="5" style="text-align:center; padding: 1rem;"><button id="load-more-users" class="btn btn-outline" style="font-size:0.8rem;">Muat Lebih Banyak</button></td>`;
            tbody.appendChild(trBtn);
            document.getElementById('load-more-users').addEventListener('click', () => {
                document.getElementById('load-more-btn-row').remove();
                loadUsers(true);
            });
        }
    }
}

window.chatWithUser = (uid) => {
    switchTab('chat');
    selectChatUser(uid);
};

window.promoteUser = async (uid) => {
    showConfirmModal({
        title: 'Promosikan Admin',
        message: 'Apakah Anda yakin ingin memberikan hak akses Admin ke pengguna ini?',
        confirmText: 'Promosikan Sekarang',
        cancelText: 'Batal',
        type: 'warning',
        onConfirm: async () => {
            await updateDoc(doc(db, 'users', uid), { role: 'admin' });
            showToast('Pengguna dipromosikan menjadi admin', 'success');
        }
    });
};

window.demoteUser = async (uid) => {
    showConfirmModal({
        title: 'Turunkan Hak Akses',
        message: 'Apakah Anda yakin ingin mencabut hak akses Admin dari pengguna ini?',
        confirmText: 'Turunkan Sekarang',
        cancelText: 'Batal',
        type: 'warning',
        onConfirm: async () => {
            await updateDoc(doc(db, 'users', uid), { role: 'user' });
            showToast('Admin diturunkan menjadi pengguna', 'success');
        }
    });
};

window.deleteUser = async (uid) => {
    showConfirmModal({
        title: 'Hapus Pengguna',
        message: 'PERINGATAN: Tindakan ini akan menghapus akun pengguna secara permanen. Lanjutkan?',
        confirmText: 'Hapus Selamanya',
        cancelText: 'Batal',
        type: 'danger',
        onConfirm: async () => {
            await deleteDoc(doc(db, 'users', uid));
            showToast('Pengguna berhasil dihapus', 'success');
        }
    });
};

// ─── Reports ────────────────────────────────────────────────────────────────

function loadReports() {
    const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    onSnapshot(reportsQuery, async (snapshot) => {
        const container = document.getElementById('reports-list');
        const countBadge = document.getElementById('report-count');

        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Tidak ada laporan tertunda. Komunitas aman! ✨</p>';
            countBadge.style.display = 'none';
            return;
        }

        countBadge.textContent = snapshot.size;
        countBadge.style.display = 'inline-block';

        snapshot.forEach(async (reportSnap) => {
            const report = reportSnap.data();
            const id = reportSnap.id;

            // Get post details
            const postDoc = await getDoc(doc(db, 'kindness', report.postId));
            const post = postDoc.exists() ? postDoc.data() : { content: '[Postingan Dihapus]', authorName: 'Tidak Diketahui' };

            const div = document.createElement('div');
            div.className = 'report-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:700; color:#ef4444; font-size:0.8rem; margin-bottom:0.5rem;">KONTEN DITANDAI</div>
                        <p style="font-size:0.95rem; margin-bottom:0.5rem;">" ${post.content} "</p>
                        <div style="display:flex; gap:1rem; font-size:0.75rem; color:#64748b;">
                            <span>Penulis: <b>${post.authorName || 'Pengguna'}</b></span>
                            <span>Dilaporkan oleh: <b>Pengguna ${report.reporterId.substring(0, 5)}</b></span>
                            <span>Tanggal: ${report.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:#22c55e;" onclick="window.dismissReport('${id}')">Biarkan</button>
                        <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:#ef4444;" onclick="window.takedownPost('${report.postId}', '${id}')">Hapus</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

window.dismissReport = async (rid) => {
    await deleteDoc(doc(db, 'reports', rid));
    showToast('Laporan diabaikan', 'success');
};

window.takedownPost = async (pid, rid) => {
    showConfirmModal({
        title: 'Hapus Postingan',
        message: 'Apakah Anda yakin ingin menghapus postingan ini secara permanen? Ini juga akan menghapus semua suka dan komentar terkait.',
        confirmText: 'Hapus Postingan',
        cancelText: 'Batal',
        type: 'danger',
        onConfirm: async () => {
            try {
                // 1. Delete associated Likes
                const likesQ = query(collection(db, 'likes'), where('postId', '==', pid));
                const likesSnap = await getDocs(likesQ);
                likesSnap.forEach(l => deleteDoc(doc(db, 'likes', l.id)));

                // 2. Delete associated Comments
                const commentsQ = query(collection(db, 'comments'), where('postId', '==', pid));
                const commentsSnap = await getDocs(commentsQ);
                commentsSnap.forEach(c => deleteDoc(doc(db, 'comments', c.id)));

                // 3. Delete the post itself
                await deleteDoc(doc(db, 'kindness', pid));

                // 4. Close the report if applicable
                if (rid && rid !== 'bypass') await deleteDoc(doc(db, 'reports', rid));

                showToast('Postingan dan semua metadata berhasil dihapus.', 'success');
            } catch (err) {
                console.error(err);
                showToast('Kesalahan saat penghapusan bertahap.', 'error');
            }
        }
    });
};

// ─── Community Monitoring ────────────────────────────────────────────────────

function loadCommunity() {
    const actsQuery = query(collection(db, 'kindness'), orderBy('timestamp', 'desc'));
    onSnapshot(actsQuery, async (snapshot) => {
        const container = document.getElementById('admin-feed');
        container.innerHTML = '';

        for (const docSnap of snapshot.docs) {
            const act = docSnap.data();
            const id = docSnap.id;

            // Try fetch real name if missing
            let authorName = act.authorName || 'Orang Baik';
            if (act.userId && !act.authorName) {
                try {
                    const uDoc = await getDoc(doc(db, 'users', act.userId));
                    if (uDoc.exists() && uDoc.data().name) authorName = uDoc.data().name;
                } catch (e) { }
            }

            const title = act.title || 'Aksi Kebaikan Tanpa Judul';
            const desc = act.description || '';
            const contentDisplay = title + (desc ? `<br><span style="color:#64748b; font-size:0.85rem; font-weight:normal;">${desc}</span>` : '');

            const div = document.createElement('div');
            div.className = 'admin-card';
            div.style.padding = '1rem';
            div.style.marginBottom = '0.75rem';
            div.style.fontSize = '0.9rem';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-weight:700;">${authorName}</span>
                        <span style="color:#64748b; font-size:0.75rem;">${act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString() : ''}</span>
                    </div>
                    <button style="color:#ef4444; background:none; border:none; cursor:pointer;" onclick="window.takedownPost('${id}', 'bypass')" title="Delete Post"><i class="fas fa-trash"></i></button>
                </div>
                <p style="margin-top:0.75rem; font-weight:600;">${contentDisplay}</p>
                <div style="margin-top:0.75rem; display:flex; gap:1rem; font-size:0.75rem; color:var(--primary);">
                    <span><i class="fas fa-heart"></i> ${act.likesCount || 0}</span>
                    <span><i class="fas fa-comment"></i> ${act.commentsCount || 0}</span>
                </div>
            `;
            container.appendChild(div);
        }
    });
}

// ─── Chat Support ────────────────────────────────────────────────────────────

async function loadChatUsers() {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('name')));
    const list = document.getElementById('chat-users-list');
    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const id = docSnap.id;
        if (id === currentUser.uid) return;

        const div = document.createElement('div');
        div.className = `chat-user-item ${selectedChatUserId === id ? 'active' : ''}`;
        div.innerHTML = `
            <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-weight:700;">
                ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : user.name[0]}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600; font-size:0.85rem;">${user.name}</div>
                <div style="font-size:0.7rem; color:#64748b;">Klik untuk mengobrol</div>
            </div>
        `;
        div.onclick = () => selectChatUser(id);
        list.appendChild(div);
    });
}

let chatUnsubscribe = null;

let chatEditId = null;

async function selectChatUser(uid) {
    selectedChatUserId = uid;
    document.querySelectorAll('.chat-user-item').forEach(i => i.classList.remove('active'));

    // Add active class to the clicked user
    const userNodes = document.querySelectorAll('.chat-user-item');
    for (let i of userNodes) {
        if (i.onclick && i.onclick.toString().includes(uid)) {
            i.classList.add('active');
        }
    }

    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.data();
    document.getElementById('chat-header').textContent = `Mengobrol dengan ${userData.name}`;

    const chatID = [currentUser.uid, uid].sort().join('_');

    if (chatUnsubscribe) chatUnsubscribe();

    const q = query(collection(db, 'chats'), where('chatID', '==', chatID), orderBy('timestamp', 'asc'));

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        const msgContainer = document.getElementById('chat-messages');
        msgContainer.innerHTML = '';

        snapshot.forEach((mSnap) => {
            const msg = mSnap.data();
            const id = mSnap.id;
            const isMe = msg.senderId === currentUser.uid;

            const mDiv = document.createElement('div');
            mDiv.className = `msg ${isMe ? 'msg-admin' : 'msg-user'}`;
            mDiv.style.position = 'relative';

            const editedTag = msg.isEdited ? `<span style="font-size:0.65rem; opacity:0.7; margin-left:5px;">(diedit)</span>` : '';
            mDiv.innerHTML = `<div>${escapeHtml(msg.text)} ${editedTag}</div>`;

            if (isMe) {
                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = `
                    display: flex; gap: 0.5rem; justify-content: flex-end; 
                    margin-top: 0.25rem; font-size: 0.7rem; opacity: 0.8;
                `;

                const editBtn = document.createElement('span');
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.style.cursor = 'pointer';
                editBtn.onclick = () => enableAdminEdit(id, msg.text);

                const delBtn = document.createElement('span');
                delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                delBtn.style.cursor = 'pointer';
                delBtn.onclick = () => deleteAdminMessage(id);

                actionsDiv.appendChild(editBtn);
                actionsDiv.appendChild(delBtn);
                mDiv.appendChild(actionsDiv);
            }

            msgContainer.appendChild(mDiv);
        });
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.enableAdminEdit = (id, currentText) => {
    chatEditId = id;
    const input = document.getElementById('chat-input-field');
    input.value = currentText;
    input.focus();
    const subBtn = document.querySelector('#chat-form button[type="submit"]');
    subBtn.textContent = 'Edit';
};

window.cancelAdminEdit = () => {
    chatEditId = null;
    document.getElementById('chat-input-field').value = '';
    document.querySelector('#chat-form button[type="submit"]').textContent = 'Kirim';
};

window.deleteAdminMessage = async (id) => {
    if (confirm("Hapus pesan ini?")) {
        try {
            await deleteDoc(doc(db, 'chats', id));
            showToast("Pesan dihapus", "success");
        } catch (e) {
            console.error(e);
            showToast("Gagal menghapus", "error");
        }
    }
};

function setupChatListeners() {
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input-field');
        const text = input.value.trim();
        if (!text || !selectedChatUserId) return;

        if (chatEditId) {
            await updateDoc(doc(db, 'chats', chatEditId), {
                text,
                isEdited: true
            });
            showToast("Pesan diedit", "success");
            window.cancelAdminEdit();
            return;
        }

        const chatID = [currentUser.uid, selectedChatUserId].sort().join('_');
        await addDoc(collection(db, 'chats'), {
            chatID,
            senderId: currentUser.uid,
            receiverId: selectedChatUserId,
            text,
            timestamp: serverTimestamp(),
            senderRole: 'admin',
            isEdited: false
        });

        input.value = '';
    });
}
