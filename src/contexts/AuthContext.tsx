import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Owner email that always gets Pro access
const OWNER_EMAIL = 'edhemmer@gmail.com';

/**
 * Ensure owner profile is always Pro tier
 * Idempotent: safe to call on every sign-in
 */
async function ensureOwnerProStatus(user: User): Promise<void> {
  if (user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return; // Not the owner, do nothing
  }

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking owner profile:', fetchError);
      return;
    }

    if (existingProfile) {
      // Profile exists - ensure Pro tier if not already
      if (existingProfile.subscription_tier !== 'pro') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_tier: 'pro',
            subscription_started_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating owner to Pro:', updateError);
        } else {
          console.log('Owner profile normalized to Pro tier');
        }
      }
    }
    // Note: If no profile exists, the handle_new_user trigger will create one
    // with default 'free' tier, and this function will update it on next sign-in.
    // This is acceptable since the trigger runs first on initial signup.
  } catch (err) {
    console.error('Error in ensureOwnerProStatus:', err);
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getting initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle session expiration
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear any cached data
          setSession(null);
          setUser(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // After successful sign-in, ensure owner always has Pro status
    if (!error && data.user) {
      await ensureOwnerProStatus(data.user);
    }
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    // Force clear state even if there's an error
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
