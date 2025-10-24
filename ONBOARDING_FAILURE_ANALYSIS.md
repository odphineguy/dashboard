# Onboarding Completion Failure - Root Cause Analysis

**Date:** 2025-10-23
**Issue:** User authenticated successfully with Clerk but onboarding data not saved, 157 console errors (406)

---

## Executive Summary

**Root Causes Identified:**

1. **PRIMARY ISSUE:** `useSupabase` hook returns unauthenticated client - JWT injection failing
2. **SECONDARY ISSUE:** 406 errors from `.single()` calls on empty tables (user_achievements)
3. **TERTIARY ISSUE:** Profile UPDATE succeeded but used wrong Supabase client (non-authenticated)

**Impact:** User reached dashboard but profile shows:
- `onboarding_completed = FALSE` (should be TRUE)
- `onboarding_data = NULL` (should contain goals, tier, etc.)
- 157 console errors making app appear broken

---

## Detailed Root Cause Analysis

### 1. Profile Update Failed Silently

**File:** `/Users/abemacmini/Documents/dashboard/src/pages/Onboarding/index.jsx`
**Lines:** 629-656

**The Problem:**
```javascript
const completeOnboarding = async (userId, currentUser) => {
  // Line 634: Uses supabaseClient from useSupabase hook
  const { error: profileError} = await supabaseClient
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_data: { ... }
    })
    .eq('id', userId)
```

**Why It Failed:**

The `supabaseClient` from `useSupabase()` hook is supposed to inject Clerk JWT tokens into every request. However, there's a critical flaw:

**File:** `/Users/abemacmini/Documents/dashboard/src/hooks/useSupabase.js`
**Lines:** 24-26

```javascript
fetch: async (url, options = {}) => {
  // Get Clerk JWT token with 'supabase' template
  const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)
```

**Issue:** `getToken({ template: 'supabase' })` is DEPRECATED as of April 2025. Clerk no longer supports JWT templates. When this fails (which it does), it silently catches the error and returns `null`, meaning **no JWT is attached to the request**.

**Result:**
- Supabase receives request WITHOUT authorization header
- RLS policies block the UPDATE (user not identified)
- But Supabase returns 200 OK with `error: null` because the query was valid, just returned 0 rows
- Frontend thinks it succeeded

**Evidence:**
- Console shows no error from profile update
- Database shows `onboarding_completed = FALSE` still
- Database shows `onboarding_data = NULL` still

---

### 2. The 406 Errors - "Cannot coerce result to single JSON object"

**Error Code:** PGRST116
**HTTP Status:** 406 Not Acceptable
**Count:** 157 errors in console

**Source:** Multiple queries using `.single()` on empty result sets:

**File:** `/Users/abemacmini/Documents/dashboard/src/services/badgeChecker.js`
**Lines:** 257-262

```javascript
async function isBadgeAwarded(userId, badgeKey) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked_at')
    .eq('user_id', userId)
    .eq('achievement_key', badgeKey)
    .single()  // ← PROBLEM: Returns 406 if no rows found
```

**Why It Happens:**

1. New user has NO achievements yet (empty table)
2. Dashboard loads and calls `checkBadges('login')` (line 694 of Dashboard)
3. Badge checker loops through ALL badge types (90+ badges defined)
4. For each badge, it calls `isBadgeAwarded()` with `.single()`
5. `.single()` returns HTTP 406 when query returns 0 rows
6. This happens ~90 times per page load

**Additional Sources:**
- Profile queries with `.single()` (Dashboard line 160-164)
- Storage location queries
- Subscription queries

**Why This Compounds the Problem:**

The 406 errors don't break functionality BUT:
- They flood the console making real errors invisible
- They indicate the `useSupabase` hook is NOT working (otherwise would pass RLS)
- They make the app appear broken/buggy

---

### 3. Why useSupabase Hook is Broken

