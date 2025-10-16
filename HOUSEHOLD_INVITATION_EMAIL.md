# Household Invitation Email System

## Overview

The household invitation system now sends email notifications to invited users using a Supabase Edge Function integrated with the Resend API.

## Implementation Details

### Edge Function

**File:** `supabase/functions/send-household-invitation/index.ts`

The edge function:
1. Receives an `invitationId` from the client
2. Fetches invitation details from the database (including household name and inviter name)
3. Generates a beautifully formatted HTML email with:
   - Household name
   - Inviter's name
   - Benefits of joining
   - "Accept Invitation" button with unique link
   - Branded Meal Saver design matching existing email notifications
4. Sends the email via Resend API
5. Returns success/error response

**Deployment Status:** ✅ Deployed to production

### Frontend Integration

**File:** `src/contexts/HouseholdContext.jsx` (lines 128-178)

The `inviteToHousehold` function now:
1. Creates the invitation record in the database
2. Calls the edge function to send the email
3. Logs success/errors (doesn't throw on email failure to ensure UI shows success)

### Email Template

The email includes:
- **Subject:** "🏠 [Inviter Name] invited you to join their household on Meal Saver"
- **From:** "Meal Saver <notifications@abemedia.online>"
- **Content:**
  - Meal Saver logo and branding
  - Personalized invitation message
  - Household name in highlighted card
  - List of benefits (shared inventory, real-time updates, meal planning, waste reduction)
  - Primary CTA button: "Accept Invitation"
  - Backup link for email clients that don't support buttons
  - Footer with instructions for new users

### Invitation Acceptance Flow

The email contains a link to: `https://mealsaver.app/accept-invitation?token={invitationId}`

**Note:** The acceptance page needs to be implemented. This should:
1. Extract the `token` (invitationId) from URL
2. Check if user is logged in
3. If not logged in, redirect to login/signup with return URL
4. If logged in, call `acceptInvitation(invitationId)` from HouseholdContext
5. Show success message and redirect to household page

## Environment Variables Required

The edge function requires these Supabase secrets (already configured):
- `RESEND_API_KEY` - Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Testing

### Manual Testing via UI

1. Log in as a household admin
2. Go to Household page
3. Click "Invite Member"
4. Enter an email address
5. Click "Send Invitation"
6. Check the email inbox (including spam folder)

### Testing via CLI

```bash
# First, create a test invitation in the database and note its ID
# Then invoke the function:

supabase functions invoke send-household-invitation \
  --body '{"invitationId": "your-invitation-uuid-here"}'
```

### Viewing Logs

```bash
# View real-time logs
supabase functions logs send-household-invitation

# View with specific filters
supabase functions logs send-household-invitation --filter "error"
```

## Database Schema

The system uses the `household_invitations` table:

```sql
CREATE TABLE household_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

The system has graceful error handling:

1. **Database errors** (invitation not found, permission denied) - Return 404 with error message
2. **Email sending errors** (Resend API failure) - Log error and return 500, but don't break the UI flow
3. **Missing parameters** - Return 400 with clear error message

The frontend catches email errors separately so that:
- ✅ User sees "Invitation Sent!" even if email fails
- ✅ Invitation record is saved in database
- ❌ Email error is logged to console for debugging
- This ensures the user can manually share the invitation link if needed

## Future Enhancements

1. **Resend Invitation** - Add ability to resend invitation email
2. **Invitation Expiration** - Add expiry date to invitations (e.g., 7 days)
3. **Email Templates** - Move email HTML to separate template files
4. **Invitation History** - Show list of sent invitations in UI
5. **Batch Invitations** - Allow inviting multiple emails at once
6. **Custom Message** - Allow admin to add personal message to invitation

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify Resend API key is set in Supabase secrets
3. Check function logs: `supabase functions logs send-household-invitation`
4. Verify email address is correct in database
5. Check Resend dashboard for delivery status

### Function Errors

1. Check function logs for detailed error messages
2. Verify database permissions for service role
3. Ensure household_invitations table has proper foreign keys
4. Test function deployment: `supabase functions deploy send-household-invitation`

### UI Shows Success But No Email

This is expected behavior! The UI will show success even if email fails to ensure:
- Invitation is saved in database
- User experience isn't disrupted
- Admin can manually share invitation link

Check console logs in browser for email error details.

## Related Files

- `supabase/functions/send-household-invitation/index.ts` - Edge function
- `src/contexts/HouseholdContext.jsx` - Frontend integration
- `src/pages/Household/components/InviteMemberModal.jsx` - Invitation UI
- `supabase/functions/send-email-notifications/index.ts` - Reference implementation

## Deployment

The function is automatically deployed when pushing to the repository. To manually deploy:

```bash
supabase functions deploy send-household-invitation --no-verify-jwt
```

**Deployment URL:**
https://qrkkcrkxpydosxwkdeve.supabase.co/functions/v1/send-household-invitation
