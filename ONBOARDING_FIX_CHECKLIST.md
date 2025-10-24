# Onboarding Completion Fix - Implementation Checklist

**Issue:** User authenticated but onboarding data not saved, 157 console errors

**Root Cause:** Deprecated Clerk JWT template causing authentication failures

**Estimated Fix Time:** 45 minutes

---

## Pre-Implementation Verification

### 1. Run Database Verification
- [ ] Open Supabase SQL Editor
- [ ] Run `/Users/abemacmini/Documents/dashboard/verify-onboarding-state.sql`
- [ ] Confirm findings match analysis:
  - [ ] `onboarding_completed = FALSE`
  - [ ] `onboarding_data = NULL`
  - [ ] Storage locations: 0 or 3 rows?
  - [ ] User achievements: 0 rows (causing 406 errors)

### 2. Check Browser Console
- [ ] Open app at https://app.mealsaver.app/
- [ ] Login as test user
- [ ] Open browser DevTools → Console
- [ ] Count 406 errors
- [ ] Note which endpoints are failing

---

## Code Fixes

### Fix 1: Update useSupabase Hook ⭐ CRITICAL

**File:** `/Users/abemacmini/Documents/dashboard/src/hooks/useSupabase.js`

**Current Code (Lines 24-31):**
```javascript
fetch: async (url, options = {}) => {
  // Get Clerk JWT token with 'supabase' template
  const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)

  const headers = new Headers(options?.headers)
  if (clerkToken) {
    headers.set('Authorization', `Bearer ${clerkToken}`)
  }

  return fetch(url, {
    ...options,
    headers
  })
}
```

**Updated Code:**
```javascript
fetch: async (url, options = {}) => {
  // Get Clerk JWT token (no template - uses default)
  // Templates deprecated April 2025 - use default JWT with 'sub' claim
  const clerkToken = await getToken().catch((err) => {
    console.error('Failed to get Clerk token:', err)
    return null
  })

  const headers = new Headers(options?.headers)
  if (clerkToken) {
    headers.set('Authorization', `Bearer ${clerkToken}`)

    // DEBUG: Log token presence in development
    if (import.meta.env.DEV) {
      try {
        const payload = JSON.parse(atob(clerkToken.split('.')[1]))
        console.log('✅ Clerk JWT attached - user:', payload.sub)
      } catch (e) {
        console.warn('Could not decode JWT payload')
      }
    }
  } else {
    console.warn('⚠️ No Clerk token available - request will be unauthenticated')
  }

  return fetch(url, {
    ...options,
    headers
  })
}
```

**Changes:**
- ✅ Remove `{ template: 'supabase' }` from `getToken()`
- ✅ Add error logging (not silent catch)
- ✅ Add development mode JWT debugging
- ✅ Add warning when token missing

**Testing:**
```javascript
// Open browser console after fix
const { getToken } = window.Clerk
const token = await getToken()
console.log('Token:', token ? 'Present' : 'Missing')
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('User ID:', payload.sub)
}
```

- [ ] Code updated
- [ ] File saved
- [ ] Tested in browser console

---

### Fix 2: Update Badge Checker .single() Calls

**File:** `/Users/abemacmini/Documents/dashboard/src/services/badgeChecker.js`

**Current Code (Lines 256-270):**
```javascript
async function isBadgeAwarded(userId, badgeKey) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('unlocked_at')
    .eq('user_id', userId)
    .eq('achievement_key', badgeKey)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking badge:', error)
    return false
  }

  return data && data.unlocked_at !== null
}
```

**Updated Code:**
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

**Why:** `.maybeSingle()` returns `null` instead of 406 error when no rows found

- [ ] Code updated
- [ ] File saved

---

### Fix 3: Update Dashboard Profile Query

**File:** `/Users/abemacmini/Documents/dashboard/src/pages/Dashboard/index.jsx`

**Find (Line ~160):**
```javascript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('full_name, avatar')
  .eq('id', user.id)
  .single()
```

