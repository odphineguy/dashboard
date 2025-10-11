import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface NotificationPreferences {
  expiration: {
    daily: boolean
    critical: boolean
    weekly: boolean
  }
  recipes: {
    weekly: boolean
    expiring: boolean
  }
  achievements: {
    earned: boolean
    monthly: boolean
  }
  inventory: {
    weekly: boolean
    lowStock: boolean
  }
}

interface PantryItem {
  id: string
  name: string
  quantity: number
  expiry_date: string
  category: string
}

interface User {
  id: string
  email: string
  full_name: string
  notification_preferences: NotificationPreferences
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

    // Parse request body for notification type
    const { type } = await req.json()
    const notificationType = type || 'daily' // default to daily

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get all users with their profiles and preferences
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, notification_preferences')
      .not('notification_preferences', 'is', null)

    if (profilesError) {
      throw profilesError
    }

    // Get all users' auth data
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      throw usersError
    }

    // Merge profile and auth data
    const usersWithProfiles = users.map(user => {
      const profile = profiles?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        notification_preferences: profile?.notification_preferences
      }
    }).filter(user => user.notification_preferences)

    const emailsSent: string[] = []
    const errors: any[] = []

    // Process each user
    for (const user of usersWithProfiles) {
      try {
        // Check if user wants this type of notification
        const shouldSend = checkNotificationPreference(user.notification_preferences, notificationType)

        if (!shouldSend) {
          console.log(`Skipping ${notificationType} notification for ${user.email} - preference disabled`)
          continue
        }

        // Get user's expiring items
        const { data: items, error: itemsError } = await supabase
          .from('pantry_items')
          .select('*')
          .eq('user_id', user.id)
          .not('expiry_date', 'is', null)

        if (itemsError) {
          throw itemsError
        }

        // Filter items based on notification type
        const relevantItems = filterItemsByNotificationType(items || [], notificationType)

        if (relevantItems.length === 0) {
          console.log(`No relevant items for ${user.email} - skipping email`)
          continue
        }

        // Send email via Resend
        const emailSent = await sendEmail(user, relevantItems, notificationType)

        if (emailSent) {
          emailsSent.push(user.email!)
        }
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error)
        errors.push({ user: user.email, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        emails: emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-email-notifications function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

function checkNotificationPreference(preferences: NotificationPreferences, type: string): boolean {
  switch (type) {
    case 'daily':
      return preferences.expiration?.daily || false
    case 'critical':
      return preferences.expiration?.critical || false
    case 'weekly':
      return preferences.expiration?.weekly || false
    case 'recipes-expiring':
      return preferences.recipes?.expiring || false
    default:
      return false
  }
}

function filterItemsByNotificationType(items: PantryItem[], type: string): PantryItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return items.filter(item => {
    if (!item.expiry_date) return false

    const expiryDate = new Date(item.expiry_date)
    expiryDate.setHours(0, 0, 0, 0)

    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    switch (type) {
      case 'daily':
        // Items expiring in 0-3 days
        return diffDays >= 0 && diffDays <= 3
      case 'critical':
        // Items expiring today or already expired
        return diffDays <= 0
      case 'weekly':
        // Items expiring in the next 7 days
        return diffDays >= 0 && diffDays <= 7
      default:
        return false
    }
  }).sort((a, b) => {
    // Sort by expiry date (soonest first)
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  })
}

async function sendEmail(user: User, items: PantryItem[], notificationType: string): Promise<boolean> {
  const subject = getEmailSubject(notificationType, items.length)
  const htmlContent = generateEmailHTML(user, items, notificationType)

  const emailData = {
    from: 'Meal Saver <notifications@abemedia.online>',
    to: user.email,
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
  console.log('Email sent successfully:', result)
  return true
}

function getEmailSubject(type: string, itemCount: number): string {
  switch (type) {
    case 'critical':
      return `🚨 ${itemCount} Item${itemCount !== 1 ? 's' : ''} Expiring Today - Act Now!`
    case 'daily':
      return `🍎 ${itemCount} Item${itemCount !== 1 ? 's' : ''} Expiring Soon - Meal Saver Alert`
    case 'weekly':
      return `📅 Weekly Expiry Report: ${itemCount} Item${itemCount !== 1 ? 's' : ''} to Watch`
    default:
      return `Meal Saver - Food Expiry Alert`
  }
}

function generateEmailHTML(user: User, items: PantryItem[], type: string): string {
  const userName = user.full_name || 'there'
  const appUrl = 'https://mealsaver.app' // Update with your actual domain

  const itemsList = items.map(item => {
    const expiryDate = new Date(item.expiry_date)
    const today = new Date()
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let statusText = ''
    let statusColor = '#10b981' // green

    if (diffDays < 0) {
      statusText = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
      statusColor = '#ef4444' // red
    } else if (diffDays === 0) {
      statusText = 'Expires today!'
      statusColor = '#f97316' // orange
    } else if (diffDays === 1) {
      statusText = 'Expires tomorrow'
      statusColor = '#f59e0b' // amber
    } else {
      statusText = `Expires in ${diffDays} days`
      statusColor = '#eab308' // yellow
    }

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #111827; font-size: 16px;">${item.name}</strong>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
            ${item.category || 'Uncategorized'} • Qty: ${item.quantity}
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">
            ${statusText}
          </span>
        </td>
      </tr>
    `
  }).join('')

  const greeting = type === 'critical'
    ? `⚠️ <strong>Urgent:</strong> You have items expiring today that need immediate attention!`
    : type === 'weekly'
    ? `Here's your weekly overview of items expiring in the next 7 days:`
    : `You have items expiring in the next few days. Take action to reduce waste! 💚`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meal Saver - Food Expiry Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 3px solid #10b981; background-color: #ffffff;">
              <img src="data:image/png;base64,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" alt="Meal Saver" style="height: 50px; width: auto; display: block; margin: 0 auto;">
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

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                      Item
                    </th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="${appUrl}/inventory" style="display: block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; font-size: 14px;">
                      View Inventory
                    </a>
                  </td>
                  <td style="padding-left: 8px;">
                    <a href="${appUrl}/recipes" style="display: block; padding: 12px 24px; background-color: #f3f4f6; color: #111827; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; font-size: 14px;">
                      Get Recipe Ideas
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
                💡 <strong>Tip:</strong> Use the Scanner page to quickly add new items and keep your inventory up to date!
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this email because you have expiration alerts enabled in your
                <a href="${appUrl}/profile" style="color: #10b981; text-decoration: none;">notification preferences</a>.
                <br><br>
                <a href="${appUrl}/profile" style="color: #9ca3af; text-decoration: underline;">Manage email preferences</a>
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
