import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * useSupabase Hook
 *
 * Returns a Supabase client that automatically injects the Clerk session token
 * into every request, allowing RLS policies to identify the authenticated user.
 *
 * Usage:
 *   const supabase = useSupabase()
 *   const { data, error } = await supabase.from('profiles').select('*')
 */
export const useSupabase = () => {
  const { getToken } = useAuth()

  const supabase = useMemo(() => {
    // Create a single client instance per component
    // The fetch interceptor will always get the latest token when called
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get Clerk JWT token dynamically on each request (default template - works with native integration)
          const clerkToken = await getToken().catch(() => null)

          const headers = new Headers(options?.headers)
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`)
          }

          return fetch(url, {
            ...options,
            headers
          })
        }
      },
      auth: {
        // Clerk handles all auth, so disable Supabase auth features completely
        // This prevents GoTrueClient instances from being created
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storage: undefined, // Disable storage to prevent auth persistence
      }
    })
    // Don't depend on getToken - it's a function reference that might change
    // Instead, call it dynamically inside the fetch interceptor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - create client once per component mount

  return supabase
}
