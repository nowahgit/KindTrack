// Firebase Initialization Template
// Get your config from Firebase Console: Project Settings > General > Your apps
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCI1UDnonQPtSZaZ9x546UhkRzc1zDgYN8",
    authDomain: "kindtrack.firebaseapp.com",
    projectId: "kindtrack",
    storageBucket: "kindtrack.firebasestorage.app",
    messagingSenderId: "617464099122",
    appId: "1:617464099122:web:69317c8fd70ec3e89ce72b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
