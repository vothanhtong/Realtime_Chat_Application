import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase config is valid (not placeholder values)
const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_firebase_api_key" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your_project_id";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let githubProvider: GithubAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    githubProvider = new GithubAuthProvider();
    githubProvider.setCustomParameters({ allow_signup: "true" });
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    app = null;
    auth = null;
  }
} else {
  console.warn("Firebase not configured — OAuth login disabled. Fill in VITE_FIREBASE_* in .env to enable.");
}

export { auth, googleProvider, githubProvider };
export const isFirebaseReady = !!auth;
export default app;
