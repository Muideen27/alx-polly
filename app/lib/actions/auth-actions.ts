'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { getFriendlyErrorMessage } from '@/lib/error-handling';

/**
 * Authenticate a user with email and password credentials.
 * 
 * @param data - Login credentials containing email and password
 * @returns Promise resolving to { error: string | null }
 * 
 * @sideEffects
 * - Sets authentication cookies via Supabase client
 * - Establishes user session for subsequent requests
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
 * Register a new user account with email, password, and profile data.
 * 
 * @param data - Registration data containing name, email, and password
 * @returns Promise resolving to { error: string | null }
 * 
 * @sideEffects
 * - Creates new user account in Supabase Auth
 * - Stores user metadata (name) in user profile
 * - May send confirmation email if configured
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
 * Terminate the current user session and clear authentication state.
 * 
 * @returns Promise resolving to { error: string | null }
 * 
 * @sideEffects
 * - Clears authentication cookies
 * - Invalidates current session
 * - Removes user authentication state
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
 * Get the currently authenticated user from the server-side session.
 * 
 * @returns Promise resolving to User object or null if not authenticated
 * 
 * @sideEffects
 * - Reads authentication cookies from request
 * - Validates session with Supabase Auth
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get the current authentication session from the server-side context.
 * 
 * @returns Promise resolving to Session object or null if not authenticated
 * 
 * @sideEffects
 * - Reads authentication cookies from request
 * - Validates session tokens with Supabase Auth
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
