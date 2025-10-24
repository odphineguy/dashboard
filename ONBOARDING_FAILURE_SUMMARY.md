# Onboarding Failure - Executive Summary

**Date:** 2025-10-23
**Priority:** CRITICAL
**Impact:** All new users cannot complete onboarding successfully
**Time to Fix:** 45 minutes

---

## Problem Statement

User authenticated successfully with Clerk and reached dashboard, BUT:
- Profile shows `onboarding_completed = FALSE` (expected: TRUE)
- Profile shows `onboarding_data = NULL` (expected: JSON with goals, tier, etc.)
- Console shows 157 errors (406 Not Acceptable)
- Dashboard appears broken to user

---

## Root Cause

**Deprecated Clerk JWT Template**

The `useSupabase` hook uses a deprecated Clerk JWT template:

```javascript
// BROKEN CODE (Line 26 of src/hooks/useSupabase.js)
const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)
```

**Why This Breaks Everything:**

1. Clerk deprecated JWT templates in April 2025
2. `getToken({ template: 'supabase' })` throws error
3. `.catch(() => null)` silently swallows error
4. No JWT attached to requests
5. Supabase sees unauthenticated requests
6. RLS policies block all writes
7. UPDATE affects 0 rows but returns no error
8. Frontend thinks onboarding succeeded
9. User lands on broken dashboard

---

## Impact Analysis

### Data Flow Breakdown

**What SHOULD happen:**
```
User clicks "Get Started"
  → completeOnboarding() called
    → getToken() returns JWT with sub claim
      → JWT attached to UPDATE request
        → Supabase RLS: auth.jwt()->>'sub' = user_id ✅
          → UPDATE succeeds
            → onboarding_completed = TRUE ✅
              → Navigate to dashboard ✅
```

**What ACTUALLY happens:**
```
User clicks "Get Started"
  → completeOnboarding() called
    → getToken({ template: 'supabase' }) throws error
      → .catch(() => null) returns null
        → NO JWT attached to UPDATE request ❌
          → Supabase RLS: auth.jwt() = NULL ❌
            → UPDATE blocked by RLS ❌
              → 0 rows affected
                → But error = null (query was valid) ❌
                  → Frontend: "Success!" ❌
                    → Navigate to dashboard
                      → 157 errors from .single() calls ❌
```

---

## The 406 Errors Explained

**Error:** `PGRST116 - Cannot coerce result to single JSON object`
**HTTP Status:** 406 Not Acceptable
**Count:** 157 errors

**Source:**

Dashboard calls badge checker on load:
```javascript
// Line 694 of Dashboard/index.jsx
checkBadges('login')
  → Loops through 90+ badge definitions
    → For each badge, calls isBadgeAwarded()
      → Query: user_achievements WHERE user_id = X AND achievement_key = Y
        → .single() expects 1 row
          → Table is empty (new user = 0 achievements)
            → Returns 406 error ❌
```

Repeated 90+ times = 157 total errors

---

## Fix Summary

### 3 Code Changes Required

**1. Fix useSupabase Hook (CRITICAL)**
```javascript
// Change this:
const clerkToken = await getToken({ template: 'supabase' }).catch(() => null)

// To this:
const clerkToken = await getToken().catch((err) => {
  console.error('Failed to get Clerk token:', err)
  return null
})
```

**2. Fix Badge Checker**
```javascript
// Change this:
.single()

// To this:
.maybeSingle()
```

**3. Add Error Checking to Onboarding**
```javascript
const { data, error } = await supabaseClient
  .from('profiles')
  .update({...})
  .eq('id', userId)
  .select()  // ← Add this

// Add this check:
if (!data || data.length === 0) {
  throw new Error('Failed to update profile - authentication error')
}
```

---

## Files to Modify

1. `/Users/abemacmini/Documents/dashboard/src/hooks/useSupabase.js` (Line 26)
2. `/Users/abemacmini/Documents/dashboard/src/services/badgeChecker.js` (Line 262)
3. `/Users/abemacmini/Documents/dashboard/src/pages/Onboarding/index.jsx` (Line 651)
4. `/Users/abemacmini/Documents/dashboard/src/pages/Dashboard/index.jsx` (Line 164)

