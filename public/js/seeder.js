import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('start-btn').addEventListener('click', async () => {
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('log-box').style.display = 'block';

    const logEl = document.getElementById('log');
    const log = (msg, error = false) => {
        logEl.innerHTML += `<div class="log-entry ${error ? 'error' : ''}">${error ? '❌ ' : '✅ '}${msg}</div>`;
        console.log(msg);
    };

    try {
        log("Memulai proses seeding...");

        // --------- ADMIN ----------
        log("Mencoba membuat akun Admin: <b>superadmin@kindtrack.com</b>...");
        let adminCred;
        try {
            adminCred = await createUserWithEmailAndPassword(auth, "superadmin@kindtrack.com", "admin1234");
            await updateProfile(adminCred.user, { displayName: "Super Admin" });

            await setDoc(doc(db, "users", adminCred.user.uid), {
                name: "Super Admin",
                username: "superadmin",
                email: "superadmin@kindtrack.com",
                avatarUrl: `https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff`,
                role: "admin",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            log("Doc Firestore Admin berhasil dibuat dengan role: <b>admin</b>!");
            await signOut(auth);
            log("Admin Signup Sukses!");
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                log("Akun superadmin@kindtrack.com sudah ada sebelumnya.", true);
            } else {
                throw e; // Lemparkan error lainnya
            }
        }

        // --------- USER ----------
        log("Mencoba membuat akun User Biasa: <b>user@kindtrack.com</b>...");
        let userCred;
        try {
            userCred = await createUserWithEmailAndPassword(auth, "user@kindtrack.com", "user1234");
            await updateProfile(userCred.user, { displayName: "Reguler User" });

            await setDoc(doc(db, "users", userCred.user.uid), {
                name: "Reguler User",
                username: "reguser",
                email: "user@kindtrack.com",
                avatarUrl: `https://ui-avatars.com/api/?name=Reguler+User&background=3b82f6&color=fff`,
                role: "user",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            log("Doc Firestore User berhasil dibuat dengan role: <b>user</b>!");
            await signOut(auth);
            log("User Signup Sukses!");
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                log("Akun user@kindtrack.com sudah ada sebelumnya.", true);
            } else {
                throw e; // Lemparkan error lainnya
            }
        }

        document.getElementById('actions').style.display = 'block';
        log("Proses seeding selesai!");

    } catch (error) {
        log("ERROR: " + error.message, true);
    }
});