**Replace with:**
```javascript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('full_name, avatar')
  .eq('id', user.id)
  .maybeSingle()
```

- [ ] Code updated
- [ ] File saved

---

### Fix 4: Add Error Checking to completeOnboarding

**File:** `/Users/abemacmini/Documents/dashboard/src/pages/Onboarding/index.jsx`

**Find (Lines 634-656):**
```javascript
const { error: profileError} = await supabaseClient
  .from('profiles')
  .update({
    full_name: formData.name || null,
    subscription_tier: formData.subscriptionTier || 'basic',
    subscription_status: 'active',
    onboarding_completed: true,
    onboarding_data: {
      subscription_tier: formData.subscriptionTier,
      account_type: formData.accountType,
      household_name: formData.householdName || null,
      household_size: formData.householdSize || null,
      goals: formData.goals,
      notifications_enabled: formData.notifications,
      onboarded_at: new Date().toISOString()
    }
  })
  .eq('id', userId)

if (profileError) {
  console.error('Profile update error:', profileError)
  throw profileError // Block if profile creation fails
}
```

**Replace with:**
```javascript
const { data: updatedProfile, error: profileError, count } = await supabaseClient
  .from('profiles')
  .update({
    full_name: formData.name || null,
    subscription_tier: formData.subscriptionTier || 'basic',
    subscription_status: 'active',
    onboarding_completed: true,
    onboarding_data: {
      subscription_tier: formData.subscriptionTier,
      account_type: formData.accountType,
      household_name: formData.householdName || null,
      household_size: formData.householdSize || null,
      goals: formData.goals,
      notifications_enabled: formData.notifications,
      onboarded_at: new Date().toISOString()
    }
  })
  .eq('id', userId)
  .select()  // ← ADD THIS to get updated row back

if (profileError) {
  console.error('Profile update error:', profileError)
  throw profileError
}

// ← ADD THIS CHECK
if (!updatedProfile || updatedProfile.length === 0) {
  console.error('❌ Profile update affected 0 rows - possible authentication issue')
  console.error('This usually means the JWT token was not attached to the request')
  throw new Error('Failed to update profile - authentication error. Please try logging out and back in.')
}

console.log('✅ Profile updated successfully:', updatedProfile[0])
```

**Why:**
- Return updated row with `.select()`
- Check if update actually affected any rows
- Provide clear error message if auth failed

- [ ] Code updated
- [ ] File saved

---

### Fix 5: Search and Replace Remaining .single() Calls

**Run this command to find all .single() calls:**
```bash
cd /Users/abemacmini/Documents/dashboard
grep -rn "\.single()" src/ --include="*.jsx" --include="*.js"
```

**Files to check:**
- [ ] `src/services/achievements.js`
- [ ] `src/pages/Profile/index.jsx`
- [ ] `src/contexts/SubscriptionContext.jsx`
- [ ] Any other files found by grep

**For each occurrence:**
1. Check if query ALWAYS returns 1 row (like profile for current user)
   - If yes: Keep `.single()` but handle PGRST116 error
2. Check if query MIGHT return 0 rows (like achievements, subscriptions)
   - If yes: Change to `.maybeSingle()`

- [ ] All .single() calls reviewed
- [ ] Necessary changes made

---

## Database Fixes

### Fix 6: Manual Profile Update for Current User

**Run in Supabase SQL Editor:**

```sql
-- Fix profile for user_341ww7D6dXue7wJSrthVxNaTfCD
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_data = jsonb_build_object(
    'subscription_tier', 'basic',
    'account_type', 'personal',
    'goals', '["reduce-waste", "save-money", "meal-planning"]'::jsonb,
    'notifications_enabled', true,
    'onboarded_at', NOW()
  ),
  updated_at = NOW()
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';

-- Verify update
SELECT
  id,
  onboarding_completed,
  onboarding_data->>'subscription_tier' as tier,
  onboarding_data->>'account_type' as account_type,
  onboarding_data->'goals' as goals
FROM profiles
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
```

