import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a browser-side Supabase client for client-side operations.
 * 
 * @returns Configured Supabase client for browser use
 * 
 * @sideEffects
 * - Reads authentication cookies from browser
 * - May write new cookies for session management
 * - Establishes client-side authentication context
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
