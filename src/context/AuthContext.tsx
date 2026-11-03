import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PRIMARY_ADMIN_EMAIL, isAuthorizedAdminEmail } from '../lib/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  adminToken: string;
  adminUsername: string;
  adminEmail: string;
  authError: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  session: null,
  adminToken: '',
  adminUsername: '',
  adminEmail: '',
  authError: null,
  signInWithPassword: async () => ({ success: false }),
  signOut: async () => {},
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Verifies if the authenticated user has an administrator role in Supabase.
 */
async function verifyAdminAuthorization(user: User): Promise<boolean> {
  if (!user || !user.id) return false;

  try {
    // 1. Query the admin_users table in Supabase
    const { data, error } = await supabase
      .from('admin_users')
      .select('role, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data && (data.role === 'admin' || data.role === 'superadmin')) {
      return true;
    }
  } catch (err) {
    console.warn('Could not query admin_users table (may be initializing):', err);
  }

  // 2. Verified admin email check fallback
  if (isAuthorizedAdminEmail(user.email)) {
    // Automatically link in admin_users table for seamless persistent role access
    try {
      await supabase
        .from('admin_users')
        .upsert(
          { user_id: user.id, email: user.email, role: 'admin' },
          { onConflict: 'user_id' }
        );
    } catch (e) {
      // Non-fatal
    }
    return true;
  }

  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize and preserve session across navigation and refreshes
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error || !data.session || !data.session.user) {
          setUser(null);
          setSession(null);
          setAdminToken('');
          setAdminUsername('');
          setAdminEmail('');
          setStatus('unauthenticated');
          return;
        }

        const currentSession = data.session;
        const currentUser = currentSession.user;
        const isAuthorized = await verifyAdminAuthorization(currentUser);

        if (!isMounted) return;

        if (isAuthorized) {
          setUser(currentUser);
          setSession(currentSession);
          setAdminToken(currentSession.access_token);
          setAdminUsername(
            currentUser.user_metadata?.name ||
              currentUser.email?.split('@')[0] ||
              'Administrator'
          );
          setAdminEmail(currentUser.email || '');
          setStatus('authenticated');
          setAuthError(null);
        } else {
          setUser(currentUser);
          setSession(currentSession);
          setAdminToken('');
          setAdminUsername('');
          setAdminEmail(currentUser.email || '');
          setStatus('unauthorized');
          setAuthError('Access Denied: Your account is not authorized for administrator access.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Session initialization error:', err);
        setStatus('unauthenticated');
      }
    };

    initializeSession();

    // Listen for auth state transitions (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession || !newSession.user) {
        setUser(null);
        setSession(null);
        setAdminToken('');
        setAdminUsername('');
        setAdminEmail('');
        setStatus('unauthenticated');
        return;
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        const isAuthorized = await verifyAdminAuthorization(newSession.user);
        if (!isMounted) return;

        if (isAuthorized) {
          setUser(newSession.user);
          setSession(newSession);
          setAdminToken(newSession.access_token);
          setAdminUsername(
            newSession.user.user_metadata?.name ||
              newSession.user.email?.split('@')[0] ||
              'Administrator'
          );
          setAdminEmail(newSession.user.email || '');
          setStatus('authenticated');
          setAuthError(null);
        } else {
          setUser(newSession.user);
          setSession(newSession);
          setAdminToken('');
          setAdminUsername('');
          setAdminEmail(newSession.user.email || '');
          setStatus('unauthorized');
          setAuthError('Access Denied: Your account is not authorized for administrator access.');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Supabase Email & Password Sign In
   */
  const signInWithPassword = async (email: string, password: string) => {
    setAuthError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      const msg = 'Please enter both email and password.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // Clear message without revealing if email exists
        const displayErr = 'Invalid email or password. Please verify your credentials and try again.';
        setAuthError(displayErr);
        return { success: false, error: displayErr };
      }

      if (!data.user || !data.session) {
        const msg = 'Authentication failed. Please try again.';
        setAuthError(msg);
        return { success: false, error: msg };
      }

      const isAuthorized = await verifyAdminAuthorization(data.user);

      if (!isAuthorized) {
        await supabase.auth.signOut();
        const accessDenied = `Access Denied: The account "${data.user.email}" is not authorized for administrator access. Only authorized administrators (${PRIMARY_ADMIN_EMAIL}) are permitted.`;
        setAuthError(accessDenied);
        setStatus('unauthorized');
        return { success: false, error: accessDenied };
      }

      setUser(data.user);
      setSession(data.session);
      setAdminToken(data.session.access_token);
      setAdminUsername(
        data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Administrator'
      );
      setAdminEmail(data.user.email || '');
      setStatus('authenticated');
      setAuthError(null);

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Authentication request failed. Please check your network connection.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Supabase Sign Out
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out notice:', err);
    }
    setUser(null);
    setSession(null);
    setAdminToken('');
    setAdminUsername('');
    setAdminEmail('');
    setStatus('unauthenticated');
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        session,
        adminToken,
        adminUsername,
        adminEmail,
        authError,
        signInWithPassword,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
