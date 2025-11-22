# Authentication Fix Summary - Google Sign-In Stuck Loading

## Problem
After deploying Stripe edge functions, Google OAuth sign-in gets stuck on the loading/onboarding screen with these errors:

```
GET .../profiles?...&id=eq.user_356TBVm4Dsi2eoeqeHrtjXvIkMl 406 (Not Acceptable)
Error: Cannot coerce the result to a single JSON object (PGRST116)
```

## Root Causes

1. **Missing JWT Template**: Clerk wasn't configured with a Supabase JWT template
2. **Profile Not Auto-Created**: New Clerk users didn't get Supabase profiles created
3. **Error Handling**: `.single()` threw errors when profile didn't exist

## Solutions Implemented

### 1. ✅ Updated `useSupabase.js` to Use Supabase JWT Template
**File:** `src/hooks/useSupabase.js:37`

**Change:**
```javascript
// Before:
const clerkToken = globalGetToken ? await globalGetToken() : null

// After:
const clerkToken = globalGetToken
  ? await globalGetToken({ template: 'supabase' }).catch((err) => {
      console.error('Failed to get Clerk token:', err)
      return null
    })
  : null
```

**Why:** Ensures Clerk sends JWT with correct claims (`sub`, `aud`) for Supabase RLS policies.

---

### 2. ✅ Added Auto-Profile Creation in AuthContext
**File:** `src/contexts/AuthContext.jsx`

**Added:**
- Profile sync mechanism that runs on sign-in
- Checks if profile exists for Clerk user
- Auto-creates profile with basic tier if missing
- Proper error handling and logging

**Key Code:**
```javascript
useEffect(() => {
  const syncUserProfile = async () => {
    if (!isLoaded || !isSignedIn || !clerkUser) return

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', clerkUser.id)
      .maybeSingle()

    // Create profile if doesn't exist
    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        full_name: clerkUser.fullName || '...',
        avatar_url: clerkUser.imageUrl || null,
        subscription_tier: 'basic',
        subscription_status: 'active',
      })
    }

    setProfileSynced(true)
  }

  syncUserProfile()
}, [isLoaded, isSignedIn, clerkUser?.id])
```

**Why:** Ensures every Clerk user has a corresponding Supabase profile.

---

### 3. ✅ Updated SubscriptionContext to Handle Missing Profiles
**File:** `src/contexts/SubscriptionContext.jsx:45`

**Changes:**
- Changed `.single()` to `.maybeSingle()` to allow 0 rows
- Added null check for profile before proceeding
- Returns default basic tier if profile doesn't exist yet

**Key Code:**
```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status, stripe_customer_id')
  .eq('id', user.id)
  .maybeSingle() // ✅ Allows 0 rows without throwing error

if (!profile) {
  console.log('Profile not found yet, waiting for sync...')
  setSubscription({ tier: 'basic', status: 'active', stripeCustomerId: null })
  return
}
```

**Why:** Prevents errors during the brief moment between sign-in and profile creation.

---

## Required: Configure Clerk JWT Template

**⚠️ CRITICAL STEP - You must do this in Clerk Dashboard:**

### Steps:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** (sidebar → Configure)
4. Click **"New template"**
5. Select **"Supabase"** from template options
6. Name it exactly: `supabase` (lowercase)
7. Verify it has these claims:
   ```json
   {
     "aud": "authenticated",
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```
8. Click **Save**

### Verification:

After creating the template, test in browser console:
```javascript
const token = await window.Clerk.session.getToken({ template: 'supabase' })
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token sub:', payload.sub) // Should match Clerk user ID
console.log('Token aud:', payload.aud) // Should be "authenticated"
```

---

## Testing the Fix

### 1. Test New User Sign-Up (Google OAuth)

1. Clear browser cache and cookies
2. Go to login page
3. Click "Sign in with Google"
4. Complete OAuth flow
5. **Expected:** Redirects to onboarding → Profile auto-created → Dashboard loads
6. **Check console:** Should see `✅ Profile created successfully for user: user_...`

