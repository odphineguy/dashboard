# Testing Household Invitation Email

## Quick Test (Recommended)

Since the production database is empty, here's how to test the invitation email system:

### Option 1: Test Through the App UI

1. **Sign Up / Log In**
   - Go to https://mealsaver.app (or http://localhost:5173 for local)
   - Create an account or sign in with existing account

2. **Select Household Premium During Onboarding**
   - During onboarding, select "Household Premium" plan
   - Enter a household name (e.g., "My Test Household")
   - Complete onboarding

3. **Navigate to Household Page**
   - Click on "Household" in the sidebar
   - You should see your household

4. **Send Invitation**
   - Click "Invite Member" button
   - Enter email: `support@pawrelief.app`
   - Click "Send Invitation"
   - ✅ Email should be sent!

5. **Check Email**
   - Check inbox for support@pawrelief.app
   - Check spam folder if not in inbox
   - Email should have subject: "🏠 [Your Name] invited you to join their household on Meal Saver"

### Option 2: Manual Database + Edge Function Test

If you already have access to Supabase Dashboard:

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard/project/qrkkcrkxpydosxwkdeve

2. **Create Test Data via SQL Editor**
   ```sql
   -- Create a test user profile (use your actual user ID)
   INSERT INTO profiles (id, full_name)
   VALUES ('your-user-id-here', 'Test User')
   ON CONFLICT (id) DO NOTHING;

   -- Create a test household
   INSERT INTO households (id, name, created_by)
   VALUES (
     'test-household-123',
     'Test Household',
     'your-user-id-here'
   );

   -- Create an invitation
   INSERT INTO household_invitations (id, household_id, email, invited_by, status)
   VALUES (
     'test-invitation-456',
     'test-household-123',
     'support@pawrelief.app',
     'your-user-id-here',
     'pending'
   );
   ```

3. **Call the Edge Function**
   - Go to Edge Functions in Supabase Dashboard
   - Find `send-household-invitation`
   - Click "Invoke"
   - Use this body:
   ```json
   {
     "invitationId": "test-invitation-456"
   }
   ```
   - Click "Run"

4. **Check Results**
   - Check function response for success message
   - Check email inbox for support@pawrelief.app

### Option 3: Command Line Test (Requires Existing Data)

If you have households in the database already:

```bash
# Using your existing user/household data
supabase functions invoke send-household-invitation \
  --body '{
    "invitationId": "your-actual-invitation-id"
  }'
```

## What the Email Looks Like

The invitation email includes:
- ✅ Meal Saver branding and logo
- ✅ Personalized greeting with inviter's name
- ✅ Household name prominently displayed
- ✅ List of benefits (shared inventory, real-time updates, etc.)
- ✅ "Accept Invitation" button
- ✅ Backup link for compatibility
- ✅ Professional design matching existing Meal Saver emails

## Troubleshooting

### Email Not Received

1. **Check spam folder** - Sometimes invitation emails go to spam
2. **Check Resend Dashboard** - Login to Resend.com to see delivery logs
3. **Check Function Logs**:
   ```bash
   supabase functions logs send-household-invitation
   ```
4. **Verify Environment Variables** - Ensure RESEND_API_KEY is set in Supabase secrets

### Function Errors

Check the function logs for detailed error messages:
```bash
supabase functions logs send-household-invitation --filter "error"
```

Common issues:
- Missing RESEND_API_KEY in Supabase secrets
- Invalid invitation ID
- Missing household or inviter data in database

## Expected Behavior

✅ **Success Flow:**
1. User clicks "Send Invitation"
2. UI shows "Invitation Sent!" immediately
3. Database record created in `household_invitations`
4. Edge function called with invitation ID
5. Email sent via Resend API
6. Recipient receives beautifully formatted email
7. Recipient clicks "Accept Invitation"
8. Recipient is added to household

⚠️ **Graceful Failure:**
- If email fails to send, UI still shows success
- Invitation record is still saved in database
- Error is logged to console
- Admin can manually share invitation link if needed

## Support

If you encounter issues:
1. Check browser console for errors
2. Check function logs: `supabase functions logs send-household-invitation`
3. Verify Supabase secrets are configured
4. Test with a different email address
