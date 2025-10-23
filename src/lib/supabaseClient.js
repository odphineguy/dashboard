import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client if environment variables are missing to prevent app crashes
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing - creating mock client for development')

    // Return a mock client that won't crash the app
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: null }),
        refreshSession: () => Promise.resolve({ data: { session: null }, error: null })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
        upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) })
      }),
      rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    }
  }

  // Custom fetch that injects Clerk JWT for RLS policies
  const fetchWithClerkAuth = async (url, options = {}) => {
    const headers = new Headers(options?.headers || {})

    // Try to attach Clerk session token for RLS policies
    try {
      if (typeof window !== 'undefined' && window.Clerk?.session) {
        const token = await window.Clerk.session.getToken({ template: 'supabase' }).catch(() => null)
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
    } catch (error) {
      // Silently fail - request will proceed without Clerk auth
      console.debug('Could not attach Clerk token:', error.message)
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchWithClerkAuth
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token'
    }
  })
}

export const supabase = createSupabaseClient()

