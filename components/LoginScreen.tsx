
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Lock, User, Loader2, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2, Copy, Check, ExternalLink, KeyRound } from 'lucide-react';
import { passwordResetService, ResetRequestResult } from '../services/passwordResetService';
import { ResetPasswordScreen } from './ResetPasswordScreen';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Reset States
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>('');
  const [resetResult, setResetResult] = useState<ResetRequestResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Active reset link params if launching directly from reset link
  const [activeResetParams, setActiveResetParams] = useState<{
    token?: string;
    oobCode?: string;
    email?: string;
  }>({});

  useEffect(() => {
    // Check if the current URL contains resetPassword mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'resetPassword') {
      setIsResetMode(true);
      setActiveResetParams({
        token: params.get('token') || undefined,
        oobCode: params.get('oobCode') || undefined,
        email: params.get('email') || undefined
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);
    if (!success) {
      setError('Invalid username or password');
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setIsSendingReset(true);

    const res = await passwordResetService.requestPasswordReset(resetIdentifier);
    setIsSendingReset(false);

    if (res.success) {
      setResetResult(res);
    } else {
      setResetError(res.message);
    }
  };

  const handleCopyLink = () => {
    if (resetResult?.resetLink) {
      navigator.clipboard.writeText(resetResult.resetLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleLaunchResetFromLink = () => {
    if (resetResult) {
      setActiveResetParams({
        token: resetResult.resetLink ? new URL(resetResult.resetLink).searchParams.get('token') || undefined : undefined,
        email: resetResult.email
      });
      setShowForgotPassword(false);
      setIsResetMode(true);
    }
  };

  // If user opened page via a password reset link or clicked "Open Reset Link"
  if (isResetMode) {
    return (
      <ResetPasswordScreen
        onBackToLogin={() => {
          setIsResetMode(false);
          setShowForgotPassword(false);
          setResetResult(null);
        }}
        initialToken={activeResetParams.token}
        initialOobCode={activeResetParams.oobCode}
        initialEmail={activeResetParams.email}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all">
        
        {/* Header Banner */}
        <div className="bg-primary-600 p-8 text-center relative">
          {showForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetResult(null);
                setResetError('');
              }}
              className="absolute left-4 top-4 text-white/80 hover:text-white flex items-center gap-1 text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          )}
          <div className="inline-flex p-3 bg-white/20 rounded-xl mb-3 text-white">
            {showForgotPassword ? <KeyRound size={32} /> : <LayoutDashboard size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-white">Factori</h1>
          <p className="text-blue-100 mt-1 text-sm">
            {showForgotPassword ? 'Account Recovery' : 'Production Management System'}
          </p>
        </div>

        <div className="p-8">
          {showForgotPassword ? (
            /* Forgot Password Form View */
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center">Reset Password</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center leading-relaxed">
                  Enter your registered email address or username to receive a secure password reset link.
                </p>
              </div>

              {resetResult ? (
                /* Success Feedback Card */
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>Password Reset Link Sent!</span>
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                      We have dispatched a password reset link to <strong className="font-semibold">{resetResult.email}</strong>. Please check your email inbox to complete your password reset.
                    </p>
                    {resetResult.sentViaFirebase && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Dispatched via Firebase Authentication
                      </p>
                    )}
                  </div>

                  {/* Reset Link Actions for Preview and Direct Access */}
                  {resetResult.resetLink && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        <span>Direct Reset Link:</span>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 text-[11px]"
                        >
                          {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          {copiedLink ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>

                      <div className="font-mono text-[10px] bg-white dark:bg-slate-800 p-2 rounded border truncate text-gray-500 dark:text-gray-400 select-all">
                        {resetResult.resetLink}
                      </div>

                      <button
                        type="button"
                        onClick={handleLaunchResetFromLink}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all mt-1"
                      >
                        <ExternalLink size={13} /> Open Reset Link Now
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetResult(null);
                        setResetIdentifier('');
                      }}
                      className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all"
                    >
                      Return to Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetResult(null);
                      }}
                      className="text-xs text-primary-600 hover:underline text-center"
                    >
                      Need to send to a different email?
                    </button>
                  </div>
                </div>
              ) : (
                /* Request Reset Link Form */
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Email Address or Username
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                      <input
                        type="text"
                        required
                        className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        placeholder="e.g. admin@factori.ng or admin"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                      />
                    </div>
                  </div>

                  {resetError && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                      {resetError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingReset || !resetIdentifier.trim()}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex justify-center items-center shadow-md disabled:opacity-50 text-sm gap-2"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Sending Reset Link...
                      </>
                    ) : (
                      'Send Password Reset Link'
                    )}
                  </button>

                  <div className="pt-3 border-t border-gray-100 dark:border-slate-700 text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Remember your password? <span className="text-primary-600 font-semibold hover:underline">Log in</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Main Login Form View */
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">Welcome Back</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full border rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetIdentifier(username || '');
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full border rounded-lg pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex justify-center items-center shadow-md"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Log In'}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 text-center">Quick Demo Login:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setUsername('admin'); setPassword('123admin456'); }}
                    className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors"
                  >
                    Admin (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('Loveday'); setPassword('123456'); }}
                    className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors"
                  >
                    Operator (Loveday)
                  </button>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-gray-400">
                <p>Factori Engine • Ready for Netlify & Cloud Run</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

