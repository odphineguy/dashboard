import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qrkkcrkxpydosxwkdeve.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya2tjcmt4cHlkb3N4d2tkZXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MTM4MCwiZXhwIjoyMDcyNDU3MzgwfQ.6hVDIgFTcfAseFnWmEUxtetww2Fer6vO8K7yaMHyJGI'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
`

async function createTrigger() {
  try {
    console.log('Executing SQL to create profile trigger...')

    // Execute via RPC if available, otherwise use raw SQL
    const { data, error } = await supabase.rpc('exec', { sql })

    if (error) {
      console.error('Error:', error)

      // Try alternative: Execute via postgREST SQL endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      })

      const result = await response.json()
      console.log('Alternative method result:', result)
    } else {
      console.log('Success:', data)
    }

    // Check if trigger was created
    console.log('\nVerifying trigger creation...')
    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .like('tgname', '%profile%')

    if (!triggerError && triggers) {
      console.log('Profile triggers found:', triggers)
    }

  } catch (err) {
    console.error('Failed:', err.message)
  }
}

createTrigger()
