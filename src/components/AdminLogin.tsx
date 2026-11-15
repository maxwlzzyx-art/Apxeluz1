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
    <div className="w-full max-w-md mx-auto py-8 sm:py-12 px-2 sm:px-6">
      <div className="p-6 sm:p-8 rounded-[28px] liquid-glass space-y-6">
        {/* Return to Public Repository Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl liquid-glass-subtle text-xs font-semibold text-[#355968] hover:text-[#0f2c38] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0284c7]" />
          <span>Kembali ke Repositori Publik</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
              isBlocked
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'liquid-glass-subtle text-[#0d9488]'
            }`}
          >
            {isBlocked ? <ShieldAlert className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
          </div>
          <h1 className="heading-font text-2xl font-extrabold text-[#0f2c38] text-3d tracking-tight">
            Autentikasi Administrator
          </h1>
          <p className="text-xs text-[#355968] leading-relaxed">
            Masuk dengan kredensial administrator terverifikasi untuk mengelola konten, unduhan, dan game premium.
          </p>
        </div>

        {/* 30-Minute Lockout Alert (Requirement 3) */}
        {isBlocked && (
          <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Akses Login Diblokir Sementara</span>
            </div>
            <p className="leading-relaxed">
              Percobaan login telah gagal 3 kali berturut-turut. Untuk menjaga keamanan repositori APXELUZ, percobaan login dibekukan selama 30 menit.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-sm font-semibold text-rose-700">
              <Clock className="w-4 h-4" />
              <span>Sisa Waktu Pembekuan: {formatCountdown(rateLimit.remainingSeconds)}</span>
            </div>
          </div>
        )}

        {/* Local Rate Warning or Error */}
        {!isBlocked && localFeedback && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span className="leading-relaxed">{localFeedback}</span>
          </div>
        )}

        {/* Supabase Error Alert if not handled by local feedback */}
        {!isBlocked && !localFeedback && authError && (
          <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{authError}</span>
          </div>
        )}

        {/* Success Alert if already authenticated */}
        {status === 'authenticated' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Autentikasi berhasil. Membuka Panel Admin...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0f2c38]">Alamat Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4a6f7d]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apxeluz.com"
                required
                autoComplete="email"
                disabled={isLoading || isBlocked || status === 'authenticated'}
                className="w-full min-h-[46px] pl-10 pr-4 py-3 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-sm outline-none transition-all disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
            </div>
          </div>

          {/* Password input with show/hide button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#0f2c38]">Password</label>
              {!isBlocked && rateLimit.failedAttempts > 0 && (
                <span className="text-[11px] text-amber-700 font-semibold">
                  {rateLimit.remainingAttempts} kesempatan tersisa
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4a6f7d]">
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
                className="w-full min-h-[46px] pl-10 pr-11 py-3 rounded-2xl bg-white/80 border border-white/90 focus:border-[#0d9488] text-[#0f2c38] placeholder-[#648896] text-sm outline-none transition-all disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(15,44,56,0.05)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={isBlocked}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#4a6f7d] hover:text-[#0f2c38] transition-colors cursor-pointer disabled:opacity-30"
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
              className={`w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer ${
                isBlocked
                  ? 'bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed'
                  : 'liquid-glass-button text-white'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : isBlocked ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
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
