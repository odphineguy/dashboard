import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/svix@1.15.0'

const CLERK_WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify webhook signature
    const svix_id = req.headers.get('svix-id')
    const svix_timestamp = req.headers.get('svix-timestamp')
    const svix_signature = req.headers.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing svix headers', { status: 400 })
    }

    const payload = await req.text()
    const wh = new Webhook(CLERK_WEBHOOK_SECRET)

    let evt: any
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Webhook verification failed', { status: 400 })
    }

    const { type, data } = evt

    console.log('Clerk webhook event:', type, data)

    // Handle different webhook events
    switch (type) {
      case 'user.created': {
        const email = data.email_addresses?.[0]?.email_address

        // Check if email already exists in profiles (prevent account takeover)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', email)
          .single()

        if (existingProfile && existingProfile.id !== data.id) {
          console.error('Email already registered with different user ID:', {
            clerkId: data.id,
            existingId: existingProfile.id,
            email: email
          })
          return new Response(
            JSON.stringify({ error: 'Email already registered' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Create profile in Supabase
        const { error } = await supabase.from('profiles').upsert({
          id: data.id, // Use Clerk user ID as primary key
          email: email,
          full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
          avatar_url: data.image_url,
          subscription_tier: 'basic', // Default to basic
          subscription_status: 'active',
          onboarding_completed: false,
          created_at: new Date(data.created_at).toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (error) {
          // Check for unique constraint violation on email
          if (error.code === '23505' && error.message.includes('profiles_email_unique')) {
            console.error('Email already registered:', email)
            return new Response(
              JSON.stringify({ error: 'Email already registered' }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            )
          }

          console.error('Error creating profile:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        console.log('Profile created for user:', data.id)

        // Create default storage locations for new user
        const defaultLocations = [
          { name: 'Pantry', icon: 'Package', user_id: data.id },
          { name: 'Refrigerator', icon: 'Refrigerator', user_id: data.id },
          { name: 'Freezer', icon: 'Snowflake', user_id: data.id }
        ]

        const { error: locationsError } = await supabase
          .from('storage_locations')
          .insert(defaultLocations)

        if (locationsError) {
          console.error('Error creating default storage locations:', locationsError)
        } else {
          console.log('Default storage locations created for user:', data.id)
        }

        break
      }

      case 'user.updated': {
        // Update profile in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            email: data.email_addresses?.[0]?.email_address,
            full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
            avatar_url: data.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id)

        if (error) {
          console.error('Error updating profile:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        console.log('Profile updated for user:', data.id)
        break
      }

      case 'user.deleted': {
        // Get user's Stripe customer ID and active subscriptions
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', data.id)
          .single()

        // Cancel active Stripe subscriptions to prevent orphaning
        if (profile?.stripe_customer_id) {
          try {
            const { data: subscriptions } = await supabase
              .from('subscriptions')
              .select('stripe_subscription_id')
              .eq('user_id', data.id)
              .in('status', ['active', 'trialing', 'past_due'])

            if (subscriptions && subscriptions.length > 0) {
              // Import Stripe
              const { default: Stripe } = await import('https://esm.sh/stripe@14.21.0')
              const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
                apiVersion: '2023-10-16',
              })

              // Track failed cancellations
              const failedCancellations = []

              // Cancel all subscriptions in parallel
              const cancellationResults = await Promise.allSettled(
                subscriptions.map(sub =>
                  stripe.subscriptions.cancel(sub.stripe_subscription_id)
                )
              )

              // Log results
              cancellationResults.forEach((result, index) => {
                const subscriptionId = subscriptions[index].stripe_subscription_id
                if (result.status === 'fulfilled') {
                  console.log(`Canceled Stripe subscription: ${subscriptionId}`)
                } else {
                  console.error(`Failed to cancel subscription ${subscriptionId}:`, result.reason)
                  failedCancellations.push(subscriptionId)
                }
              })

              // If any cancellations failed, return error to retry later
              if (failedCancellations.length > 0) {
                return new Response(
                  JSON.stringify({
                    error: 'Failed to cancel Stripe subscriptions',
                    failed_subscriptions: failedCancellations
                  }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                  }
                )
              }
            }
          } catch (subscriptionError) {
            console.error('Error canceling Stripe subscriptions:', subscriptionError)
            return new Response(
              JSON.stringify({ error: subscriptionError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          }
        }

        // Soft delete or anonymize user data
        const { error } = await supabase
          .from('profiles')
          .update({
            email: null,
            full_name: 'Deleted User',
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id)

        if (error) {
          console.error('Error deleting profile:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        console.log('Profile deleted for user:', data.id)
        break
      }

      default:
        console.log('Unhandled webhook event type:', type)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
