import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function sendTestInvitation() {
  try {
    console.log('🔍 Finding a household to send invitation from...\n')

    // Get the first household with an admin member
    const { data: households, error: householdError } = await supabase
      .from('household_members')
      .select(`
        household_id,
        user_id,
        role,
        households (
          id,
          name,
          created_by
        )
      `)
      .eq('role', 'admin')
      .limit(1)

    if (householdError || !households || households.length === 0) {
      console.log('⚠️  No households with admin members found.')

      // Get any household
      const { data: anyHousehold } = await supabase
        .from('households')
        .select('id, name, created_by')
        .limit(1)
        .single()

      if (!anyHousehold) {
        console.log('⚠️  No households exist. Getting any user to create invitation from...\n')

        // Get any user
        const { data: userData } = await supabase.auth.admin.listUsers()

        if (!userData || !userData.users || userData.users.length === 0) {
          console.error('❌ No users exist in the database.')
          console.log('\n💡 Please sign up for an account first through the app.')
          process.exit(1)
        }

        const anyUser = userData.users[0]
        console.log(`✅ Found user: ${anyUser.email}`)

        // Create a test household
        console.log('📝 Creating test household...\n')
        const { data: newHousehold, error: createError } = await supabase
          .from('households')
          .insert({
            name: 'Test Household',
            created_by: anyUser.id
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ Error creating household:', createError)
          process.exit(1)
        }

        console.log(`✅ Created household: "${newHousehold.name}"\n`)

        // Create invitation
        const { data: invitation, error: inviteError } = await supabase
          .from('household_invitations')
          .insert({
            household_id: newHousehold.id,
            email: 'support@pawrelief.app',
            invited_by: anyUser.id,
            status: 'pending'
          })
          .select()
          .single()

        if (inviteError) {
          console.error('❌ Error creating invitation:', inviteError)
          process.exit(1)
        }

        console.log(`✅ Invitation created with ID: ${invitation.id}\n`)
        console.log('📧 Sending invitation email...\n')

        // Call edge function to send email
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'send-household-invitation',
          {
            body: { invitationId: invitation.id }
          }
        )

        if (functionError) {
          console.error('❌ Error sending invitation email:', functionError)
          console.error('   Error details:', JSON.stringify(functionError, null, 2))
          process.exit(1)
        }

        console.log('✅ Invitation email sent successfully!')
        console.log('\n📬 Check inbox for: support@pawrelief.app')
        console.log('   (Don\'t forget to check spam folder!)')
        console.log('\n🔗 Invitation details:')
        console.log(`   Household: ${newHousehold.name}`)
        console.log(`   Invitation ID: ${invitation.id}`)
        console.log(`   Status: ${invitation.status}`)
        return
      }

      console.log(`✅ Found household: "${anyHousehold.name}"\n`)

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('household_invitations')
        .insert({
          household_id: anyHousehold.id,
          email: 'support@pawrelief.app',
          invited_by: anyHousehold.created_by,
          status: 'pending'
        })
        .select()
        .single()

      if (inviteError) {
        console.error('❌ Error creating invitation:', inviteError)
        process.exit(1)
      }

      console.log(`✅ Invitation created with ID: ${invitation.id}\n`)
      console.log('📧 Sending invitation email...\n')

      // Call edge function to send email
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'send-household-invitation',
        {
          body: { invitationId: invitation.id }
        }
      )

      if (functionError) {
        console.error('❌ Error sending invitation email:', functionError)
        process.exit(1)
      }

      console.log('✅ Invitation email sent successfully!')
      console.log('\n📬 Check inbox for: support@pawrelief.app')
      console.log('   (Don\'t forget to check spam folder!)')
      return
    }

    const household = households[0]
    console.log(`✅ Found household: "${household.households.name}"`)
    console.log(`   Admin: ${household.user_id}\n`)

    // Create invitation
    console.log('📝 Creating invitation for support@pawrelief.app...\n')

    const { data: invitation, error: inviteError } = await supabase
      .from('household_invitations')
      .insert({
        household_id: household.household_id,
        email: 'support@pawrelief.app',
        invited_by: household.user_id,
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      process.exit(1)
    }

    console.log(`✅ Invitation created with ID: ${invitation.id}\n`)
    console.log('📧 Sending invitation email...\n')

    // Call edge function to send email
    const { data: functionData, error: functionError } = await supabase.functions.invoke(
      'send-household-invitation',
      {
        body: { invitationId: invitation.id }
      }
    )

    if (functionError) {
      console.error('❌ Error sending invitation email:', functionError)
      console.error('   Error details:', JSON.stringify(functionError, null, 2))
      process.exit(1)
    }

    console.log('✅ Invitation email sent successfully!')
    console.log('\n📬 Check inbox for: support@pawrelief.app')
    console.log('   (Don\'t forget to check spam folder!)')
    console.log('\n🔗 Invitation details:')
    console.log(`   Household: ${household.households.name}`)
    console.log(`   Invitation ID: ${invitation.id}`)
    console.log(`   Status: ${invitation.status}`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

sendTestInvitation()
