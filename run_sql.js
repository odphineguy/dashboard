import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qrkkcrkxpydosxwkdeve.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya2tjcmt4cHlkb3N4d2tkZXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MTM4MCwiZXhwIjoyMDcyNDU3MzgwfQ.6hVDIgFTcfAseFnWmEUxtetww2Fer6vO8K7yaMHyJGI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTrigger() {
  // Check if trigger exists
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tgname as trigger_name,
        proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgname LIKE '%profile%';
    `
  })

  if (error) {
    console.error('Error checking trigger:', error)
  } else {
    console.log('Profile triggers found:', data)
  }

  // Check for users without profiles
  const { data: usersWithoutProfiles, error: error2 } = await supabase
    .from('auth.users')
    .select('id, email')
    .not('id', 'in', supabase.from('profiles').select('id'))

  if (!error2) {
    console.log('Users without profiles:', usersWithoutProfiles)
  }
}

checkTrigger()
