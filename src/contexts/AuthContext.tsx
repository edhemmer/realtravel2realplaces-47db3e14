import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfig } from '@/integrations/supabase/client';
import { authCallbackUrl } from '@/lib/auth/authRedirects';
import { clearAllOfflineData } from '@/lib/offlineTripCache';

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: AuthStatus;
  refreshSession: () => Promise<Session | null>;
  signUp: (data: SignUpData) => Promise<{
    error: AuthError | null;
    existingAccount?: boolean;
    session?: Session | null;
  }>;
  signIn: (email: string, password: string) => Promise<{
    error: AuthError | null;
    session?: Session | null;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const missingConfigMessage = `Supabase is not configured. Missing ${supabaseConfig.missingKeys.join(', ')}.`;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function profileNameData(firstName: string, lastName: string) {
  const first = firstName.trim();
  const last = lastName.trim();
  return {
    first_name: first,
    last_name: last,
    display_name: `${first} ${last}`.trim(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);
  const sessionTransitionRef = useRef(0);

  /**
   * Apply an auth session without allowing local offline data to cross an
   * authenticated account boundary. Clearing happens before the new session
   * becomes readable by the app.
   */
  const applySession = useCallback(async (nextSession: Session | null) => {
    const transitionId = ++sessionTransitionRef.current;
    const previousUserId = previousUserIdRef.current;
    const nextUserId = nextSession?.user?.id ?? null;
    const crossesAccountBoundary = Boolean(previousUserId && previousUserId !== nextUserId);

    if (crossesAccountBoundary) {
      setLoading(true);
      try {
        await clearAllOfflineData();
      } catch (error) {
        // Privacy wins over availability. Do not expose a new authenticated
        // session until the old account's local cache has been cleared.
        // Keep the previous user id so the next auth transition retries the
        // clear instead of accidentally treating the device as clean.
        console.error('Unable to clear offline data during auth transition:', error);
        if (transitionId === sessionTransitionRef.current) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
    }

    // Ignore stale async transitions if a newer auth event arrived first.
    if (transitionId !== sessionTransitionRef.current) return;

    previousUserIdRef.current = nextUserId;
    setSession(nextSession);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error refreshing auth session:', error);
      await applySession(null);
      return null;
    }

    await applySession(data.session ?? null);
    return data.session ?? null;
  }, [applySession]);

  useEffect(() => {
    if (!supabaseConfig.hasConfig) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      void applySession(nextSession ?? null);

      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        window.location.assign('/reset-password');
      }
    });

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error loading auth session:', error);
        await applySession(null);
        return;
      }

      await applySession(data.session ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signUp = useCallback(async ({ email, password, firstName, lastName }: SignUpData) => {
    if (!supabaseConfig.hasConfig) {
      return { error: new Error(missingConfigMessage) as AuthError };
    }

    const normalizedEmail = normalizeEmail(email);
    const nameData = profileNameData(firstName, lastName);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
        data: nameData,
      },
    });

    const existingAccount =
      !error &&
      !!data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0;

    if (!error && data.session) {
      await applySession(data.session);
    }

    if (!error && data.user && !existingAccount) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: nameData.first_name,
          last_name: nameData.last_name,
        } as Record<string, unknown>)
        .eq('user_id', data.user.id);

      if (profileError) {
        console.error('Error updating profile after signup:', profileError);
      }
    }

    return { error, existingAccount, session: data.session ?? null };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfig.hasConfig) {
      return { error: new Error(missingConfigMessage) as AuthError, session: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (!error && data.session) {
      await applySession(data.session);
    }

    return { error, session: data.session ?? null };
  }, [applySession]);

  const signOut = useCallback(async () => {
    if (!supabaseConfig.hasConfig) {
      await applySession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    await applySession(null);
  }, [applySession]);

  const value = useMemo<AuthContextType>(() => {
    const user = session?.user ?? null;
    const status: AuthStatus = loading ? 'loading' : user ? 'authenticated' : 'anonymous';

    return {
      user,
      session,
      loading,
      status,
      refreshSession,
      signUp,
      signIn,
      signOut,
    };
  }, [loading, refreshSession, session, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
