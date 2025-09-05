import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create a server-side Supabase client with cookie-based session management.
 * 
 * @returns Promise resolving to configured Supabase client
 * 
 * @sideEffects
 * - Reads authentication cookies from Next.js request
 * - May write new cookies for session management
 * - Establishes server-side authentication context
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}