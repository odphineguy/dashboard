# Email Notifications - Quick Start

## 🚀 Deploy in 3 Steps (5 minutes)

### Step 1: Get Resend API Key
```bash
# Log in to Resend (you already have an account from smart_pantry)
# Copy your API key from: https://resend.com/api-keys
```

### Step 2: Configure & Deploy
```bash
cd /Users/abemacmini/Documents/dashboard

# Set API key as Supabase secret
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# Deploy function
supabase functions deploy send-email-notifications
```

### Step 3: Test It
```bash
# Run test script
./test-email-notification.sh daily

# Check your email!
```

## 📅 Set Up Automated Sending (Optional)

Open Supabase SQL Editor and run:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-emails',
  '0 8 * * *',  -- 8 AM daily
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-email-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{"type": "daily"}'::jsonb
  ) as request_id;
  $$
);
```

Replace `YOUR_PROJECT` and `YOUR_SERVICE_KEY` with your actual values.

## ✅ Done!

Your users can now:
1. Go to Profile → Notification Preferences
2. Check which emails they want
3. Receive daily/weekly expiration alerts

## 🆘 Troubleshooting

**No emails received?**
```bash
# Check logs
supabase functions logs send-email-notifications

# Verify Resend API key
supabase secrets list
```

**Need help?**
- Full guide: `EMAIL_NOTIFICATIONS_SETUP.md`
- Summary: `EMAIL_NOTIFICATIONS_SUMMARY.md`
