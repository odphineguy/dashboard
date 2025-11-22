import { useAuth } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Singleton Supabase client instance to prevent multiple GoTrueClient warnings
let supabaseInstance = null

// Store the token getter function globally so the singleton can access it
let globalGetToken = null

/**
 * useSupabase Hook
 *
 * Returns a singleton Supabase client that automatically injects the Clerk session token
 * into every request, allowing RLS policies to identify the authenticated user.
 *
 * Usage:
 *   const supabase = useSupabase()
 *   const { data, error } = await supabase.from('profiles').select('*')
 */
export const useSupabase = () => {
  const { getToken } = useAuth()

  // Update the global token getter
  globalGetToken = getToken

  // Create singleton client on first use
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get Clerk session token for Supabase RLS compatibility
          // Try 'supabase' JWT template first, fallback to default token if template doesn't exist
          let clerkToken = null
          if (globalGetToken) {
            try {
              // Try with supabase template first
              clerkToken = await globalGetToken({ template: 'supabase' })
            } catch (err) {
              // If template doesn't exist, try without template (fallback)
              if (err?.message?.includes('No JWT template')) {
                console.warn('Supabase JWT template not found, using default token. Please configure JWT template in Clerk Dashboard.')
                try {
                  clerkToken = await globalGetToken()
                } catch (fallbackErr) {
                  console.error('Failed to get Clerk token:', fallbackErr)
                }
              } else {
                console.error('Failed to get Clerk token:', err)
              }
            }
          }

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
  }

  return supabaseInstance
}
