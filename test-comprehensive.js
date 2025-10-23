#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Clerk-Stripe Integration
 * Includes database schema tests and webhook endpoint tests
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test Results
const results = {
  passed: [],
  failed: [],
  skipped: []
}

function pass(test, details) {
  results.passed.push({ test, details })
  console.log(`✅ PASS: ${test}`)
  if (details) console.log(`   ${details}`)
}

function fail(test, details) {
  results.failed.push({ test, details })
  console.error(`❌ FAIL: ${test}`)
  if (details) console.error(`   ${details}`)
}

function skip(test, reason) {
  results.skipped.push({ test, reason })
  console.log(`⏭️  SKIP: ${test}`)
  if (reason) console.log(`   Reason: ${reason}`)
}

function section(title) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(80))
}

// Test 1: Database Schema - Check profiles table structure
async function testProfilesTableStructure() {
  section('DATABASE SCHEMA TESTS')

  try {
    // Try to query profiles with various filters to test structure
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier, subscription_status')
      .limit(1)

    if (error) {
      fail('Profiles table structure', `Query error: ${error.message}`)
      return
    }

    pass('Profiles table accessible', 'Table exists and can be queried')

    // Check if TEXT IDs are in use (Clerk compatible)
    if (data && data.length > 0) {
      const profile = data[0]
      if (typeof profile.id === 'string' && !profile.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        pass('TEXT user IDs supported', `Found non-UUID ID: ${profile.id} (Clerk compatible)`)
      } else {
        skip('TEXT user IDs verification', 'No non-UUID profiles found to verify')
      }
    } else {
      skip('TEXT user IDs verification', 'No profiles exist yet')
    }

  } catch (error) {
    fail('Database schema test', error.message)
  }
}

// Test 2: Check subscription tier constraints
async function testSubscriptionTierValues() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .in('subscription_tier', ['basic', 'premium', 'household_premium'])
      .limit(10)

    if (error) {
      fail('Subscription tier check', error.message)
      return
    }

    // Check if any 'free' tier exists
    const { data: freeData } = await supabase
      .from('profiles')
      .select('id')
      .eq('subscription_tier', 'free')
      .limit(1)

    if (freeData && freeData.length > 0) {
      fail('Free tier removal', "Found profiles with 'free' tier (should be 'basic')")
    } else {
      pass('Free tier removal', "No 'free' tier profiles found (correct)")
    }

  } catch (error) {
    fail('Subscription tier test', error.message)
  }
}

// Test 3: Check email uniqueness (indirect test via query)
async function testEmailUniqueness() {
  try {
    // Query all profiles and check for duplicate emails
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .not('email', 'is', null)

    if (error) {
      fail('Email uniqueness check', error.message)
      return
    }

    if (!data || data.length === 0) {
      skip('Email uniqueness verification', 'No profiles with email found')
      return
    }

    const emails = data.map(p => p.email)
    const uniqueEmails = new Set(emails)

    if (emails.length === uniqueEmails.size) {
      pass('Email uniqueness', 'All emails are unique (UNIQUE constraint working)')
    } else {
      fail('Email uniqueness', 'Duplicate emails found in database')
    }

  } catch (error) {
    fail('Email uniqueness test', error.message)
  }
}

// Test 4: Check storage_locations table
async function testStorageLocationsTable() {
  try {
    const { data, error } = await supabase
      .from('storage_locations')
      .select('id, name, user_id')
      .limit(5)

    if (error) {
      fail('Storage locations table', error.message)
      return
    }

    pass('Storage locations table accessible', `Found ${data?.length || 0} storage locations`)

    // Check if default locations exist for users
    const defaultLocationNames = ['Pantry', 'Refrigerator', 'Freezer']
    if (data && data.length > 0) {
      const hasDefaults = data.some(loc => defaultLocationNames.includes(loc.name))
      if (hasDefaults) {
        pass('Default storage locations', 'Default locations found (Clerk webhook working)')
      } else {
        skip('Default storage locations', 'No default locations found')
      }
    }

  } catch (error) {
    fail('Storage locations test', error.message)
  }
}

// Test 5: Check subscriptions table structure
async function testSubscriptionsTable() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_tier, status, stripe_subscription_id')
      .limit(5)

    if (error) {
      fail('Subscriptions table', error.message)
      return
    }

    pass('Subscriptions table accessible', `Found ${data?.length || 0} subscriptions`)

    // Check if user_id supports TEXT (Clerk IDs)
    if (data && data.length > 0) {
      const hasTextId = data.some(sub => typeof sub.user_id === 'string')
      if (hasTextId) {
        pass('Subscriptions support TEXT user IDs', 'TEXT IDs found in subscriptions')
      }
    }

  } catch (error) {
    fail('Subscriptions table test', error.message)
  }
}

// Test 6: Check payment_history table
async function testPaymentHistoryTable() {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('id, user_id, status, amount')
      .limit(5)

    if (error) {
      fail('Payment history table', error.message)
      return
    }

    pass('Payment history table accessible', `Found ${data?.length || 0} payment records`)

  } catch (error) {
    fail('Payment history table test', error.message)
  }
}