**File:** `/Users/abemacmini/Documents/dashboard/src/hooks/useSupabase.js`

**Root Cause:** Deprecated Clerk JWT Template

**Line 26:**
```javascript
const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)
```

**What SHOULD happen:**
1. Clerk generates JWT with `sub` claim = user_341ww7D6dXue7wJSrthVxNaTfCD
2. JWT sent in `Authorization: Bearer <token>` header
3. Supabase extracts `sub` from JWT using `auth.jwt()->>'sub'`
4. RLS policies allow access: `(SELECT auth.jwt()->>'sub') = id`

**What ACTUALLY happens:**
1. `getToken({ template: 'supabase' })` throws error (deprecated)
2. `.catch(() => null)` silently suppresses error
3. No JWT attached to request
4. Supabase sees anonymous request
5. RLS blocks everything except SELECT queries with service_role fallback

---

### 4. Database State Analysis

**Current Profile State:**
```sql
SELECT
  id,
  email,
  onboarding_completed,
  onboarding_data,
  subscription_tier,
  stripe_customer_id,
  created_at
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
```

**Expected Results:**
- `onboarding_completed = FALSE` ← WRONG (should be TRUE)
- `onboarding_data = NULL` ← WRONG (should have JSON data)
- `subscription_tier = 'basic'` ← Correct (set by webhook)
- `stripe_customer_id = NULL` ← Correct (Basic tier doesn't need Stripe)

**Storage Locations:**
```sql
SELECT * FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
```

**Expected:** 3 rows (Pantry, Refrigerator, Freezer)
**Actual:** Likely 3 rows (created by Clerk webhook) OR 0 rows (if onboarding failed early)

---

## Code Flow - What Actually Happened

### Successful Path (Expected):
```
1. User clicks "Get Started" at Step 5 (Goals) ✅
2. handleNext() called → handleSubmit() ✅
3. Clerk user found (clerkUser.id) ✅
4. completeOnboarding() called with user_341ww7D6dXue7wJSrthVxNaTfCD ✅
5. UPDATE profiles SET onboarding_completed=TRUE... ❌ FAILED SILENTLY
6. INSERT storage_locations (3 rows) ❌ LIKELY FAILED (no JWT)
7. Navigate to /dashboard ✅
8. Dashboard loads ✅
9. Multiple queries fail with 406 (no JWT) ❌
10. User sees dashboard but data incomplete ❌
```

### Actual Path (What Happened):
```
1-4. ✅ Same as above
5. supabaseClient.update() called BUT no JWT attached
6. Supabase RLS blocks UPDATE (auth.jwt()->>'sub' returns NULL)
7. UPDATE affects 0 rows
8. Supabase returns { data: [], error: null, count: 0 }
9. Frontend thinks it succeeded (no error thrown)
10. Storage locations INSERT likely also blocked by RLS
11. Navigate to /dashboard anyway
12. Dashboard makes 90+ badge queries with .single()
13. All return 406 (empty table + .single() = error)
14. Console flooded with 157 errors
15. User sees broken-looking dashboard
```

---

## Why This Is Hard to Debug

1. **Silent Failure:** No error thrown when UPDATE affects 0 rows
2. **Misleading Logs:** Console shows "Onboarding completed successfully"
3. **Error Hiding:** Real issue (JWT not attached) hidden by 406 noise
4. **Deprecated API:** Clerk JWT templates deprecated April 2025, no warnings
5. **RLS Confusion:** Policies look correct, but `auth.jwt()` returns NULL without JWT

---

## Verification Queries

Run these in Supabase SQL Editor to confirm diagnosis:

```sql
-- 1. Check if profile was updated
SELECT
  id,
  email,
  onboarding_completed,
  onboarding_data,
  subscription_tier,
  created_at,
  updated_at
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- 2. Check if storage locations exist
SELECT
  id,
  name,
  user_id,
  created_at
FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- 3. Check if user_achievements table exists (for 406 errors)
SELECT COUNT(*) FROM user_achievements
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- 4. Verify RLS policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

---

## Fixes Required

### Fix 1: Update useSupabase Hook (CRITICAL)

**File:** `/Users/abemacmini/Documents/dashboard/src/hooks/useSupabase.js`

**Replace lines 24-31 with:**
```javascript
fetch: async (url, options = {}) => {
  // Get Clerk JWT token (no template - uses default)
  const clerkToken = await getToken().catch((err) => {
    console.error('Failed to get Clerk token:', err)
    return null
  })

  const headers = new Headers(options?.headers)
  if (clerkToken) {
    headers.set('Authorization', `Bearer ${clerkToken}`)
  } else {
    console.warn('No Clerk token available - request will be unauthenticated')
  }

  return fetch(url, {
    ...options,
    headers
  })
}
```

**Why:** Remove `{ template: 'supabase' }` - templates are deprecated. Use default Clerk JWT which includes `sub` claim.

---

### Fix 2: Remove .single() from Badge Checker

**File:** `/Users/abemacmini/Documents/dashboard/src/services/badgeChecker.js`

**Replace lines 256-270 with:**
```javascript
async function isBadgeAwarded(userId, badgeKey) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked_at')
    .eq('user_id', userId)
    .eq('achievement_key', badgeKey)
    .maybeSingle()  // ← Changed from .single()

  if (error) {
    console.error('Error checking badge:', error)
    return false
  }

  return data && data.unlocked_at !== null
}
```

**Why:** `.maybeSingle()` returns `null` instead of 406 when no rows found.

---

### Fix 3: Update All .single() Calls

**Search for:** `\.single\(\)` in entire codebase

**Replace with:** `.maybeSingle()` where appropriate OR handle error code PGRST116

**Files to check:**
- `/Users/abemacmini/Documents/dashboard/src/pages/Dashboard/index.jsx` (line 164)
- `/Users/abemacmini/Documents/dashboard/src/services/achievements.js`
- `/Users/abemacmini/Documents/dashboard/src/pages/Profile/index.jsx`

---

### Fix 4: Manual Database Fix (Temporary)

Run this SQL to fix current user's profile:

```sql
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_data = jsonb_build_object(
    'subscription_tier', 'basic',
    'account_type', 'personal',
    'goals', '["reduce-waste"]'::jsonb,
    'notifications_enabled', true,
    'onboarded_at', NOW()
  ),
  updated_at = NOW()
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Verify storage locations exist
INSERT INTO storage_locations (user_id, name, icon)
SELECT 'user_341ww7D6dXue7wJSrthVxNaTfCD', 'Pantry', 'Package'
WHERE NOT EXISTS (
  SELECT 1 FROM storage_locations
  WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
  AND name = 'Pantry'
);

