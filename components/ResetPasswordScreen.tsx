import React, { useState, useEffect } from 'react';
import { passwordResetService } from '../services/passwordResetService';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

interface ResetPasswordScreenProps {
  onBackToLogin: () => void;
  initialToken?: string;
  initialOobCode?: string;
  initialEmail?: string;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onBackToLogin,
  initialToken,
  initialOobCode,
  initialEmail
}) => {
  const [token, setToken] = useState<string>('');
  const [oobCode, setOobCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = initialToken || params.get('token') || '';
    const urlOobCode = initialOobCode || params.get('oobCode') || '';
    const urlEmail = initialEmail || params.get('email') || '';

    setToken(urlToken);
    setOobCode(urlOobCode);
    if (urlEmail) {
      setEmail(urlEmail);
    }

    validateToken(urlToken, urlOobCode, urlEmail);
  }, [initialToken, initialOobCode, initialEmail]);

  const validateToken = async (tok: string, oob: string, eml: string) => {
    setIsValidating(true);
    setValidationError(null);

    // If neither token nor oobCode exists, error out
    if (!tok && !oob) {
      setValidationError('No reset code or token was found in this link. Please request a new password reset link.');
      setIsValidating(false);
      return;
    }

    const check = await passwordResetService.validateToken(tok, oob);
    if (!check.valid) {
      setValidationError(check.error || 'This password reset link is invalid or has expired.');
    } else if (check.email) {
      setEmail(check.email);
    } else if (eml) {
      setEmail(eml);
    }
    setIsValidating(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please verify and try again.');
      return;
    }

    if (!email) {
      setSubmitError('Unable to identify account email. Please request a new reset link.');
      return;
    }

    setIsSubmitting(true);

    const result = await passwordResetService.completePasswordReset({
      token,
      oobCode,
      email,
      newPassword
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      // Clean query parameters from URL without full reload
      if (typeof window !== 'undefined' && window.history) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } else {
      setSubmitError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 p-7 text-center text-white relative">
          <button
            type="button"
            onClick={onBackToLogin}
            className="absolute left-4 top-4 text-white/80 hover:text-white flex items-center gap-1 text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="inline-flex p-3 bg-white/15 rounded-xl mb-3 mt-2 shadow-inner">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">Choose New Password</h1>
          <p className="text-primary-100 text-xs mt-1">Factori Secure Authentication</p>
        </div>

        <div className="p-7">
          {isValidating ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="animate-spin text-primary-600 mx-auto" size={36} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Verifying password reset security link...
              </p>
            </div>
          ) : validationError ? (
            <div className="space-y-5 py-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Reset Link Expired or Invalid</p>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{validationError}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                Return to Login & Request New Link
              </button>
            </div>
          ) : isSuccess ? (
            <div className="space-y-5 py-4 text-center">
              <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <CheckCircle2 size={40} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Password Updated!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  Your password for <strong className="text-gray-800 dark:text-gray-200 font-semibold">{email}</strong> has been successfully updated. You can now log into Factori with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> Proceed to Log In
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {email && (
                <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Updating credentials for:</span>
                  <span className="font-semibold text-gray-900 dark:text-white break-all">{email}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    className="w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    className="w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="text-[11px] flex items-center gap-1.5">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Passwords match
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle size={13} /> Passwords do not match yet
                    </span>
                  )}
                </div>
              )}

              {submitError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900/50">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Updating Password...
                  </>
                ) : (
                  'Reset & Update Password'
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel and return to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
