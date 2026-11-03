import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const { status, user, adminToken, adminUsername, authError, signInWithPassword, clearAuthError } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically transition to Admin Panel as soon as authenticated
  useEffect(() => {
    if (status === 'authenticated' && adminToken) {
      onLoginSuccess(adminToken, adminUsername || user?.email?.split('@')[0] || 'Administrator');
    }
  }, [status, adminToken, adminUsername, user, onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    if (!email.trim() || !password) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signInWithPassword(email, password);
      if (res.success && adminToken) {
        onLoginSuccess(adminToken, adminUsername || email.split('@')[0]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = status === 'loading' || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="p-7 sm:p-8 rounded-3xl liquid-glass border border-white/20 shadow-2xl space-y-6">
        {/* Return to Public Repository Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0A84FF]" />
          <span>Return to Public Repository</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/25 border border-white/25 flex items-center justify-center text-[#0A84FF] shadow-[0_4px_20px_rgba(10,132,255,0.3)]">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="heading-font text-2xl font-bold text-white tracking-tight">
            Administrator Access
          </h1>
          <p className="text-xs text-slate-300">
            Sign in with your administrator credentials to manage APXELUZ downloads, games, apps, and repository content.
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{authError}</span>
          </div>
        )}

        {/* Success Alert if already authenticated */}
        {status === 'authenticated' && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Authenticated successfully. Entering Admin Panel...</span>
          </div>
        )}

        {/* Supabase Email & Password Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apxeluz.io"
                required
                autoComplete="email"
                disabled={isLoading || status === 'authenticated'}
                className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white placeholder-slate-500 text-sm outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password input with show/hide button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading || status === 'authenticated'}
                className="w-full pl-10 pr-11 py-3 rounded-2xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white placeholder-slate-500 text-sm outline-none transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || status === 'authenticated' || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl liquid-glass-button text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-[#0A84FF]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Admin Panel</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
