import React, { useState } from 'react';
import { Lock, User, ArrowLeft, Shield, AlertCircle, CheckCircle2, Layers } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Success
      localStorage.setItem('apxeluz_admin_token', data.token);
      onLoginSuccess(data.token, data.user?.username || username);
    } catch (err) {
      console.error('Login error', err);
      setError('Network or server error during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="p-7 sm:p-8 rounded-3xl liquid-glass border border-white/20 shadow-2xl space-y-6">
        {/* Back Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
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
          <p className="text-xs text-slate-400">
            Secure authentication for APXELUZ Content Management System.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1.5">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl pl-10 pr-4 py-3 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.08] text-sm text-white rounded-2xl pl-10 pr-4 py-3 border border-white/15 focus:outline-none focus:border-[#0A84FF]/60 focus:bg-white/[0.12]"
              />
            </div>
          </div>

          {/* Initial credentials hint note for administrator */}
          <div className="p-3 rounded-2xl liquid-glass-subtle text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#0A84FF]" />
              <span>Initial Credentials (from requirements):</span>
            </div>
            <div>
              Username: <code className="text-white bg-white/10 px-1 rounded">axeluf</code> • Password: <code className="text-white bg-white/10 px-1 rounded">axeluf123</code>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl liquid-glass-button text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_24px_rgba(10,132,255,0.4)] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