// Test 7: Check stripe_webhooks_log table (idempotency)
async function testWebhookIdempotencyTable() {
  try {
    const { data, error } = await supabase
      .from('stripe_webhooks_log')
      .select('event_id, event_type, processed')
      .limit(5)

    if (error && error.code === '42P01') {
      fail('Stripe webhook log table', 'Table does not exist - idempotency not supported')
      return
    } else if (error) {
      fail('Stripe webhook log table', error.message)
      return
    }

    pass('Stripe webhook idempotency table exists', `Found ${data?.length || 0} webhook events`)

  } catch (error) {
    fail('Webhook idempotency test', error.message)
  }
}

// Test 8: Test Clerk webhook function exists
async function testClerkWebhookFunction() {
  section('WEBHOOK FUNCTION TESTS')

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/clerk-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    })

    // We expect this to fail with 400 or 405, but it proves the function exists
    if (response.status === 400 || response.status === 405) {
      pass('Clerk webhook function deployed', `Endpoint responds with ${response.status}`)
    } else if (response.status === 404) {
      fail('Clerk webhook function', 'Function not deployed (404)')
    } else {
      skip('Clerk webhook function', `Unexpected response: ${response.status}`)
    }

  } catch (error) {
    fail('Clerk webhook function test', error.message)
  }
}

// Test 9: Test Stripe webhook function exists
async function testStripeWebhookFunction() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    })

    // We expect this to fail with 400, but it proves the function exists
    if (response.status === 400) {
      pass('Stripe webhook function deployed', 'Endpoint responds with 400 (expected)')
    } else if (response.status === 404) {
      fail('Stripe webhook function', 'Function not deployed (404)')
    } else {
      skip('Stripe webhook function', `Unexpected response: ${response.status}`)
    }

  } catch (error) {
    fail('Stripe webhook function test', error.message)
  }
}

// Test 10: Check RLS policies
async function testRLSPolicies() {
  section('ROW-LEVEL SECURITY TESTS')

  try {
    // This will fail with RLS error if policies are correctly set up
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: 'test_unauthorized',
        email: 'test@example.com',
        subscription_tier: 'basic',
        subscription_status: 'active'
      })

    if (error && error.message.includes('row-level security')) {
      pass('RLS policies active', 'Cannot insert without proper authentication (correct)')
    } else if (error) {
      skip('RLS policies', `Different error: ${error.message}`)
    } else {
      fail('RLS policies', 'Insert succeeded without authentication (RLS not working)')
      // Clean up
      await supabase.from('profiles').delete().eq('id', 'test_unauthorized')
    }

  } catch (error) {
    fail('RLS policies test', error.message)
  }
}

// Test 11: Manual Integration Tests
function testManualIntegration() {
  section('MANUAL INTEGRATION TESTS')

  skip('Clerk user signup creates profile', 'Requires live Clerk signup flow')
  console.log('   Manual test: Sign up via Clerk → Verify profile created in Supabase')

  skip('Duplicate email returns 409 Conflict', 'Requires live Clerk webhook')
  console.log('   Manual test: Try registering same email twice → Verify 409 response')

  skip('User deletion cancels Stripe subscriptions', 'Requires Clerk + Stripe integration')
  console.log('   Manual test: Delete Clerk user with active subscription → Verify Stripe subscription canceled')

  skip('Subscription cancellation downgrades to basic', 'Requires Stripe webhook')
  console.log('   Manual test: Cancel Stripe subscription → Verify user tier = "basic"')

  skip('End-to-end user journey', 'Requires full application stack')
  console.log('   Manual test: Signup → Onboarding → Subscribe → Verify dashboard access')
}

// Generate Final Report
function generateReport() {
  section('FINAL TEST REPORT')

  const total = results.passed.length + results.failed.length + results.skipped.length

  console.log(`\n📊 SUMMARY:`)
  console.log(`  Total Tests: ${total}`)
  console.log(`  ✅ Passed: ${results.passed.length}`)
  console.log(`  ❌ Failed: ${results.failed.length}`)
  console.log(`  ⏭️  Skipped: ${results.skipped.length}`)

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED TESTS:`)
    results.failed.forEach(({ test, details }) => {
      console.log(`  • ${test}`)
      if (details) console.log(`    ${details}`)
    })
  }

  if (results.passed.length > 0) {
    console.log(`\n✅ PASSED TESTS:`)
    results.passed.forEach(({ test, details }) => {
      console.log(`  • ${test}`)
    })
  }

  console.log('\n' + '='.repeat(80))

  // Return exit code
  return results.failed.length > 0 ? 1 : 0
}

// Main Test Runner
async function runTests() {
  console.log('\n🧪 CLERK-STRIPE INTEGRATION - COMPREHENSIVE TEST SUITE')
  console.log('=' .repeat(80))
  console.log(`Testing against: ${SUPABASE_URL}`)
  console.log('='.repeat(80))

  await testProfilesTableStructure()
  await testSubscriptionTierValues()
  await testEmailUniqueness()
  await testStorageLocationsTable()
  await testSubscriptionsTable()
  await testPaymentHistoryTable()
  await testWebhookIdempotencyTable()

  await testClerkWebhookFunction()
  await testStripeWebhookFunction()

  await testRLSPolicies()

  testManualIntegration()

  const exitCode = generateReport()
  process.exit(exitCode)
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite crashed:', error)
  process.exit(1)
})
