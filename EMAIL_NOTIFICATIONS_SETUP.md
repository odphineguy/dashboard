# Email Notifications Setup Guide

This guide will help you set up automated email notifications for expiring food items using Resend and Supabase Edge Functions.

## Prerequisites

- Resend account (you already have one for smart_pantry)
- Supabase project with CLI installed
- Access to your Supabase dashboard

## Step 1: Get Your Resend API Key

1. Log in to [Resend](https://resend.com/login)
2. Go to **API Keys** section
3. Create a new API key or use existing one from smart_pantry project
4. Copy the API key (starts with `re_`)

## Step 2: Verify Your Domain (Optional but Recommended)

For production use, verify your domain in Resend:

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `mealsaver.app`)
3. Add the DNS records shown to your domain provider
4. Wait for verification (usually takes a few minutes)

**For testing:** You can use Resend's test domain, but emails will only be sent to your verified email address.

## Step 3: Configure Supabase Secrets

You need to add the Resend API key to your Supabase project:

```bash
# Navigate to project directory
cd /Users/abemacmini/Documents/dashboard

# Set the Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 4: Deploy the Edge Function

Deploy the email notification function to Supabase:

```bash
# Deploy the function
supabase functions deploy send-email-notifications

# Verify deployment
supabase functions list
```

## Step 5: Test the Function

Test the function manually to ensure it works:

```bash
# Test with daily notifications
supabase functions invoke send-email-notifications \
  --body '{"type": "daily"}'

# Test with critical notifications
supabase functions invoke send-email-notifications \
  --body '{"type": "critical"}'
```

You can also test via curl:

```bash
# Get your function URL from Supabase dashboard
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/send-email-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

## Step 6: Set Up Scheduled Jobs (Cron)

To automate email sending, set up cron jobs using Supabase's pg_cron extension:

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Enable `pg_cron` extension
4. Go to **SQL Editor** and run:

```sql
-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Daily digest at 8 AM UTC (adjust timezone as needed)
select cron.schedule(
  'send-daily-email-digest',
  '0 8 * * *',
  $$
  select
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/send-email-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{"type": "daily"}'::jsonb
    ) as request_id;
  $$
);

-- Critical alerts at 7 AM and 6 PM UTC
select cron.schedule(
  'send-critical-email-alerts',
  '0 7,18 * * *',
  $$
  select
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/send-email-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{"type": "critical"}'::jsonb
    ) as request_id;
  $$
);

-- Weekly summary every Monday at 8 AM UTC
select cron.schedule(
  'send-weekly-email-summary',
  '0 8 * * 1',
  $$
  select
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/send-email-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{"type": "weekly"}'::jsonb
    ) as request_id;
  $$
);
```

**Important:** Replace `your-project-ref` with your actual Supabase project reference and `YOUR_SERVICE_ROLE_KEY` with your service role key (found in Project Settings → API).

### Option B: Using Supabase CLI

Create a migration file:

```bash
# Create a new migration
supabase migration new setup_email_cron_jobs

# Edit the generated file in supabase/migrations/
# Add the SQL commands above
```

Then apply:

```bash
supabase db push
```

## Step 7: Verify Cron Jobs are Running

Check scheduled jobs:

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Step 8: Update Email "From" Address

In `supabase/functions/send-email-notifications/index.ts`, update line 207:

```typescript
from: 'Meal Saver <notifications@mealsaver.app>',
```

Replace with:
- Your verified domain email (if you verified a domain)
- Or use `onboarding@resend.dev` for testing

## Step 9: Update App URL

Update the app URL in the email function (line 229):

```typescript
const appUrl = 'https://mealsaver.app' // Update with your actual domain
```

Replace with your actual deployed URL or `http://localhost:5173` for testing.

## Notification Types

The function supports these notification types:

| Type | Description | Default Schedule | User Preference Key |
|------|-------------|------------------|---------------------|
| `daily` | Items expiring in 0-3 days | 8 AM daily | `expiration.daily` |
| `critical` | Items expiring today or expired | 7 AM & 6 PM | `expiration.critical` |
| `weekly` | Items expiring in next 7 days | Monday 8 AM | `expiration.weekly` |

## User Preferences

Users can control which emails they receive via **Profile → Notification Preferences**. The function automatically checks these preferences before sending:

- ✅ Users only receive emails they've opted into
- ✅ No emails sent if user has no expiring items
- ✅ Emails include one-click preference management link

## Monitoring & Troubleshooting

### View Function Logs

```bash
# Real-time logs
supabase functions logs send-email-notifications --follow

# Recent logs
supabase functions logs send-email-notifications
```

### Common Issues

**"Failed to send email: Forbidden"**
- Check your Resend API key is correct
- Verify the "from" email is from a verified domain or use test domain

**"No users found"**
- Ensure users have `notification_preferences` set in their profiles
- Check database permissions

**"Cron job not running"**
- Verify pg_cron extension is enabled
- Check service role key is correct in cron job
- View `cron.job_run_details` for error messages

**Emails not received**
- Check spam folder
- Verify email address in user profile
- Check Resend dashboard for delivery status

## Testing During Development

### Manual Test via Supabase Dashboard

1. Go to **Edge Functions** → `send-email-notifications`
2. Click **Invoke function**
3. Add body: `{"type": "daily"}`
4. Click **Send**

### Test with Real Data

1. Add items to your pantry with expiry dates in next 1-3 days
2. Set your notification preferences in Profile
3. Invoke the function manually
4. Check your email

## Security Notes

- ✅ Uses Supabase service role key (not exposed to client)
- ✅ Resend API key stored as secret (encrypted)
- ✅ Function validates user preferences before sending
- ✅ Rate limited by Resend (3,000 emails/month on free tier)

## Next Steps

After setup is complete:

1. ✅ Test with your own email address
2. ✅ Verify cron jobs are scheduled
3. ✅ Monitor logs for first scheduled run
4. ✅ Update email branding/styling as needed
5. ✅ Consider upgrading Resend plan for higher volume

## Cost Estimate

**Free Tier (Resend):**
- 3,000 emails/month free
- 100 emails/day

**Example:** If you have 50 users:
- Daily emails: 50/day = 1,500/month
- Well within free tier ✅

For more users, upgrade to Resend Pro ($20/month for 50,000 emails).

## Support

If you encounter issues:
1. Check Supabase function logs
2. Check Resend dashboard for delivery status
3. Review this setup guide
4. Check Supabase and Resend documentation
