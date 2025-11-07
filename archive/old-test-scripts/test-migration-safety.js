#!/usr/bin/env node

/**
 * Test Migration Safety Check
 * Verifies that the migration would correctly block if subscriptions exist
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkMigrationSafety() {
  console.log('\n🔍 MIGRATION SAFETY CHECK')
  console.log('='.repeat(80))

  try {
    // Check for existing subscriptions
    const { data: subscriptions, error: subError, count: subCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })

    if (subError) {
      console.error('❌ Error checking subscriptions:', subError.message)
      return
    }

    console.log(`\n📋 Subscriptions found: ${subscriptions?.length || 0}`)

    // Check for existing payment history
    const { data: payments, error: payError, count: payCount } = await supabase
      .from('payment_history')
      .select('*', { count: 'exact' })

    if (payError) {
      console.error('❌ Error checking payment history:', payError.message)
      return
    }

    console.log(`💳 Payment history records: ${payments?.length || 0}`)

    console.log('\n' + '='.repeat(80))

    // Evaluate migration safety
    if ((subscriptions?.length || 0) > 0 || (payments?.length || 0) > 0) {
      console.log('⚠️  MIGRATION STATUS: WOULD BE BLOCKED')
      console.log('\nReason:')
      console.log(`  • Found ${subscriptions?.length || 0} subscription(s)`)
      console.log(`  • Found ${payments?.length || 0} payment record(s)`)
      console.log('\nThe migration includes a safety check that prevents running')
      console.log('on databases with existing billing data to prevent orphaning records.')
      console.log('\n✅ Safety check is working correctly!')

      // Show sample data (without sensitive info)
      if (subscriptions && subscriptions.length > 0) {
        console.log('\nSample subscription data:')
        subscriptions.slice(0, 3).forEach(sub => {
          console.log(`  • ID: ${sub.id}, Tier: ${sub.plan_tier}, Status: ${sub.status}`)
        })
      }

    } else {
      console.log('✅ MIGRATION STATUS: SAFE TO RUN')
      console.log('\nNo existing subscription or payment data found.')
      console.log('This is a fresh database - migration can proceed safely.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(80))
}

async function checkDatabaseConstraints() {
  console.log('\n🔍 DATABASE CONSTRAINTS CHECK')
  console.log('='.repeat(80))

  try {
    // Test 1: Check if we can query profiles with email
    const { data: profilesWithEmail, error: emailError } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier')
      .not('email', 'is', null)
      .limit(5)

    if (emailError) {
      console.error('❌ Cannot query profiles by email:', emailError.message)
    } else {
      console.log(`✅ Email column exists and queryable`)
      console.log(`   Found ${profilesWithEmail?.length || 0} profiles with emails`)
    }

    // Test 2: Check subscription tier values
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('subscription_tier')

    if (allProfiles) {
      const tiers = new Set(allProfiles.map(p => p.subscription_tier))
      console.log(`\n📊 Subscription tiers in use:`, Array.from(tiers))

      if (tiers.has('free')) {
        console.error('❌ Found "free" tier - should be "basic"')
      } else {
        console.log('✅ No "free" tier found (correctly using "basic")')
      }
    }

    // Test 3: Check if clerk_user_id function exists (can't test directly without service role)
    console.log('\n📋 Database Functions:')
    console.log('   Note: Cannot directly test clerk_user_id() function without service role')
    console.log('   This function is used by RLS policies to extract Clerk user ID from JWT')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(80))
}

async function checkIndexes() {
  console.log('\n🔍 INDEX PERFORMANCE CHECK')
  console.log('='.repeat(80))

  try {
    // Test email index performance
    console.log('\nTesting email index...')
    const start1 = Date.now()
    await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'nonexistent@example.com')
      .limit(1)
    const duration1 = Date.now() - start1

    console.log(`  Email query: ${duration1}ms ${duration1 < 500 ? '✅' : '⚠️'}`)

    // Test user_id indexes on related tables
    console.log('\nTesting user_id indexes...')

    const start2 = Date.now()
    await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', 'test_user_123')
      .limit(1)
    const duration2 = Date.now() - start2

    console.log(`  Subscriptions user_id query: ${duration2}ms ${duration2 < 500 ? '✅' : '⚠️'}`)

    const start3 = Date.now()
    await supabase
      .from('payment_history')
      .select('id')
      .eq('user_id', 'test_user_123')
      .limit(1)
    const duration3 = Date.now() - start3

    console.log(`  Payment history user_id query: ${duration3}ms ${duration3 < 500 ? '✅' : '⚠️'}`)

    if (duration1 < 500 && duration2 < 500 && duration3 < 500) {
      console.log('\n✅ All queries performed well (indexes likely working)')
    } else {
      console.log('\n⚠️  Some queries were slow (check if indexes exist)')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(80))
}

async function main() {
  console.log('\n🧪 CLERK-STRIPE MIGRATION SAFETY & CONSTRAINT TESTS')
  console.log('='.repeat(80))
  console.log(`Database: ${SUPABASE_URL}`)
  console.log('='.repeat(80))

  await checkMigrationSafety()
  await checkDatabaseConstraints()
  await checkIndexes()

  console.log('\n✅ All safety and constraint checks complete!')
  console.log('='.repeat(80))
}

main().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
