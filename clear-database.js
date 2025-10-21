// Clear user data from Supabase database
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearUserData() {
  console.log('Starting to clear user data...\n')

  try {
    // Clear in order to respect foreign key constraints
    const tables = [
      'pantry_events',
      'pantry_items',
      'household_members',
      'households',
      'storage_locations',
      'payment_history',
      'subscriptions',
      'profiles'
    ]

    for (const table of tables) {
      console.log(`Clearing ${table}...`)
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error(`Error clearing ${table}:`, error.message)
      } else {
        console.log(`✓ Cleared ${table}`)
      }
    }

    console.log('\n✅ All user data cleared successfully!')
    console.log('\n⚠️  Note: You still need to manually delete auth users from Supabase Dashboard:')
    console.log('   Go to: Authentication → Users → Select all → Delete')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

clearUserData()
