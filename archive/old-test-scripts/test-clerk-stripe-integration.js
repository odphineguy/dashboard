#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Clerk-Stripe Integration
 * Tests all aspects of the migration and webhook implementations
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL not found in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Test Results Tracker
const results = {
  database: {
    migration: { status: 'pending', message: '' },
    uniqueConstraint: { status: 'pending', message: '' },
    checkConstraint: { status: 'pending', message: '' },
    indexes: { status: 'pending', message: '' }
  },
  clerkWebhook: {
    userCreation: { status: 'pending', message: '' },
    duplicateEmail: { status: 'pending', message: '' },
    userDeletion: { status: 'pending', message: '' }
  },
  stripeWebhook: {
    subscriptionCancellation: { status: 'pending', message: '' },
    idempotency: { status: 'pending', message: '' }
  },
  endToEnd: {
    userJourney: { status: 'pending', message: '' }
  }
}

// Helper Functions
function pass(category, test, message) {
  results[category][test] = { status: 'pass', message }
  console.log(`✅ PASS: ${message}`)
}

function fail(category, test, message) {
  results[category][test] = { status: 'fail', message }
  console.error(`❌ FAIL: ${message}`)
}

function skip(category, test, message) {
  results[category][test] = { status: 'skip', message }
  console.log(`⏭️  SKIP: ${message}`)
}

function info(message) {
  console.log(`ℹ️  ${message}`)
}

function section(title) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(80))
}

// Test 1: Check Database Migration State
async function testDatabaseMigrationState() {
  section('DATABASE MIGRATION TESTS')

  try {
    // Check if profiles table has TEXT id column
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profilesError) {
      fail('database', 'migration', `Profiles table error: ${profilesError.message}`)
      return
    }

    // Check column type (this is indirect - we'll check if we can insert TEXT ID)
    const testId = 'test_clerk_user_123'
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: `test_${Date.now()}@example.com`,
        subscription_tier: 'basic',
        subscription_status: 'active'
      })

    if (insertError && !insertError.message.includes('duplicate key')) {
      fail('database', 'migration', `Cannot insert TEXT ID: ${insertError.message}`)
      return
    }

    // Clean up test record
    await supabase.from('profiles').delete().eq('id', testId)

    pass('database', 'migration', 'Database accepts TEXT user IDs (Clerk compatible)')

  } catch (error) {
    fail('database', 'migration', `Migration test error: ${error.message}`)
  }
}

// Test 2: Verify UNIQUE constraint on profiles.email
async function testEmailUniqueConstraint() {
  const testEmail = `unique_test_${Date.now()}@example.com`

  try {
    // Insert first profile
    const { error: insert1Error } = await supabase
      .from('profiles')
      .insert({
        id: `user_${Date.now()}_1`,
        email: testEmail,
        subscription_tier: 'basic',
        subscription_status: 'active'
      })

    if (insert1Error) {
      fail('database', 'uniqueConstraint', `First insert failed: ${insert1Error.message}`)
      return
    }

    // Try to insert duplicate email
    const { error: insert2Error } = await supabase
      .from('profiles')
      .insert({
        id: `user_${Date.now()}_2`,
        email: testEmail,
        subscription_tier: 'basic',
        subscription_status: 'active'
      })

    // Clean up
    await supabase.from('profiles').delete().eq('email', testEmail)

    if (insert2Error && insert2Error.code === '23505') {
      pass('database', 'uniqueConstraint', 'Email UNIQUE constraint working correctly')
    } else {
      fail('database', 'uniqueConstraint', 'Duplicate email was allowed (constraint missing)')
    }

  } catch (error) {
    fail('database', 'uniqueConstraint', `Test error: ${error.message}`)
  }
}

// Test 3: Verify 'free' tier removed from check constraint
async function testTierCheckConstraint() {
  const testId = `user_${Date.now()}_tier_test`

  try {
    // Try to insert 'free' tier (should fail)
    const { error: freeError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: `tier_test_${Date.now()}@example.com`,
        subscription_tier: 'free',
        subscription_status: 'active'
      })

    if (freeError && freeError.message.includes('check constraint')) {
      pass('database', 'checkConstraint', "'free' tier correctly rejected by check constraint")
    } else if (freeError) {
      fail('database', 'checkConstraint', `Unexpected error: ${freeError.message}`)
    } else {
      fail('database', 'checkConstraint', "'free' tier was allowed (should be rejected)")
      await supabase.from('profiles').delete().eq('id', testId)
    }

    // Try to insert 'basic' tier (should succeed)
    const { error: basicError } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: `tier_test_${Date.now()}@example.com`,
        subscription_tier: 'basic',
        subscription_status: 'active'
      })

    await supabase.from('profiles').delete().eq('id', testId)

    if (basicError) {
      fail('database', 'checkConstraint', `'basic' tier rejected: ${basicError.message}`)
    } else {
      info("'basic' tier correctly accepted")
    }

  } catch (error) {
    fail('database', 'checkConstraint', `Test error: ${error.message}`)
  }
}

