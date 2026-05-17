import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both service account file and environment variables
 */
export const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Try to load service account from file
    const serviceAccountPath = path.join(
      __dirname,
      "../../config/firebase-service-account.json"
    );

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8")
      );

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase Admin initialized with service account file");
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Fallback to environment variables (for production)
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log("✅ Firebase Admin initialized with environment variables");
    } else {
      console.warn(
        "⚠️  Firebase Admin not initialized - OAuth login will not work"
      );
      console.warn(
        "   Please add firebase-service-account.json or set FIREBASE_PROJECT_ID"
      );
      return null;
    }

    return firebaseApp;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>} Decoded token
 */
export const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin not initialized");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
};

/**
 * Get user info from Firebase
 * @param {string} uid - Firebase user ID
 * @returns {Promise<admin.auth.UserRecord>} User record
 */
export const getFirebaseUser = async (uid) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin not initialized");
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    throw new Error(`Failed to get Firebase user: ${error.message}`);
  }
};

export default { initializeFirebase, verifyFirebaseToken, getFirebaseUser };
