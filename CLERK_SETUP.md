# Clerk + Supabase Integration Setup Guide

## Issue: Stuck on Loading After Google Sign-In

When signing in with Google OAuth via Clerk, you may get stuck on the onboarding loading screen with these errors:

```
GET https://[project].supabase.co/rest/v1/profiles?...&id=eq.user_... 406 (Not Acceptable)
Error loading subscription: {code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object'}
```

**Root Cause:** The Clerk JWT token needs to be properly configured to work with Supabase RLS policies.

---

## Solution: Configure Clerk JWT Template

Clerk needs to send a JWT token with the correct claims that Supabase RLS policies expect.

### Step 1: Create Supabase JWT Template in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** (in sidebar under "Configure")
4. Click **"New template"**
5. Select **"Supabase"** from the template options
6. Name it: `supabase` (lowercase, exact name matters!)

### Step 2: Configure the Template

The template should have these claims automatically, but verify:

```json
{
  "aud": "authenticated",
  "exp": {{expirationTime}},
  "iat": {{issuedAt}},
  "iss": "{{issuer}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "app_metadata": {},
  "user_metadata": {}
}
```

**Critical Claims:**
- `sub`: Must be `{{user.id}}` - This is what RLS policies check
- `aud`: Must be `"authenticated"` - Required by Supabase RLS
- `email`: Should be `{{user.primary_email_address}}`

### Step 3: Get the Template Name

After saving, note the template name (should be exactly `supabase`).

### Step 4: Update Your Code (Already Done)

The code in `src/hooks/useSupabase.js` already uses the correct template:

```javascript
const clerkToken = globalGetToken
  ? await globalGetToken({ template: 'supabase' }) // ✅ Uses 'supabase' template
  : null
```

However, if the template doesn't exist, you'll get auth errors.

---

## Verify JWT Token is Working

### Test in Browser Console

1. Sign in to your app
2. Open browser console
3. Run this:

```javascript
// Get Clerk instance
const clerk = window.Clerk

// Get token with Supabase template
const token = await clerk.session.getToken({ template: 'supabase' })

// Decode the token (copy to jwt.io)
console.log('Token:', token)

// Parse the payload
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token payload:', payload)

// Check if 'sub' claim exists and matches user ID
console.log('User ID from Clerk:', clerk.user.id)
console.log('User ID from token (sub):', payload.sub)
console.log('Match:', clerk.user.id === payload.sub) // Should be true
```

**Expected Output:**
```javascript
{
  aud: "authenticated",
  sub: "user_2abc123...",  // Should match Clerk user ID
  email: "user@example.com",
  ...
}
```

---

## Update getToken() Calls

Make sure all `getToken()` calls in the codebase specify the template:

### ✅ Correct Usage:
```javascript
const token = await getToken({ template: 'supabase' })
```

### ❌ Incorrect Usage:
```javascript
const token = await getToken() // Missing template!
```

### Files to Check:
- `src/hooks/useSupabase.js` ✅ (already correct)
- `src/contexts/SubscriptionContext.jsx` ✅ (already correct)

---

## Alternative: Use Default Token

If you don't want to create a JWT template, you can update the code to use the default Clerk token by modifying `useSupabase.js`:

```javascript
// Option 1: Use default token (no template)
const clerkToken = globalGetToken ? await globalGetToken() : null

// Option 2: Use 'supabase' template (recommended)
const clerkToken = globalGetToken ? await globalGetToken({ template: 'supabase' }) : null
```

However, the **recommended approach is to use the Supabase template** because it ensures the JWT has the correct claims for RLS policies.

---

## Troubleshooting

### Issue: "Invalid JWT template name"

**Solution:** The template must be named exactly `supabase` (lowercase). Check:
1. Clerk Dashboard → JWT Templates
2. Verify template exists
3. Verify name is exactly `supabase`

### Issue: Still getting 406 errors after creating template