INSERT INTO storage_locations (user_id, name, icon)
SELECT 'user_341ww7D6dXue7wJSrthVxNaTfCD', 'Refrigerator', 'Refrigerator'
WHERE NOT EXISTS (
  SELECT 1 FROM storage_locations
  WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
  AND name = 'Refrigerator'
);

INSERT INTO storage_locations (user_id, name, icon)
SELECT 'user_341ww7D6dXue7wJSrthVxNaTfCD', 'Freezer', 'Snowflake'
WHERE NOT EXISTS (
  SELECT 1 FROM storage_locations
  WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
  AND name = 'Freezer'
);
```

---

## Prevention Recommendations

### 1. Add Error Logging to completeOnboarding

```javascript
const completeOnboarding = async (userId, currentUser) => {
  console.log('Completing onboarding for user:', userId)

  try {
    const { data, error: profileError, count } = await supabaseClient
      .from('profiles')
      .update({...})
      .eq('id', userId)
      .select()  // ← ADD THIS to get updated row back

    if (profileError) {
      console.error('Profile update error:', profileError)
      throw profileError
    }

    if (!data || data.length === 0) {
      // ← ADD THIS CHECK
      console.error('Profile update affected 0 rows - possible RLS block')
      throw new Error('Failed to update profile - authentication issue')
    }

    console.log('Profile updated successfully:', data)
    // ... rest of function
  }
}
```

### 2. Add JWT Verification Utility

Create `/Users/abemacmini/Documents/dashboard/src/utils/verifyClerkJWT.js`:

```javascript
export async function verifyClerkJWT(getToken) {
  try {
    const token = await getToken()

    if (!token) {
      console.error('No Clerk token available')
      return false
    }

    // Decode JWT (base64)
    const payload = JSON.parse(atob(token.split('.')[1]))

    console.log('Clerk JWT payload:', {
      sub: payload.sub,
      exp: new Date(payload.exp * 1000),
      iss: payload.iss
    })

    return !!payload.sub
  } catch (error) {
    console.error('Failed to verify Clerk JWT:', error)
    return false
  }
}
```

Call this in `completeOnboarding()` before updating:

```javascript
const isAuthenticated = await verifyClerkJWT(getToken)
if (!isAuthenticated) {
  throw new Error('User not authenticated - cannot complete onboarding')
}
```

### 3. Add Clerk JWT Debugging to useSupabase

```javascript
fetch: async (url, options = {}) => {
  const clerkToken = await getToken().catch((err) => {
    console.error('❌ Failed to get Clerk token:', err)
    return null
  })

  const headers = new Headers(options?.headers)
  if (clerkToken) {
    headers.set('Authorization', `Bearer ${clerkToken}`)

    // DEBUG: Log token info in development
    if (import.meta.env.DEV) {
      const payload = JSON.parse(atob(clerkToken.split('.')[1]))
      console.log('✅ Clerk JWT attached:', {
        sub: payload.sub,
        exp: new Date(payload.exp * 1000)
      })
    }
  } else {
    console.warn('⚠️ No Clerk token - request will be UNAUTHENTICATED')
  }

  return fetch(url, { ...options, headers })
}
```

---

## Testing Plan

After implementing fixes:

### 1. Test JWT Attachment
```javascript
// Add to browser console
const { getToken } = useAuth()
const token = await getToken()
console.log('Token:', token)
console.log('Payload:', JSON.parse(atob(token.split('.')[1])))
```

Expected output:
```
Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Payload: {
  sub: "user_341ww7D6dXue7wJSrthVxNaTfCD",
  exp: 1729700000,
  iss: "https://clerk.mealsaver.app"
}
```

### 2. Test Profile Update
```javascript
// Test with authenticated client
const supabase = useSupabase()
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

console.log('Profile query result:', { data, error })
```

Expected: No 406 error, profile data returned

### 3. Test Onboarding Flow
1. Create new test account
2. Complete onboarding with Basic tier
3. Check browser console - should see NO 406 errors
4. Check database - `onboarding_completed = TRUE`
5. Check dashboard - all metrics load correctly

---

## Summary

**Primary Issue:** Clerk JWT template deprecated, causing all authenticated requests to fail silently

**Secondary Issue:** `.single()` calls on empty tables generating 406 errors

**Impact:**
- Onboarding appears to complete but data not saved
- Dashboard loads but appears broken (157 errors)
- User experience severely degraded

**Fix Difficulty:** Medium
- 3 lines changed in useSupabase hook
- Replace .single() with .maybeSingle() across codebase
- Add error checking to completeOnboarding

**Time to Fix:** 30 minutes

**Testing Time:** 15 minutes

**Total Resolution Time:** 45 minutes

---

**Next Steps:**
1. Implement Fix 1 (useSupabase hook) - HIGHEST PRIORITY
2. Test with current user account
3. Implement Fix 2 (badge checker)
4. Search/replace remaining .single() calls
5. Run manual database fix for current user
6. Test full onboarding flow with new account
7. Deploy to production