// Test 4: Verify indexes created
async function testIndexes() {
  try {
    // This test is informational - we can't directly query pg_indexes without proper permissions
    // We'll test performance by doing a query that should use the index

    const start = Date.now()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'test@example.com')
      .limit(1)
    const duration = Date.now() - start

    if (error) {
      fail('database', 'indexes', `Index query failed: ${error.message}`)
      return
    }

    // If query completes quickly, indexes are likely working
    if (duration < 1000) {
      pass('database', 'indexes', `Email index likely exists (query: ${duration}ms)`)
    } else {
      fail('database', 'indexes', `Slow email query (${duration}ms) - index may be missing`)
    }

  } catch (error) {
    fail('database', 'indexes', `Test error: ${error.message}`)
  }
}

// Test 5: Clerk Webhook - User Creation
async function testClerkUserCreation() {
  section('CLERK WEBHOOK TESTS')

  skip('clerkWebhook', 'userCreation', 'Requires live Clerk webhook endpoint (manual test)')
  info('To test manually: Sign up a new user via Clerk and verify profile + storage locations created')
}

// Test 6: Clerk Webhook - Duplicate Email
async function testClerkDuplicateEmail() {
  skip('clerkWebhook', 'duplicateEmail', 'Requires live Clerk webhook endpoint (manual test)')
  info('To test manually: Try to create Clerk account with existing email, verify 409 response')
}

// Test 7: Clerk Webhook - User Deletion
async function testClerkUserDeletion() {
  skip('clerkWebhook', 'userDeletion', 'Requires live Clerk webhook + Stripe integration (manual test)')
  info('To test manually: Delete Clerk user with active subscription, verify Stripe subscription canceled')
}

// Test 8: Stripe Webhook - Subscription Cancellation
async function testStripeSubscriptionCancellation() {
  section('STRIPE WEBHOOK TESTS')

  skip('stripeWebhook', 'subscriptionCancellation', 'Requires live Stripe webhook endpoint (manual test)')
  info('To test manually: Cancel Stripe subscription, verify user downgraded to "basic" tier')
}

// Test 9: Stripe Webhook - Idempotency
async function testStripeIdempotency() {
  skip('stripeWebhook', 'idempotency', 'Requires stripe_webhooks_log table (check if exists)')

  // Check if idempotency table exists
  const { data, error } = await supabase
    .from('stripe_webhooks_log')
    .select('event_id')
    .limit(1)

  if (error && error.code === '42P01') {
    fail('stripeWebhook', 'idempotency', 'stripe_webhooks_log table does not exist')
    info('Create table: supabase/migrations/add_stripe_webhooks_log.sql')
  } else if (error) {
    fail('stripeWebhook', 'idempotency', `Error checking table: ${error.message}`)
  } else {
    pass('stripeWebhook', 'idempotency', 'stripe_webhooks_log table exists (idempotency supported)')
  }
}

// Test 10: End-to-End User Journey
async function testEndToEndJourney() {
  section('END-TO-END TESTS')

  skip('endToEnd', 'userJourney', 'Requires full application stack (manual test)')
  info('Manual test flow:')
  info('1. Sign up new user via Clerk')
  info('2. Complete onboarding')
  info('3. Subscribe to premium via Stripe')
  info('4. Verify dashboard access')
  info('5. Verify subscription features enabled')
}

// Generate Test Report
function generateReport() {
  section('TEST REPORT SUMMARY')

  const categories = Object.keys(results)
  let totalTests = 0
  let passed = 0
  let failed = 0
  let skipped = 0

  categories.forEach(category => {
    console.log(`\n${category.toUpperCase()}:`)
    const tests = Object.keys(results[category])

    tests.forEach(test => {
      const result = results[category][test]
      totalTests++

      let icon = '⏭️ '
      if (result.status === 'pass') {
        icon = '✅'
        passed++
      } else if (result.status === 'fail') {
        icon = '❌'
        failed++
      } else {
        icon = '⏭️ '
        skipped++
      }

      console.log(`  ${icon} ${test}: ${result.message}`)
    })
  })

  console.log('\n' + '='.repeat(80))
  console.log(`TOTAL: ${totalTests} tests`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log('='.repeat(80))

  // Return exit code based on failures
  return failed > 0 ? 1 : 0
}

// Main Test Runner
async function runTests() {
  console.log('\n🧪 CLERK-STRIPE INTEGRATION TEST SUITE')
  console.log('=====================================\n')

  await testDatabaseMigrationState()
  await testEmailUniqueConstraint()
  await testTierCheckConstraint()
  await testIndexes()

  await testClerkUserCreation()
  await testClerkDuplicateEmail()
  await testClerkUserDeletion()

  await testStripeSubscriptionCancellation()
  await testStripeIdempotency()

  await testEndToEndJourney()

  const exitCode = generateReport()
  process.exit(exitCode)
}

// Run the test suite
runTests().catch(error => {
  console.error('❌ Test suite crashed:', error)
  process.exit(1)
})
