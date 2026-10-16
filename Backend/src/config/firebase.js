// firebase-admin v14: bản gốc (default export) không còn export `credential`
// và `auth` ở root — bắt buộc import từ subpath "firebase-admin/app" và
// "firebase-admin/auth". Dùng default export sẽ nhận undefined khi gọi
// admin.credential.cert(...) → OAuth luôn fail lúc init.
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
    // Method 1: Try to load service account from file (local dev)
    const serviceAccountPath = path.join(
      __dirname,
      "../../config/firebase-service-account.json"
    );

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf8")
      );

      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });

      console.log("✅ Firebase Admin initialized with service account file");
      return firebaseApp;
    }

    // Method 2: Try to decode from base64 environment variable (for Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        'base64'
      ).toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });

      console.log("✅ Firebase Admin initialized from base64 env var");
      return firebaseApp;
    }

    // Method 3: Fallback to application default credentials (for Google Cloud)
    if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log("✅ Firebase Admin initialized with application default credentials");
      return firebaseApp;
    }

    // No method available
    console.warn(
      "⚠️  Firebase Admin not initialized - OAuth login will not work"
    );
    console.warn(
      "   Please use one of these methods:"
    );
    console.warn(
      "   1. Add firebase-service-account.json file"
    );
    console.warn(
      "   2. Set FIREBASE_SERVICE_ACCOUNT_BASE64 env var"
    );
    console.warn(
      "   3. Set FIREBASE_PROJECT_ID with application default credentials"
    );
    return null;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    return null;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<import("firebase-admin/auth").DecodedIdToken>} Decoded token
 */
export const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin not initialized");
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
};

/**
 * Get user info from Firebase
 * @param {string} uid - Firebase user ID
 * @returns {Promise<import("firebase-admin/auth").UserRecord>} User record
 */
export const getFirebaseUser = async (uid) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin not initialized");
  }

  try {
    const userRecord = await getAuth().getUser(uid);
    return userRecord;
  } catch (error) {
    throw new Error(`Failed to get Firebase user: ${error.message}`);
  }
};

export default { initializeFirebase, verifyFirebaseToken, getFirebaseUser };
