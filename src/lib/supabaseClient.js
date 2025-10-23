import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client if environment variables are missing to prevent app crashes
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing - creating mock client for development')

    // Return a mock client that won't crash the app
    return {
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

  const fetchWithClerkAuth = async (url, options = {}) => {
    const headers = new Headers(options?.headers || {})

    // Attempt to attach Clerk session token for RLS policies
    try {
      if (typeof window !== 'undefined') {
        const clerk = window.Clerk
        const session = clerk?.session
        if (session) {
          const token = await session.getToken({ template: 'supabase' }).catch(() => null)
          if (token) {
            headers.set('Authorization', `Bearer ${token}`)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to attach Clerk token to Supabase request:', error)
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchWithClerkAuth
    }
  })
}

export const supabase = createSupabaseClient()

