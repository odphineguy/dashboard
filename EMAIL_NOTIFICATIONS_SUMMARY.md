# Email Notifications - Implementation Summary

## ✅ What's Been Completed

### 1. UI Updates
- ✅ Removed SMS and Push notification options from Profile page
- ✅ Updated to email-only notification preferences
- ✅ New preference options:
  - **Expiration Alerts**: Daily Digest, Critical Alerts, Weekly Summary
  - **Recipe Suggestions**: Weekly Ideas, Recipes for Expiring Items
  - **Achievements**: When Earned, Monthly Summary
  - **Inventory**: Weekly Reminders, Low Stock Alerts

### 2. Edge Function Created
- ✅ Location: `supabase/functions/send-email-notifications/index.ts`
- ✅ Features:
  - Queries all users with notification preferences
  - Filters items by expiry date based on notification type
  - Respects user preferences (only sends opted-in emails)
  - Generates beautiful HTML email templates
  - Integrates with Resend API

### 3. Email Templates
- ✅ Professional responsive HTML design
- ✅ Shows expiring items in table format with status colors
- ✅ Action buttons: "View Inventory" and "Get Recipe Ideas"
- ✅ One-click preference management
- ✅ Mobile-friendly design

### 4. Documentation
- ✅ `EMAIL_NOTIFICATIONS_SETUP.md` - Complete deployment guide
- ✅ `test-email-notification.sh` - Testing script
- ✅ Updated `CLAUDE.md` with notification system info

## 🎯 Next Steps (For You)

### Step 1: Deploy to Supabase (5 minutes)

```bash
# 1. Set your Resend API key
supabase secrets set RESEND_API_KEY=re_your_key_here

# 2. Deploy the function
supabase functions deploy send-email-notifications

# 3. Test it
./test-email-notification.sh daily
```

### Step 2: Update Email Settings (2 minutes)

Edit `supabase/functions/send-email-notifications/index.ts`:

**Line 207** - Update sender email:
```typescript
from: 'Meal Saver <notifications@yourdomain.com>',
// Or use: from: 'onboarding@resend.dev', // for testing
```

**Line 229** - Update app URL:
```typescript
const appUrl = 'https://yourdomain.com'
// Or use: const appUrl = 'http://localhost:5173' // for testing
```

### Step 3: Set Up Scheduled Jobs (10 minutes)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Daily digest at 8 AM
select cron.schedule(
  'send-daily-email-digest',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"type": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- Critical alerts at 7 AM and 6 PM
select cron.schedule(
  'send-critical-email-alerts',
  '0 7,18 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"type": "critical"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly summary on Mondays at 8 AM
select cron.schedule(
  'send-weekly-email-summary',
  '0 8 * * 1',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"type": "weekly"}'::jsonb
  ) as request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` - Your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` - Found in Project Settings → API

## 📧 Email Preview

Users will receive emails like this:

```
Subject: 🍎 3 Items Expiring Soon - Meal Saver Alert

Hi John! 👋

You have items expiring in the next few days. Take action to reduce waste! 💚

┌─────────────────────────────────────────────────────┐
│ Item                              │ Status           │
├─────────────────────────────────────────────────────┤
│ Milk                              │ Expires today!   │
│ Dairy • Qty: 1                    │                  │
├─────────────────────────────────────────────────────┤
│ Chicken breast                    │ Expires in 2 days│
│ Meat • Qty: 2                     │                  │
├─────────────────────────────────────────────────────┤
│ Strawberries                      │ Expires in 3 days│
│ Fruits • Qty: 1                   │                  │
└─────────────────────────────────────────────────────┘

[View Inventory]  [Get Recipe Ideas]

💡 Tip: Use the Scanner page to quickly add new items!
```

## 🔍 How It Works

1. **Scheduled Job Triggers** → Runs at specified times (8 AM, 7 PM, etc.)
2. **Edge Function Executes** → `send-email-notifications` function runs
3. **Query Users** → Gets all users with notification preferences
4. **Check Preferences** → Only processes users who opted in for that type
5. **Query Items** → Gets expiring items for each user
6. **Filter by Type** → Filters items based on notification type (daily/critical/weekly)
7. **Generate Email** → Creates HTML email with item table
8. **Send via Resend** → Emails sent to users
9. **Log Results** → Function logs success/errors

## 🎛️ User Control

Users can manage preferences in **Profile → Notification Preferences**:
- ✅ All checkboxes save automatically
- ✅ No emails sent for disabled preferences
- ✅ No emails sent if no expiring items
- ✅ Can disable all notifications

## 📊 Monitoring

View function logs:
```bash
# Real-time logs
supabase functions logs send-email-notifications --follow

# Recent logs
supabase functions logs send-email-notifications
```

Check cron job runs:
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## 💰 Cost

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day

**Example usage:**
- 50 users × daily email = 1,500 emails/month ✅
- 50 users × 2 critical emails/day = 3,000 emails/month ✅

You're well within the free tier!

## 🚀 Quick Start Checklist

- [ ] Get Resend API key from existing smart_pantry account
- [ ] Set Resend API key as Supabase secret
- [ ] Update email "from" address in function
- [ ] Update app URL in function
- [ ] Deploy edge function to Supabase
- [ ] Test with: `./test-email-notification.sh daily`
- [ ] Verify email received
- [ ] Set up cron jobs in Supabase (SQL above)
- [ ] Verify cron jobs scheduled: `SELECT * FROM cron.job;`
- [ ] Monitor first scheduled run
- [ ] Celebrate! 🎉

## 📚 Additional Resources

- Full Setup Guide: `EMAIL_NOTIFICATIONS_SETUP.md`
- Test Script: `./test-email-notification.sh`
- Function Code: `supabase/functions/send-email-notifications/index.ts`
- UI Component: `src/pages/Profile/components/NotificationPreferences.jsx`
- Resend Docs: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- pg_cron Docs: https://supabase.com/docs/guides/database/extensions/pg_cron
