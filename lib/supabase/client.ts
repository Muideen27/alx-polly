import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-side Supabase client for client-side operations.
 * 
 * Establishes a Supabase client configured for browser-side operations
 * with automatic cookie handling for authentication state persistence.
 * Uses browser APIs for cookie management and local storage.
 * 
 * @returns Configured Supabase client for browser use
 * 
 * @sideEffects
 * - Reads authentication cookies from browser
 * - May write new cookies for session management
 * - Establishes client-side authentication context
 * 
 * @failureModes
 * - Missing environment variables: Throws runtime error
 * - Browser storage unavailable: Gracefully degraded functionality
 * - Network connectivity issues: Handled by Supabase client internally
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
