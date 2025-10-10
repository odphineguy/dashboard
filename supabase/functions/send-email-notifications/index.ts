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
    from: 'Meal Saver <notifications@mealsaver.app>',
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
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">
                🥗 Meal Saver
              </h1>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
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
