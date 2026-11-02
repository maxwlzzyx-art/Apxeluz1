import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAuthorizedAdminEmail } from '../lib/auth';
import { safeFetchJson } from '../utils/apiClient';

interface AdminLoginProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

// Authentic Google "G" logo SVG
const GoogleLogo = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Core administrative verification logic
  const handleAuthenticatedUser = async (user: User) => {
    if (!user.email) {
      await signOut(auth);
      setError('No email address was provided by Google Authentication.');
      setLoading(false);
      return;
    }

    // Role check: Only authorized Google account can access admin panel
    if (!isAuthorizedAdminEmail(user.email)) {
      await signOut(auth);
      setError(
        `Access Denied: Google account "${user.email}" is not authorized for administrator access. Please sign in with an authorized administrator account.`
      );
      setLoading(false);
      return;
    }

    try {
      // Obtain Firebase ID token for authentication
      const idToken = await user.getIdToken();

      // Attempt optional backend session sync (safely guarded against 404/non-JSON on Vercel)
      const apiRes = await safeFetchJson<{ token: string; success: boolean }>('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || user.email,
          photoURL: user.photoURL || '',
          idToken,
        }),
      });

      // Use backend token if available, or Firebase ID token on static deployments (Vercel)
      const sessionToken = apiRes.ok && apiRes.data?.token ? apiRes.data.token : idToken;
      localStorage.setItem('apxeluz_admin_token', sessionToken);

      setSuccessMsg(`Authenticated successfully! Accessing Admin Panel...`);
      setTimeout(() => {
        onLoginSuccess(sessionToken, user.displayName || user.email || 'Admin');
      }, 500);
    } catch (err: any) {
      console.error('Error establishing administrative session:', err);
      setError('Failed to establish administrative session. Please try again.');
      setLoading(false);
    }
  };

  // Check for redirect result on mount (for mobile browsers and redirect sign-in flow)
  useEffect(() => {
    let isMounted = true;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          setLoading(true);
          await handleAuthenticatedUser(result.user);
        }
      } catch (err: any) {
        console.error('Firebase redirect sign-in error:', err);
        if (isMounted) {
          handleAuthError(err);
        }
      }
    };

    checkRedirect();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format descriptive, user-friendly error messages
  const handleAuthError = (err: any) => {
    const code = err?.code;
    if (code === 'auth/unauthorized-domain') {
      setError(
        `Authentication domain error: "${window.location.hostname}" is not authorized in Firebase. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.`
      );
    } else if (code === 'auth/popup-blocked') {
      setError('Google Sign-In popup was blocked by your browser. Please allow popups for this site or try again.');
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      setError('Sign-in process was canceled before completion.');
    } else if (code === 'auth/network-request-failed') {
      setError('Network connection failed while communicating with Google. Please check your internet connection.');
    } else {
      setError(err?.message || 'Authentication failed. Please verify your connection and try again.');
    }
  };

  // Primary Google Sign-In with popup, with fallback to redirect on mobile or if popups are blocked
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      if (isMobile) {
        // Use redirect on mobile browsers for optimal compatibility
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      await handleAuthenticatedUser(result.user);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);

      // If popup was blocked or mobile-related error, fall back to redirect
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          handleAuthError(redirectErr);
        }
      } else {
        handleAuthError(err);
      }
      setLoading(false);
    }
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
            Sign in with an authorized Google account to manage APXELUZ downloads, games, apps, and repository content.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Sign-In Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-[0_4px_24px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_28px_rgba(255,255,255,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <GoogleLogo />
            <span>{loading ? 'Connecting with Google...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
