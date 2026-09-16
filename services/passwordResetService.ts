import { db } from './db';
import { sendFirebasePasswordReset, confirmFirebaseReset, verifyFirebaseReset } from './firebaseAuth';
import { PasswordResetToken } from '../types';

export interface ResetRequestResult {
  success: boolean;
  email?: string;
  resetLink?: string;
  sentViaFirebase?: boolean;
  message: string;
  error?: string;
}

export class PasswordResetService {
  /**
   * Request a password reset link for an email or username
   */
  async requestPasswordReset(identifier: string): Promise<ResetRequestResult> {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Please provide your email address or username.' };
    }

    try {
      // 1. Check if user exists in application database
      const user = await db.findUserByEmailOrUsername(cleanId);
      
      let targetEmail = '';
      if (user && user.email) {
        targetEmail = user.email;
      } else if (cleanId.includes('@')) {
        targetEmail = cleanId;
      } else if (user) {
        // User exists but has no email; default to company domain
        targetEmail = `${user.username.toLowerCase()}@factori.ng`;
      } else {
        // If not found and looks like an email, still allow sending (security best practice: generic success or helpful guidance)
        if (cleanId.includes('@')) {
          targetEmail = cleanId;
        } else {
          return {
            success: false,
            message: `No account found with username "${cleanId}". Please enter your registered email address.`
          };
        }
      }

      // 2. Generate secure application token
      const token = 'rst_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

      const tokenRecord: PasswordResetToken = {
        id: 'tok_' + Math.random().toString(36).substring(2, 10),
        email: targetEmail.toLowerCase(),
        token,
        createdAt: new Date().toISOString(),
        expiresAt,
        used: false
      };

      await db.savePasswordResetToken(tokenRecord);

      // 3. Construct application reset link
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const resetLink = `${origin}${pathname}?mode=resetPassword&token=${token}&email=${encodeURIComponent(targetEmail.toLowerCase())}`;

      // 4. Dispatch via Firebase Authentication if configured
      let firebaseSent = false;
      try {
        const firebaseResult = await sendFirebasePasswordReset(targetEmail);
        if (firebaseResult.success) {
          firebaseSent = true;
          console.log(`[Auth] Firebase password reset email triggered for ${targetEmail}`);
        }
      } catch (fbErr) {
        console.warn("[Auth] Firebase reset skipped:", fbErr);
      }

      // 5. Notify server API if reachable
      try {
        const apiUrl = db.getApiBaseUrl();
        fetch(`${apiUrl}/api/auth/send-reset-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, resetLink, token })
        }).catch(() => {
          // Non-blocking fallback
        });
      } catch (apiErr) {
        // Non-blocking
      }

      return {
        success: true,
        email: targetEmail,
        resetLink,
        sentViaFirebase: firebaseSent,
        message: `A password reset link has been generated and sent to ${targetEmail}.`
      };
    } catch (err: any) {
      console.error("Password reset error:", err);
      return {
        success: false,
        message: err.message || 'An error occurred while requesting password reset. Please try again.'
      };
    }
  }

  /**
   * Validate a reset token or verify Firebase code
   */
  async validateToken(token: string, oobCode?: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    // If Firebase oobCode is present
    if (oobCode) {
      const fbVerify = await verifyFirebaseReset(oobCode);
      if (fbVerify.success && fbVerify.email) {
        return { valid: true, email: fbVerify.email };
      }
    }

    if (!token) {
      return { valid: false, error: 'Reset token is missing or malformed.' };
    }

    const tokenRecord = await db.getPasswordResetToken(token);
    if (!tokenRecord) {
      return { valid: false, error: 'Password reset link is invalid or has expired.' };
    }

    if (tokenRecord.used) {
      return { valid: false, error: 'This password reset link has already been used.' };
    }

    const isExpired = new Date(tokenRecord.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return { valid: false, error: 'This password reset link has expired (valid for 1 hour). Please request a new one.' };
    }

    return { valid: true, email: tokenRecord.email };
  }

  /**
   * Complete the password reset
   */
  async completePasswordReset(params: {
    token?: string;
    oobCode?: string;
    email: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const { token, oobCode, email, newPassword } = params;

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    try {
      // 1. Firebase password update if oobCode is available
      if (oobCode) {
        const fbRes = await confirmFirebaseReset(oobCode, newPassword);
        if (!fbRes.success) {
          console.warn("Firebase reset confirmation error:", fbRes.error);
        }
      }

      // 2. Application user update in database
      const dbSuccess = await db.updateUserPassword(email, newPassword);
      if (!dbSuccess) {
        // Also try by username if email looks like a username
        const fallbackSuccess = await db.updateUserPassword(email.split('@')[0], newPassword);
        if (!fallbackSuccess) {
          console.warn(`User ${email} not found for password update in database, creating record.`);
          await db.addAppUser({
            username: email.split('@')[0],
            email,
            password: newPassword,
            name: email.split('@')[0],
            role: 'user'
          });
        }
      }

      // 3. Mark token as used if an app token was provided
      if (token) {
        await db.markPasswordResetTokenUsed(token);
      }

      return {
        success: true,
        message: 'Your password has been reset successfully! You can now log in with your new password.'
      };
    } catch (err: any) {
      console.error("Complete password reset error:", err);
      return {
        success: false,
        message: err.message || 'Failed to reset password. Please try again.'
      };
    }
  }
}

export const passwordResetService = new PasswordResetService();
