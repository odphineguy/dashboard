#!/usr/bin/env node

/**
 * Test script to verify Clerk JWT integration with Supabase
 * Run this after configuring Clerk JWT template
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

async function testJWTIntegration() {
  console.log('🔍 Testing JWT Integration...')
  
  try {
    // Test 1: Check if requesting_user_id function exists
    console.log('\n1. Testing requesting_user_id function...')
    const { data: functionTest, error: functionError } = await createClient(supabaseUrl, supabaseAnonKey)
      .rpc('requesting_user_id')
    
    if (functionError) {
      console.log('❌ requesting_user_id function error:', functionError.message)
    } else {
      console.log('✅ requesting_user_id function exists')
      console.log('   Result:', functionTest)
    }

    // Test 2: Check JWT claims
    console.log('\n2. Testing JWT claims...')
    const { data: claimsTest, error: claimsError } = await createClient(supabaseUrl, supabaseAnonKey)
      .from('profiles')
      .select('id, full_name')
      .limit(1)
    
    if (claimsError) {
      console.log('❌ JWT claims error:', claimsError.message)
      console.log('   This is expected if JWT template is not configured')
    } else {
      console.log('✅ JWT claims working')
      console.log('   Data:', claimsTest)
    }

    // Test 3: Check clerk_user_id function
    console.log('\n3. Testing clerk_user_id function...')
    const { data: clerkTest, error: clerkError } = await createClient(supabaseUrl, supabaseAnonKey)
      .rpc('clerk_user_id')
    
    if (clerkError) {
      console.log('❌ clerk_user_id function error:', clerkError.message)
    } else {
      console.log('✅ clerk_user_id function exists')
      console.log('   Result:', clerkTest)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Instructions for manual testing
console.log(`
🚀 JWT Integration Test Script

Before running this script:

1. Configure Clerk JWT Template:
   - Go to https://dashboard.clerk.com
   - Navigate to JWT Templates
   - Create template named "supabase" with claims:
     {
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "email_verified": true
     }

2. Configure Supabase:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set JWT URL: https://[your-clerk-domain]/jwks
   - Leave JWT Secret empty

3. Test in browser:
   - Sign in to your app
   - Open browser console
   - Run: await supabase.from('profiles').select('*')
   - Should return your profile data

`)

testJWTIntegration()