---

## Database Fix (Temporary)

Fix current user manually:

```sql
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_data = jsonb_build_object(
    'subscription_tier', 'basic',
    'account_type', 'personal',
    'goals', '["reduce-waste", "save-money"]'::jsonb,
    'notifications_enabled', true,
    'onboarded_at', NOW()
  )
WHERE id = 'user_341ww7D6dXue7wJSrthVxNaTfCD';
```

---

## Testing Plan

### Quick Verification (5 min)

```javascript
// Browser console test
const token = await window.Clerk.getToken()
console.log(token ? '✅ JWT Working' : '❌ No JWT')
```

### Full Test (15 min)

1. Create new test account
2. Complete onboarding
3. Verify console has 0 errors
4. Verify database: `onboarding_completed = TRUE`

---

## Deployment Checklist

- [ ] Update `src/hooks/useSupabase.js`
- [ ] Update `src/services/badgeChecker.js`
- [ ] Update `src/pages/Onboarding/index.jsx`
- [ ] Update `src/pages/Dashboard/index.jsx`
- [ ] Test locally
- [ ] Run database fix for current user
- [ ] Commit changes
- [ ] Push to production
- [ ] Verify with test account

**Estimated Time:** 45 minutes total

---

## Success Metrics

**Before Fix:**
- ❌ onboarding_completed = FALSE
- ❌ onboarding_data = NULL
- ❌ 157 console errors
- ❌ Dashboard appears broken
- ❌ New users cannot onboard successfully

**After Fix:**
- ✅ onboarding_completed = TRUE
- ✅ onboarding_data = { goals, tier, etc. }
- ✅ 0-5 console errors
- ✅ Dashboard loads correctly
- ✅ New users onboard successfully

---

## Detailed Documentation

For complete analysis and step-by-step implementation:
- **Full Analysis:** `/Users/abemacmini/Documents/dashboard/ONBOARDING_FAILURE_ANALYSIS.md`
- **Fix Checklist:** `/Users/abemacmini/Documents/dashboard/ONBOARDING_FIX_CHECKLIST.md`
- **Database Verification:** `/Users/abemacmini/Documents/dashboard/verify-onboarding-state.sql`

---

## Questions Answered

### 1. Why did the profile UPDATE fail silently?

**Answer:**
- JWT template deprecated
- No JWT attached to request
- RLS blocked UPDATE
- Supabase returned `{ error: null, count: 0 }` (valid query, 0 rows affected)
- Frontend assumed success

### 2. What's causing the 406 errors?

**Answer:**
- Badge checker calls `.single()` on empty user_achievements table
- `.single()` returns 406 when no rows found
- Happens 90+ times per page load (one per badge type)

### 3. Is the useSupabase hook working correctly?

**Answer:**
- NO - `getToken({ template: 'supabase' })` is deprecated
- Returns null instead of JWT token
- All requests are unauthenticated

### 4. Did the storage locations get created?

**Answer:**
- Likely NO - same JWT issue blocks INSERT
- Run verification SQL to confirm

### 5. Is there a race condition?

**Answer:**
- No race condition
- Profile update simply failed (0 rows affected)
- Navigation succeeded regardless of update result

---

## Preventive Measures

### Add to Future Sprints

1. **Monitoring:**
   - Alert on onboarding_completed = FALSE for users > 24h old
   - Track 406 error rates
   - Monitor JWT token failures

2. **Testing:**
   - E2E test for full onboarding flow
   - Unit test for JWT attachment
   - Integration test for RLS policies

3. **Error Handling:**
   - Validate row count after critical UPDATEs
   - Check JWT presence before operations
   - Add retry logic for auth failures

---

**Next Steps:**
1. Read ONBOARDING_FIX_CHECKLIST.md
2. Implement 3 code fixes
3. Run database fix
4. Test with new account
5. Deploy to production

**Priority:** CRITICAL - affects all new user signups
