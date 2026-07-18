import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBubDGBJ-1Z_zY5JqdiHksd1ZIgsMcrfJY",
    authDomain: "online-koshk1.firebaseapp.com",
    projectId: "online-koshk1",
    storageBucket: "online-koshk1.firebasestorage.app",
    messagingSenderId: "402274879864",
    appId: "1:402274879864:web:1866aa5b229c26a8a0208d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);