import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, Lock, Mail, ShieldAlert, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/apiClient';

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

interface RateLimitInfo {
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil: number | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const { status, user, adminToken, adminUsername, authError, signInWithPassword, clearAuthError } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate Limiting & 30-min Lockout State (Requirement 3)
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts: 0,
    remainingAttempts: 3,
    lockedUntil: null,
  });
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Check rate limit on mount and when email changes
  const checkRateLimit = async (targetEmail: string) => {
    try {
      const res = await safeFetchJson<RateLimitInfo>(`/api/auth/login-check?email=${encodeURIComponent(targetEmail)}`);
      if (res.ok && res.data) {
        setRateLimit(res.data);
      }
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    checkRateLimit(email);
  }, [email]);

  // Active countdown timer when locked out
  useEffect(() => {
    if (!rateLimit.isLocked || !rateLimit.lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = rateLimit.lockedUntil! - now;
      if (diffMs <= 0) {
        setRateLimit((prev) => ({
          ...prev,
          isLocked: false,
          remainingMinutes: 0,
          remainingSeconds: 0,
          failedAttempts: 0,
          remainingAttempts: 3,
          lockedUntil: null,
        }));
        setLocalFeedback(null);
        clearInterval(interval);
      } else {
        const secs = Math.ceil(diffMs / 1000);
        const mins = Math.ceil(secs / 60);
        setRateLimit((prev) => ({
          ...prev,
          remainingMinutes: mins,
          remainingSeconds: secs,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimit.isLocked, rateLimit.lockedUntil]);

  // Transition to Admin Panel as soon as authenticated
  useEffect(() => {
    if (status === 'authenticated' && adminToken) {
      onLoginSuccess(adminToken, adminUsername || user?.email?.split('@')[0] || 'Administrator');
    }
  }, [status, adminToken, adminUsername, user, onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalFeedback(null);

    if (!email.trim() || !password) return;

    // Check lockout first
    if (rateLimit.isLocked) {
      setLocalFeedback(
        `Akses login admin diblokir sementara karena 3 kali kesalahan berturut-turut. Silakan tunggu ${rateLimit.remainingMinutes} menit lagi.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signInWithPassword(email, password);

      if (res.success) {
        // Record success in backend rate limiter
        await safeFetchJson('/api/auth/login-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), success: true }),
        });
        if (adminToken) {
          onLoginSuccess(adminToken, adminUsername || email.split('@')[0]);
        }
      } else {
        // Record failure in backend rate limiter (Requirement 3: backend-enforced 3-strike lockout for 30 min)
        const recordRes = await safeFetchJson<RateLimitInfo>('/api/auth/login-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), success: false, reason: res.error || 'Password mismatch' }),
        });

        if (recordRes.data) {
          setRateLimit(recordRes.data);
          if (recordRes.data.isLocked) {
            setLocalFeedback(
              `Akun dan IP Anda diblokir selama 30 menit karena 3 kali kesalahan login berturut-turut demi alasan keamanan.`
            );
          } else {
            setLocalFeedback(
              `Password atau email salah. Tersisa ${recordRes.data.remainingAttempts} kesempatan sebelum login dibekukan selama 30 menit.`
            );
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = status === 'loading' || isSubmitting;
  const isBlocked = rateLimit.isLocked;

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="p-7 sm:p-8 rounded-3xl liquid-glass border border-white/20 shadow-2xl space-y-6">
        {/* Return to Public Repository Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0A84FF]" />
          <span>Kembali ke Repositori Publik</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-[0_4px_20px_rgba(10,132,255,0.3)] transition-all ${
              isBlocked
                ? 'bg-rose-500/25 border-rose-500/40 text-rose-400'
                : 'bg-gradient-to-br from-[#0A84FF]/25 to-[#BF5AF2]/25 border-white/25 text-[#0A84FF]'
            }`}
          >
            {isBlocked ? <ShieldAlert className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
          </div>
          <h1 className="heading-font text-2xl font-bold text-white tracking-tight">
            Autentikasi Administrator
          </h1>
          <p className="text-xs text-slate-300">
            Masuk dengan kredensial administrator terverifikasi untuk mengelola konten, unduhan, dan game premium.
          </p>
        </div>

        {/* 30-Minute Lockout Alert (Requirement 3) */}
        {isBlocked && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs space-y-2 shadow-lg animate-pulse">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Akses Login Diblokir Sementara</span>
            </div>
            <p className="leading-relaxed">
              Percobaan login telah gagal 3 kali berturut-turut. Untuk menjaga keamanan repositori APXELUZ, percobaan login dibekukan selama 30 menit.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-sm font-semibold text-rose-300">
              <Clock className="w-4 h-4" />
              <span>Sisa Waktu Pembekuan: {formatCountdown(rateLimit.remainingSeconds)}</span>
            </div>
          </div>
        )}

        {/* Local Rate Warning or Error */}
        {!isBlocked && localFeedback && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{localFeedback}</span>
          </div>
        )}

        {/* Supabase Error Alert if not handled by local feedback */}
        {!isBlocked && !localFeedback && authError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{authError}</span>
          </div>
        )}

        {/* Success Alert if already authenticated */}
        {status === 'authenticated' && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Autentikasi berhasil. Membuka Panel Admin...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Alamat Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pindahserverezeer@gmail.com"
                required
                autoComplete="email"
                disabled={isLoading || isBlocked || status === 'authenticated'}
                className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white placeholder-slate-500 text-sm outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password input with show/hide button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              {!isBlocked && rateLimit.failedAttempts > 0 && (
                <span className="text-[10px] text-amber-400 font-medium">
                  {rateLimit.remainingAttempts} kesempatan tersisa
                </span>
              )}
            </div>
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
                disabled={isLoading || isBlocked || status === 'authenticated'}
                className="w-full pl-10 pr-11 py-3 rounded-2xl liquid-glass border border-white/15 focus:border-[#0A84FF] text-white placeholder-slate-500 text-sm outline-none transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={isBlocked}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isBlocked || status === 'authenticated' || !email.trim() || !password}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg ${
                isBlocked
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                  : 'liquid-glass-button text-white hover:shadow-[#0A84FF]/30'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : isBlocked ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-300" />
                  <span>Dibekukan ({formatCountdown(rateLimit.remainingSeconds)})</span>
                </>
              ) : (
                <span>Masuk ke Panel Admin</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
