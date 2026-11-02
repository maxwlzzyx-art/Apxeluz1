import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isAuthorizedAdminEmail, PRIMARY_ADMIN_EMAIL } from '../lib/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  adminToken: string;
  adminUsername: string;
  adminEmail: string;
  authError: string | null;
  signInWithGoogle: (preferRedirect?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  adminToken: '',
  adminUsername: '',
  adminEmail: '',
  authError: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Core administrative user handler
  const processUserAuth = async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setAdminToken('');
      setAdminUsername('');
      setAdminEmail('');
      setStatus('unauthenticated');
      localStorage.removeItem('apxeluz_admin_token');
      return;
    }

    const email = firebaseUser.email;
    if (!email) {
      await firebaseSignOut(auth);
      setUser(null);
      setAdminToken('');
      setStatus('unauthorized');
      setAuthError('No email was provided by Google authentication.');
      return;
    }

    // Secure Case-Insensitive Email Verification
    if (!isAuthorizedAdminEmail(email)) {
      console.warn(`Unauthorized login attempt from: ${email}`);
      await firebaseSignOut(auth);
      setUser(null);
      setAdminToken('');
      setStatus('unauthorized');
      setAuthError(
        `Access Denied: Google account "${email}" is not authorized for administrator access. Only authorized administrators (${PRIMARY_ADMIN_EMAIL}) are permitted.`
      );
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      setUser(firebaseUser);
      setAdminToken(idToken);
      setAdminUsername(firebaseUser.displayName || email);
      setAdminEmail(email);
      setAuthError(null);
      setStatus('authenticated');
      localStorage.setItem('apxeluz_admin_token', idToken);
    } catch (err: any) {
      console.error('Error obtaining Firebase ID token:', err);
      setAuthError('Failed to retrieve authentication token.');
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check redirect result first (mobile and redirect sign-in flows)
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result && result.user) {
          processUserAuth(result.user);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Redirect sign-in error:', err);
        setAuthError(err?.message || 'Redirect authentication failed.');
      });

    // Single source of truth listener for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      await processUserAuth(firebaseUser);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (preferRedirect = false) => {
    setAuthError(null);
    setStatus('loading');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    try {
      if (preferRedirect || isMobile) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      await processUserAuth(result.user);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      // Auto-fallback if popup was blocked
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          setAuthError(redirectErr?.message || 'Failed to complete redirect sign-in.');
          setStatus('unauthenticated');
        }
      } else if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(
          `Domain "${window.location.hostname}" is not authorized in Firebase Authentication. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`
        );
        setStatus('unauthenticated');
      } else if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setAuthError('Sign-in popup was closed before completing authentication.');
        setStatus('unauthenticated');
      } else {
        setAuthError(err?.message || 'Authentication failed. Please try again.');
        setStatus('unauthenticated');
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign-out warning:', e);
    }
    setUser(null);
    setAdminToken('');
    setAdminUsername('');
    setAdminEmail('');
    setStatus('unauthenticated');
    localStorage.removeItem('apxeluz_admin_token');
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        adminToken,
        adminUsername,
        adminEmail,
        authError,
        signInWithGoogle,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
