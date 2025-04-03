import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail, 
    sendEmailVerification,
    updateProfile,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-rwkTmTQ5e_c1X7dy5MoUVhQql4yzuiA",
    authDomain: "codecraft-31904.firebaseapp.com",
    projectId: "codecraft-31904",
    storageBucket: "codecraft-31904.firebasestorage.app",
    messagingSenderId: "830176803621",
    appId: "1:830176803621:web:c8dae8a52028755fa438cc",
    measurementId: "G-VBX9L13R7E"
};

class FirebaseManager {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        
        // Listen for auth state changes
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            this.notifyAuthStateChange(user);
        });

        this.authStateListeners = [];
        this.initializeFirestore();
    }

    async initializeFirestore() {
        try {
            // Initialize security rules
            await this.db.enablePersistence({
                synchronizeTabs: true
            });
        } catch (err) {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn('Firebase persistence not enabled - multiple tabs detected');
            } else if (err.code === 'unimplemented') {
                // Browser doesn't support persistence
                console.warn('Firebase persistence not supported in this browser');
            }
        }
    }

    addAuthStateListener(listener) {
        this.authStateListeners.push(listener);
    }

    notifyAuthStateChange(user) {
        this.authStateListeners.forEach(listener => listener(user));
    }

    async signUp(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await sendEmailVerification(userCredential.user);
            
            // Create user profile in Firestore
            await setDoc(doc(this.db, "users", userCredential.user.uid), {
                email: email,
                createdAt: new Date().toISOString(),
                chats: {},
                totalChats: 0
            });
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            await signOut(this.auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateUserProfile(displayName) {
        try {
            const user = this.auth.currentUser;
            await updateProfile(user, { displayName });
            await updateDoc(doc(this.db, "users", user.uid), {
                displayName: displayName
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendVerificationEmail() {
        try {
            const user = this.auth.currentUser;
            await sendEmailVerification(user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUserProfile() {
        try {
            const user = this.auth.currentUser;
            const userDoc = await getDoc(doc(this.db, "users", user.uid));
            return { success: true, data: userDoc.data() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveUserChats(chats) {
        if (!this.auth.currentUser) return { success: false, error: 'User not authenticated' };
        
        try {
            await updateDoc(doc(this.db, "users", this.auth.currentUser.uid), {
                chats: chats,
                totalChats: Object.keys(chats).length,
                lastUpdated: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error("Error saving chats:", error);
            return { success: false, error: error.message };
        }
    }

    async loadUserChats() {
        if (!this.auth.currentUser) return null;
        
        try {
            const userDoc = await getDoc(doc(this.db, "users", this.auth.currentUser.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(this.db, "users", this.auth.currentUser.uid), {
                    email: this.auth.currentUser.email,
                    createdAt: new Date().toISOString(),
                    chats: {},
                    totalChats: 0
                });
                return {};
            }
            return userDoc.data()?.chats || {};
        } catch (error) {
            console.error("Error loading chats:", error);
            return null;
        }
    }

    isUserSignedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

const firebaseManager = new FirebaseManager();
export default firebaseManager;