**Possible causes:**
1. Template not applied yet (can take 1-2 minutes)
2. Browser cache - hard refresh (Cmd+Shift+R)
3. Token not being sent correctly

**Debug steps:**
```javascript
// In browser console after sign-in
const token = await window.Clerk.session.getToken({ template: 'supabase' })
console.log('Has token:', !!token)

// Decode and check claims
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token sub claim:', payload.sub)
console.log('Clerk user ID:', window.Clerk.user.id)
console.log('Match:', payload.sub === window.Clerk.user.id)
```

### Issue: Profile still not created

**Check RLS policies:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Verify "Users can insert own profile" policy exists
```

**Manually create profile (temporary workaround):**
```sql
-- Run in Supabase SQL Editor as service_role
INSERT INTO profiles (id, email, full_name, subscription_tier, subscription_status)
VALUES ('user_YOUR_CLERK_ID', 'your@email.com', 'Your Name', 'basic', 'active');
```

---

## How It Works

### Authentication Flow:

1. **User clicks "Sign in with Google"**
2. **Clerk handles OAuth** → Creates/updates Clerk user
3. **Clerk generates JWT token** using the `supabase` template
4. **Token includes `sub` claim** = Clerk user ID
5. **Frontend sends token** to Supabase via `Authorization: Bearer <token>`
6. **Supabase RLS policies check** `auth.jwt()->>'sub'` against row's `user_id` or `id`
7. **If match:** Access granted ✅
8. **If no match:** 403 Forbidden ❌

### Profile Creation Flow:

1. **AuthContext detects new Clerk user**
2. **Checks if profile exists** in Supabase `profiles` table
3. **If not exists:** Inserts new profile with Clerk user ID
4. **RLS policy allows insert** because `auth.jwt()->>'sub'` matches the `id` being inserted
5. **Profile created** with default `basic` tier
6. **SubscriptionContext loads** subscription data
7. **App renders** dashboard

---

## Quick Fix Summary

If you're stuck right now:

### Option A: Create JWT Template (Recommended)
1. Clerk Dashboard → JWT Templates → New Template → Supabase
2. Name: `supabase`
3. Save
4. Wait 1-2 minutes
5. Hard refresh your app (Cmd+Shift+R)

### Option B: Manually Create Profile (Quick Workaround)
1. Get your Clerk user ID from console error (e.g., `user_356TBVm4Dsi2eoeqeHrtjXvIkMl`)
2. Run in Supabase SQL Editor:
```sql
INSERT INTO profiles (id, email, full_name, subscription_tier, subscription_status)
VALUES ('user_356TBVm4Dsi2eoeqeHrtjXvIkMl', 'your@email.com', 'Your Name', 'basic', 'active');
```
3. Refresh app

### Option C: Use Default Token (Not Recommended)
1. Edit `src/hooks/useSupabase.js` line 35:
```javascript
// Change from:
const clerkToken = globalGetToken ? await globalGetToken({ template: 'supabase' }) : null

// To:
const clerkToken = globalGetToken ? await globalGetToken() : null
```
2. Refresh app

**Note:** Option C may cause RLS policy issues because the default token might not have the correct `aud` claim.

---

## Expected Behavior After Fix

1. ✅ Sign in with Google → Redirects to onboarding
2. ✅ Profile automatically created in Supabase
3. ✅ Subscription loads with "basic" tier
4. ✅ Dashboard loads successfully
5. ✅ All features work correctly

---

## Production Checklist

Before going live:

- [ ] Clerk JWT template `supabase` exists and is configured
- [ ] Template includes `sub` claim with `{{user.id}}`
- [ ] Template includes `aud: "authenticated"`
- [ ] All `getToken()` calls use `{ template: 'supabase' }`
- [ ] RLS policies use `auth.jwt()->>'sub'` for user identification
- [ ] Test sign-in flow works end-to-end
- [ ] Test profile creation for new users
- [ ] Switch Clerk to production keys
- [ ] Update `.env` with production Clerk publishable key

---

## Additional Resources

- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
