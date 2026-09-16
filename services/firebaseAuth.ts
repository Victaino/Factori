import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  sendPasswordResetEmail, 
  confirmPasswordReset, 
  verifyPasswordResetCode,
  Auth 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  try {
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
      return null;
    }

    if (!appInstance) {
      if (getApps().length === 0) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApp();
      }
    }

    if (!authInstance && appInstance) {
      authInstance = getAuth(appInstance);
    }

    return authInstance;
  } catch (error) {
    console.warn("Firebase Auth initialization skipped or failed:", error);
    return null;
  }
}

/**
 * Sends a password reset email via Firebase Authentication
 */
export async function sendFirebasePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: 'Firebase Auth is not configured' };
  }

  try {
    const actionCodeSettings = {
      url: `${window.location.origin}${window.location.pathname}?mode=resetPassword&email=${encodeURIComponent(email)}`,
      handleCodeInApp: true
    };

    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    return { success: true };
  } catch (err: any) {
    console.warn("Firebase sendPasswordResetEmail error:", err);
    return { success: false, error: err.message || 'Failed to send via Firebase' };
  }
}

/**
 * Verifies a Firebase OOB password reset code
 */
export async function verifyFirebaseReset(oobCode: string): Promise<{ success: boolean; email?: string; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: 'Firebase Auth is not configured' };
  }

  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { success: true, email };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid or expired reset code' };
  }
}

/**
 * Confirms a Firebase password reset with new password
 */
export async function confirmFirebaseReset(oobCode: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: 'Firebase Auth is not configured' };
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update Firebase password' };
  }
}
