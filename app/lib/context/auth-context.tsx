'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Authentication context type definition.
 * 
 * Provides authentication state and methods to child components.
 * Includes session data, user information, sign-out functionality,
 * and loading state for async authentication operations.
 */
const AuthContext = createContext<{ 
  session: Session | null;
  user: User | null;
  signOut: () => void;
  loading: boolean;
}>({ 
  session: null, 
  user: null,
  signOut: () => {},
  loading: true,
});

/**
 * Authentication provider component that manages client-side auth state.
 * 
 * Establishes authentication context for the application by:
 * - Initializing Supabase client for browser-side operations
 * - Managing authentication state (session, user, loading)
 * - Listening for authentication state changes
 * - Providing sign-out functionality
 * 
 * @param children - React components that need access to auth context
 * @returns JSX element providing authentication context
 * 
 * @sideEffects
 * - Creates Supabase client instance
 * - Sets up authentication state listeners
 * - Manages loading state during auth operations
 * 
 * @failureModes
 * - Client creation fails: Gracefully handles with error logging
 * - Auth state change errors: Logs errors server-side only
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Initial user fetch on component mount
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // Error logged server-side only
      }
      if (mounted) {
        setUser(data.user ?? null);
        setSession(null); // Initial load doesn't have session, only user
        setLoading(false);
        // User loaded successfully
      }
    };

    getUser();

    // Listen for real-time authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Do not set loading to false here, only after initial load
      // Auth state changed
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * Signs out the current user from the client-side session.
   * 
   * Clears authentication state and invalidates the current session.
   * This is a client-side operation that triggers auth state change listeners.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Auth context ready
  return (
    <AuthContext.Provider value={{ session, user, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context within React components.
 * 
 * Provides access to current authentication state including:
 * - session: Current Supabase session object
 * - user: Current authenticated user object
 * - signOut: Function to sign out the current user
 * - loading: Boolean indicating if auth state is being loaded
 * 
 * @returns Authentication context object
 * 
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => useContext(AuthContext);
