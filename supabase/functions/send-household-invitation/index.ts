import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface InvitationData {
  invitationId: string
  email: string
  householdName: string
  inviterName: string
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { invitationId } = await req.json()

    if (!invitationId) {
      return new Response(JSON.stringify({ error: 'invitationId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get invitation details with household and inviter info
    const { data: invitation, error: invitationError } = await supabase
      .from('household_invitations')
      .select(`
        id,
        email,
        household_id,
        invited_by,
        households (
          name
        ),
        profiles!household_invitations_invited_by_fkey (
          full_name
        )
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      console.error('Error fetching invitation:', invitationError)
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send invitation email
    const emailSent = await sendInvitationEmail({
      invitationId: invitation.id,
      email: invitation.email,
      householdName: invitation.households?.name || 'Household',
      inviterName: invitation.profiles?.full_name || 'A user'
    })

    if (emailSent) {
      console.log(`Invitation email sent successfully to ${invitation.email}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation email sent successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      throw new Error('Failed to send email')
    }
  } catch (error) {
    console.error('Error in send-household-invitation function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function sendInvitationEmail(data: InvitationData): Promise<boolean> {
  const appUrl = 'https://mealsaver.app' // Update with your actual domain
  const acceptUrl = `${appUrl}/accept-invitation?token=${data.invitationId}`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Household Invitation - Meal Saver</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 3px solid #10b981; background-color: #ffffff;">
              <img src="https://qrkkcrkxpydosxwkdeve.supabase.co/storage/v1/object/public/public-assets/email.logo.png" alt="Meal Saver Logo" style="max-width: 180px; height: auto; margin: 0 auto; display: block;" />
              <p style="margin: 12px 0 0; color: #6b7280; font-size: 14px;">
                Reduce waste, save money
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                🏠 You've Been Invited!
              </h2>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                <strong>${data.inviterName}</strong> has invited you to join their household on Meal Saver
              </p>

              <!-- Household Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px; border: 2px solid #10b981; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f0fdf4;">
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Household Name
                    </div>
                    <div style="font-size: 20px; color: #111827; font-weight: 600;">
                      ${data.householdName}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Benefits Section -->
              <div style="margin: 0 0 32px; padding: 20px; background-color: #f9fafb; border-radius: 6px;">
                <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">
                  What you'll get:
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10b981; font-size: 18px; margin-right: 8px;">✓</span>
                      <span style="color: #4b5563; font-size: 14px;">Shared household inventory management</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10b981; font-size: 18px; margin-right: 8px;">✓</span>
                      <span style="color: #4b5563; font-size: 14px;">Real-time updates on expiring items</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10b981; font-size: 18px; margin-right: 8px;">✓</span>
                      <span style="color: #4b5563; font-size: 14px;">Collaborative meal planning</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10b981; font-size: 18px; margin-right: 8px;">✓</span>
                      <span style="color: #4b5563; font-size: 14px;">Reduce food waste together</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${acceptUrl}" style="display: inline-block; padding: 16px 48px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Or Copy Link -->
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                Or copy this link:<br>
                <a href="${acceptUrl}" style="color: #10b981; word-break: break-all;">${acceptUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                If you don't have a Meal Saver account yet, you'll be prompted to create one when you accept the invitation.
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This invitation was sent to ${data.email}. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
          <tr>
            <td style="text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">
                © 2025 Meal Saver. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const emailData = {
    from: 'Meal Saver <notifications@abemedia.online>',
    to: data.email,
    subject: `🏠 ${data.inviterName} invited you to join their household on Meal Saver`,
    html: htmlContent,
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Resend API error:', error)
    throw new Error(`Failed to send email: ${error}`)
  }

  const result = await response.json()
  console.log('Invitation email sent successfully:', result)
  return true
}
