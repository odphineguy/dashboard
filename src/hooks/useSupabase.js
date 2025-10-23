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
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get Clerk JWT token with 'supabase' template
          const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)

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
        // Clerk handles all auth, so disable Supabase auth features
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  }, [getToken])

  return supabase
}
