import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export const firebaseConfig = {
    apiKey: "AIzaSyBubDGBJ-1Z_zY5JqdiHksd1ZIgsMcrfJY",
    authDomain: "online-koshk1.firebaseapp.com",
    projectId: "online-koshk1",
    storageBucket: "online-koshk1.firebasestorage.app",
    messagingSenderId: "402274879864",
    appId: "1:402274879864:web:1866aa5b229c26a8a0208d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let database;
try {
    database = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn("Firestore offline cache initialization failed, falling back to default.", e);
    database = getFirestore(app);
}

export const db = database;
export const storage = getStorage(app);