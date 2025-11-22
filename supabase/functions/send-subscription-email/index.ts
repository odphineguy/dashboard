import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface SubscriptionEmailData {
  user_id: string
  email: string
  full_name: string
  subscription_tier: string
  subscription_status: string
  billing_interval: string
  current_period_end: string
  amount: number
  currency: string
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
    const { user_id, subscription_tier, subscription_status, billing_interval, current_period_end, amount, currency } = await req.json()

    if (!user_id || !subscription_tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single()

    if (profileError) {
      throw profileError
    }

    // Get user auth data
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id)

    if (userError) {
      throw userError
    }

    const emailData: SubscriptionEmailData = {
      user_id,
      email: user.email!,
      full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
      subscription_tier,
      subscription_status,
      billing_interval: billing_interval || 'month',
      current_period_end: current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: amount || 1499, // Default to $14.99 in cents
      currency: currency || 'usd'
    }

    // Send subscription confirmation email
    const emailSent = await sendSubscriptionEmail(emailData)

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: 'Subscription email sent successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-subscription-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

async function sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
  const subject = getSubscriptionEmailSubject(data.subscription_tier, data.subscription_status)
  const htmlContent = generateSubscriptionEmailHTML(data)

  const emailData = {
    from: 'Meal Saver <notifications@abemedia.online>',
    to: data.email,
    subject: subject,
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
  console.log('Subscription email sent successfully:', result)
  return true
}

function getSubscriptionEmailSubject(tier: string, status: string): string {
  if (status === 'active') {
    switch (tier) {
      case 'premium':
        return '🎉 Welcome to Meal Saver Premium!'
      case 'household_premium':
        return '🎉 Welcome to Meal Saver Household Premium!'
      default:
        return '🎉 Welcome to Meal Saver!'
    }
  } else if (status === 'canceled') {
    return 'Subscription Canceled - Meal Saver'
  } else {
    return 'Meal Saver Subscription Update'
  }
}

function generateSubscriptionEmailHTML(data: SubscriptionEmailData): string {
  const userName = data.full_name || 'there'
  const appUrl = 'https://mealsaver.app'
  const amount = (data.amount / 100).toFixed(2)
  const nextBilling = new Date(data.current_period_end).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'Premium'
      case 'household_premium':
        return 'Household Premium'
      default:
        return 'Basic'
    }
  }

  const getTierFeatures = (tier: string) => {
    switch (tier) {
      case 'premium':
        return [
          'Unlimited pantry items',
          'Unlimited AI scanner',
          'Advanced recipe generation',
          'Up to 3 household members',
          'Advanced analytics',
          'Priority support'
        ]
      case 'household_premium':
        return [
          'Everything in Premium',
          'Unlimited household members',
          'Unlimited storage locations',
          'Shared household inventory',
          'Family meal planning',
          'Household analytics'
        ]
      default:
        return [
          'Up to 50 pantry items',
          'AI scanner (10 scans/month)',
          'Basic recipe suggestions (3/week)',
          '3 storage locations',
          'Basic analytics'
        ]
    }
  }

  const features = getTierFeatures(data.subscription_tier)
  const featuresList = features.map(feature => `<li>• ${feature}</li>`).join('')

  const greeting = data.subscription_status === 'active'
    ? `🎉 <strong>Welcome to ${getTierDisplayName(data.subscription_tier)}!</strong> Your subscription is now active and you have access to all premium features.`
    : data.subscription_status === 'canceled'
    ? `Your ${getTierDisplayName(data.subscription_tier)} subscription has been canceled. You'll continue to have access until your current billing period ends.`
    : `Your ${getTierDisplayName(data.subscription_tier)} subscription status has been updated.`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meal Saver - Subscription Confirmation</title>
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

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                Hi ${userName}! 👋
              </h2>
              <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
            </td>
          </tr>

          <!-- Subscription Details -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
                  Subscription Details
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">
                      Plan:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                      ${getTierDisplayName(data.subscription_tier)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                      Status:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                      ${data.subscription_status.charAt(0).toUpperCase() + data.subscription_status.slice(1)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                      Amount:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                      $${amount}/${data.billing_interval}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                      Next billing:
                    </td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                      ${nextBilling}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Features List -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
                What's included:
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                ${featuresList}
              </ul>
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="${appUrl}/dashboard" style="display: block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; font-size: 14px;">
                      Go to Dashboard
                    </a>
                  </td>
                  <td style="padding-left: 8px;">
                    <a href="${appUrl}/profile" style="display: block; padding: 12px 24px; background-color: #f3f4f6; color: #111827; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; font-size: 14px;">
                      Manage Subscription
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                💡 <strong>Tip:</strong> Start by adding your first items to your pantry using the Scanner or manual entry!
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Questions about your subscription? Visit your
                <a href="${appUrl}/profile" style="color: #10b981; text-decoration: none;">profile page</a>
                to manage your account.
                <br><br>
                <a href="${appUrl}/profile" style="color: #9ca3af; text-decoration: underline;">Manage subscription</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Unsubscribe -->
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
}
