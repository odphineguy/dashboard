import { createClient } from '@supabase/supabase-js'

// ⚠️ SECURITY WARNING ⚠️
// This is a TEMPLATE file. Copy it to run_sql.js and fill in your values.
// NEVER commit the filled version to git!

// Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const supabaseUrl = 'YOUR_SUPABASE_URL'  // e.g., https://xxxxx.supabase.co
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'  // ⚠️ WARNING: This is the service_role key with FULL DATABASE ACCESS

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Your SQL query here
const sql = `
  -- Add your SQL here
  SELECT * FROM profiles LIMIT 1;
`

async function runSQL() {
  try {
    console.log('Executing SQL query...')
    
    // Execute raw SQL (requires service_role key)
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Error:', error)
      return
    }

    console.log('Success:', data)
  } catch (err) {
    console.error('Failed:', err.message)
  }
}

runSQL()

