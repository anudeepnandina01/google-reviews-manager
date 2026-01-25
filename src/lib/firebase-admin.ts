import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App | undefined;
let auth: Auth | undefined;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if we have service account credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    try {
      const credentials = JSON.parse(serviceAccount);
      return initializeApp({
        credential: cert(credentials),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } catch (error) {
      console.error("Failed to parse Firebase service account:", error);
    }
  }

  // Fallback: Initialize without credentials (works in Google Cloud environments)
  // For local development, we'll verify tokens using the client-side approach
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAdminAuth(): Auth {
  if (!app) {
    app = initializeFirebaseAdmin();
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
}

/**
 * Verify a Firebase ID token
 * Returns the decoded token if valid, null if invalid
 */
export async function verifyFirebaseToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
} | null> {
  try {
    // Try to verify with Firebase Admin SDK
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const auth = getFirebaseAdminAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    }

    // Fallback: Decode JWT without full verification (for development)
    // In production, always use Firebase Admin SDK with service account
    const tokenParts = idToken.split(".");
    if (tokenParts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(tokenParts[1], "base64").toString("utf-8")
    );

    // Basic validation
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }

    return {
      uid: payload.sub || payload.user_id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