**Expected Output:**
```
id: user_341ww7D6dXue7wJSrthVxNaTfCD
onboarding_completed: true
tier: basic
account_type: personal
goals: ["reduce-waste", "save-money", "meal-planning"]
```

- [ ] SQL executed
- [ ] Results verified

---

### Fix 7: Verify/Create Storage Locations

**Run in Supabase SQL Editor:**

```sql
-- Check existing locations
SELECT id, name, icon FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD'
ORDER BY name;

-- If 0 rows returned, create them:
INSERT INTO storage_locations (user_id, name, icon)
VALUES
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Pantry', 'Package'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Refrigerator', 'Refrigerator'),
  ('user_341ww7D6dXue7wJSrthVxNaTfCD', 'Freezer', 'Snowflake')
ON CONFLICT (user_id, name) DO NOTHING;

-- Verify
SELECT COUNT(*) as location_count FROM storage_locations
WHERE user_id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
```

**Expected:** 3 locations

- [ ] Storage locations verified/created

---

## Testing

### Test 1: Verify JWT Attachment

**Open browser console on app.mealsaver.app:**

```javascript
// Test Clerk token
const { getToken } = window.Clerk
const token = await getToken()

if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('✅ JWT Test Results:')
  console.log('  - Token present: YES')
  console.log('  - User ID (sub):', payload.sub)
  console.log('  - Expires:', new Date(payload.exp * 1000))
  console.log('  - Issuer:', payload.iss)
} else {
  console.error('❌ No JWT token available')
}
```

**Expected:**
```
✅ JWT Test Results:
  - Token present: YES
  - User ID (sub): user_341ww7D6dXue7wJSrthVxNaTfCD
  - Expires: [future date]
  - Issuer: https://clerk.mealsaver.app
```

- [ ] JWT present
- [ ] Sub claim matches user ID
- [ ] Token not expired

---

### Test 2: Verify Profile Query Works

**Open browser console:**

```javascript
// Test authenticated profile query
const response = await fetch('https://[SUPABASE_URL]/rest/v1/profiles?id=eq.user_341ww7D6dXue7wJSrthVxNaTfCD&select=*', {
  headers: {
    'Authorization': `Bearer ${await window.Clerk.getToken()}`,
    'apikey': '[SUPABASE_ANON_KEY]',
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log('Profile query result:', data)
```

**Expected:**
- HTTP 200 (not 406)
- Profile data returned with `onboarding_completed = true`

- [ ] Query succeeded (200)
- [ ] Profile data correct
- [ ] No 406 error

---

### Test 3: Check Console Errors

**Steps:**
1. Hard refresh page (Cmd+Shift+R)
2. Open DevTools → Console
3. Click "Clear console"
4. Wait 5 seconds for page to load
5. Count errors

**Expected:**
- 0-5 errors (down from 157)
- No 406 errors from user_achievements
- No auth-related errors

**Actual Count:** _______

- [ ] Error count significantly reduced
- [ ] No 406 errors visible

---

### Test 4: Dashboard Data Loads

**Check dashboard displays:**
- [ ] Welcome message with user name
- [ ] Metrics cards (4 cards)
- [ ] No "Expiring Items" section (new user = no items)
- [ ] Waste reduction chart (empty but visible)
- [ ] Quick actions (4 cards)
- [ ] Recent activity (empty)

- [ ] All sections render correctly
- [ ] No loading spinners stuck
- [ ] No error messages displayed

---

### Test 5: Test New User Onboarding (Full Flow)

**Create a fresh test account:**

1. [ ] Navigate to /onboarding
2. [ ] Complete Step 1 (Welcome)
3. [ ] Select "Basic" plan (Step 2)
4. [ ] Sign up with test email (Step 3)
5. [ ] Complete personalization (Step 4)
6. [ ] Select goals (Step 5)
7. [ ] Click "Get Started"