### 2. Test Existing User Sign-In

1. Sign in with existing Google account
2. **Expected:** Loads existing profile → Subscription loads → Dashboard displays
3. No errors in console

### 3. Verify Profile in Supabase

```sql
-- Run in Supabase SQL Editor
SELECT id, email, full_name, subscription_tier, subscription_status
FROM profiles
WHERE id LIKE 'user_%' -- Clerk user IDs start with 'user_'
ORDER BY created_at DESC;
```

---

## Quick Workaround (If Still Stuck)

If you're still getting errors after following the steps above:

### Manually Create Profile for Your User:

1. Get your Clerk user ID from the console error (e.g., `user_356TBVm4Dsi2eoeqeHrtjXvIkMl`)
2. Run in Supabase SQL Editor:

```sql
INSERT INTO profiles (id, email, full_name, subscription_tier, subscription_status)
VALUES (
  'user_356TBVm4Dsi2eoeqeHrtjXvIkMl', -- Replace with your actual Clerk user ID
  'your-email@example.com',           -- Replace with your email
  'Your Name',                         -- Replace with your name
  'basic',
  'active'
);
```

3. Hard refresh the app (Cmd+Shift+R / Ctrl+Shift+F5)

---

## Expected Behavior After Fix

### Sign-In Flow:
1. ✅ User clicks "Sign in with Google"
2. ✅ Clerk handles OAuth → User authenticated
3. ✅ App checks if profile exists in Supabase
4. ✅ If not exists → Auto-creates profile with basic tier
5. ✅ SubscriptionContext loads subscription data
6. ✅ Redirects to dashboard
7. ✅ All features work correctly

### Console Logs:
```
Creating new profile for Clerk user: user_356TBVm4Dsi2eoeqeHrtjXvIkMl
✅ Profile created successfully for user: user_356TBVm4Dsi2eoeqeHrtjXvIkMl
```

### No Errors:
- ❌ No "406 Not Acceptable" errors
- ❌ No "PGRST116" errors
- ❌ No stuck loading screens

---

## Files Modified

1. **`src/hooks/useSupabase.js`** - Added `{ template: 'supabase' }` to `getToken()` call
2. **`src/contexts/AuthContext.jsx`** - Added profile sync mechanism
3. **`src/contexts/SubscriptionContext.jsx`** - Changed `.single()` to `.maybeSingle()`

---

## Troubleshooting

### Error: "Invalid JWT template name"
**Solution:** Create the `supabase` JWT template in Clerk Dashboard (see steps above)

### Error: Still getting 406 errors
**Check:**
1. JWT template exists and is named `supabase`
2. Hard refresh browser (Cmd+Shift+R)
3. Check if token has `sub` claim:
   ```javascript
   const token = await window.Clerk.session.getToken({ template: 'supabase' })
   console.log(JSON.parse(atob(token.split('.')[1])))
   ```

### Error: Profile not created
**Check:**
1. RLS policies allow insert: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`
2. Token `sub` matches user ID
3. Manually create profile (see Quick Workaround above)

### Error: "Failed to get Clerk token"
**Check:**
1. Clerk publishable key is set in `.env`: `VITE_CLERK_PUBLISHABLE_KEY`
2. User is fully signed in: `console.log(window.Clerk.user)`
3. Session exists: `console.log(window.Clerk.session)`

---

## Summary

The authentication issue was caused by:
1. Missing Clerk JWT template for Supabase
2. No automatic profile creation for new Clerk users
3. Strict error handling that didn't allow for missing profiles

The fix implements:
1. ✅ Proper JWT template usage
2. ✅ Automatic profile creation on first sign-in
3. ✅ Graceful handling of missing profiles

**Next step:** Configure the Clerk JWT template in the dashboard, then test sign-in.
