'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { getFriendlyErrorMessage } from '@/lib/error-handling';

/**
 * Authenticates a user with email and password credentials.
 * 
 * Creates a user session by validating credentials against Supabase Auth.
 * On success, sets authentication cookies that persist across requests.
 * 
 * @param data - Login credentials containing email and password
 * @returns Promise resolving to error object or null on success
 * 
 * @sideEffects
 * - Sets authentication cookies via Supabase client
 * - Establishes user session for subsequent requests
 * 
 * @failureModes
 * - Invalid credentials: Returns user-friendly error message
 * - Network errors: Returns generic error message
 * - Account not confirmed: Returns specific confirmation error
 */
export async function login(data: LoginFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: getFriendlyErrorMessage(error) };
  }

  // Success: no error
  return { error: null };
}

/**
 * Creates a new user account with email, password, and profile data.
 * 
 * Registers a new user in Supabase Auth and stores additional profile
 * information in user metadata. May require email confirmation depending
 * on Supabase configuration.
 * 
 * @param data - Registration data containing name, email, and password
 * @returns Promise resolving to error object or null on success
 * 
 * @sideEffects
 * - Creates new user account in Supabase Auth
 * - Stores user metadata (name) in user profile
 * - May send confirmation email if configured
 * 
 * @failureModes
 * - Email already exists: Returns specific error message
 * - Weak password: Returns password strength error
 * - Invalid email format: Returns validation error
 * - Network errors: Returns generic error message
 */
export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    return { error: getFriendlyErrorMessage(error) };
  }

  // Success: no error
  return { error: null };
}

/**
 * Terminates the current user session and clears authentication state.
 * 
 * Invalidates the user's authentication session by signing out from
 * Supabase Auth. Clears authentication cookies and session data.
 * 
 * @returns Promise resolving to error object or null on success
 * 
 * @sideEffects
 * - Clears authentication cookies
 * - Invalidates current session
 * - Removes user authentication state
 * 
 * @failureModes
 * - Network errors: Returns generic error message
 * - Session already invalid: Returns success (idempotent)
 */
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: getFriendlyErrorMessage(error) };
  }
  return { error: null };
}

/**
 * Retrieves the currently authenticated user from the server-side session.
 * 
 * Fetches user information from the server-side Supabase client using
 * the current request's authentication cookies. Returns null if no
 * authenticated user exists.
 * 
 * @returns Promise resolving to User object or null if not authenticated
 * 
 * @sideEffects
 * - Reads authentication cookies from request
 * - Validates session with Supabase Auth
 * 
 * @failureModes
 * - No authenticated user: Returns null
 * - Invalid session: Returns null
 * - Network errors: Returns null (graceful degradation)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Retrieves the current authentication session from the server-side context.
 * 
 * Fetches the complete session object including access tokens, refresh tokens,
 * and user information from the server-side Supabase client. Returns null
 * if no active session exists.
 * 
 * @returns Promise resolving to Session object or null if not authenticated
 * 
 * @sideEffects
 * - Reads authentication cookies from request
 * - Validates session tokens with Supabase Auth
 * 
 * @failureModes
 * - No active session: Returns null
 * - Expired session: Returns null
 * - Invalid tokens: Returns null (graceful degradation)
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
