#!/usr/bin/env node

/**
 * Cleanup Test Users Script
 * Deletes test users from Supabase profiles table
 * Run with: node cleanup-test-users.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to your .env file')
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function cleanupTestUsers() {
  console.log('🧹 Cleaning up test users...\n')

  try {
    // Delete profiles created in the last 2 days (testing period)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 2)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`📅 Deleting profiles created after: ${cutoffISO}`)

    const { data: deletedProfiles, error } = await supabase
      .from('profiles')
      .delete()
      .gte('created_at', cutoffISO)
      .select()

    if (error) {
      throw error
    }

    if (deletedProfiles && deletedProfiles.length > 0) {
      console.log(`\n✅ Deleted ${deletedProfiles.length} test profile(s):`)
      deletedProfiles.forEach(profile => {
        console.log(`   - ${profile.email || profile.id}`)
      })
    } else {
      console.log('\n✅ No test profiles found to delete')
    }

    console.log('\n🎉 Cleanup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Delete test users from Clerk dashboard manually')
    console.log('   2. Clear browser cache and cookies')
    console.log('   3. Test fresh signup at https://app.mealsaver.app/onboarding')

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
    process.exit(1)
  }
}

cleanupTestUsers()