**Check browser console:**
- [ ] No 406 errors during onboarding
- [ ] See "✅ Profile updated successfully" log
- [ ] See "✅ Clerk JWT attached" logs

**Check database:**
```sql
SELECT
  id,
  email,
  onboarding_completed,
  onboarding_data->>'subscription_tier' as tier,
  (SELECT COUNT(*) FROM storage_locations WHERE user_id = profiles.id) as location_count
FROM profiles
WHERE email = '[TEST_EMAIL]';
```

**Expected:**
- `onboarding_completed = TRUE`
- `tier = 'basic'`
- `location_count = 3`

- [ ] Test account created successfully
- [ ] Onboarding completed in database
- [ ] Storage locations created
- [ ] Dashboard loads without errors

---

## Deployment

### Pre-Deployment Checklist
- [ ] All code fixes implemented
- [ ] All tests passed
- [ ] Database manually fixed for current user
- [ ] No console errors on test account
- [ ] Git changes reviewed

### Deployment Steps

1. **Commit changes:**
```bash
cd /Users/abemacmini/Documents/dashboard
git add src/hooks/useSupabase.js
git add src/services/badgeChecker.js
git add src/pages/Dashboard/index.jsx
git add src/pages/Onboarding/index.jsx
git commit -m "Fix: Replace deprecated Clerk JWT template, resolve 406 errors from .single() calls

- Remove { template: 'supabase' } from useSupabase getToken()
- Replace .single() with .maybeSingle() in badge checker
- Add error checking to completeOnboarding profile update
- Add JWT debugging logs in development mode

Fixes:
- Onboarding data now saves correctly
- 157 console errors reduced to ~0
- Profile updates succeed with proper authentication
- Dashboard loads without 406 errors

BREAKING CHANGE: Requires Clerk SDK >= 5.0 with native Supabase integration"
```

2. **Push to production:**
```bash
git push origin main
```

3. **Monitor deployment:**
- [ ] Netlify build succeeds
- [ ] App deploys to https://app.mealsaver.app/
- [ ] No build errors in Netlify logs

4. **Post-deployment verification:**
- [ ] Test with current user account
- [ ] Create new test account
- [ ] Check Sentry/error logs for new errors

---

## Rollback Plan

If fixes cause new issues:

```bash
git revert HEAD
git push origin main
```

Then investigate further with more logging.

---

## Success Criteria

- ✅ New users can complete onboarding
- ✅ `onboarding_completed` set to TRUE in database
- ✅ `onboarding_data` contains goals, tier, etc.
- ✅ Storage locations created (3 rows)
- ✅ Console errors < 10 (down from 157)
- ✅ No 406 errors in console
- ✅ Dashboard loads all sections correctly
- ✅ Profile displays user information
- ✅ JWT tokens attached to all requests

---

## Additional Notes

### Why This Wasn't Caught Earlier

1. **Silent Failures:** Update affecting 0 rows doesn't throw error
2. **Misleading Logs:** Console showed "Onboarding completed successfully"
3. **Deprecated API:** Clerk changed JWT templates without breaking changes warning
4. **No Alerts:** Error monitoring (Sentry) likely didn't catch RLS blocks

### Prevention for Future

1. **Add Monitoring:**
   - Alert when onboarding_completed updates fail
   - Track % of users reaching dashboard vs completing onboarding
   - Monitor 406 error rates

2. **Add Tests:**
   - E2E test for full onboarding flow
   - Unit test for useSupabase JWT attachment
   - Integration test for profile RLS policies

3. **Add Validation:**
   - Check JWT token presence before critical operations
   - Verify row count after updates
   - Add health check endpoint for auth status

---

**Completion Date:** _________________
**Tested By:** _________________
**Deployed By:** _________________
**Status:** ☐ In Progress  ☐ Testing  ☐ Deployed  ☐ Verified
