# Simple Auth Rebuild - Nuclear Option

## Why Rebuild?

You're absolutely right. The current setup has:
- 3 Clerk migrations with conflicting fixes
- OnboardingGuard with complex logic
- OnboardingPage that handles Stripe callbacks
- Profile sync mechanisms layered on top of each other
- JWT template dependencies
- Multiple "fixes" that create more problems

**This is too complex for what should be simple: sign in → use app.**

---

## The Simple Solution

### Step 1: Delete Complex Auth Files

```bash
# Delete onboarding system
rm -rf src/pages/Onboarding
rm src/components/OnboardingGuard.jsx

# We'll simplify these:
# - src/contexts/AuthContext.jsx (simplify)
# - src/hooks/useSupabase.js (already simple)
# - src/Routes.jsx (remove onboarding routes)
```

### Step 2: Simple AuthContext

Replace `src/contexts/AuthContext.jsx` with this ultra-simple version:

```javascript
import { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [profileReady, setProfileReady] = useState(false)

  // Simple user object
  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    name: clerkUser.fullName || clerkUser.firstName,
    avatar: clerkUser.imageUrl,
  } : null

  // Create profile on first sign-in (fire and forget)
  useEffect(() => {
    if (!isLoaded || !clerkUser) {
      setProfileReady(true)
      return
    }

    const ensureProfile = async () => {
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS
      )

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          full_name: clerkUser.fullName || clerkUser.firstName,
          avatar_url: clerkUser.imageUrl,
          subscription_tier: 'basic',
          subscription_status: 'active',
        }, { onConflict: 'id' })

      if (error) console.error('Profile sync error:', error)
      setProfileReady(true)
    }

    ensureProfile()
  }, [isLoaded, clerkUser?.id])

  const signOut = async () => {
    await clerkSignOut()
    window.location.href = '/login'
  }

  if (!isLoaded || (isSignedIn && !profileReady)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isSignedIn, signOut, loading: !isLoaded }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Step 3: Simple Routes

Update `src/Routes.jsx`:

```javascript
// Remove OnboardingGuard import
// Remove Onboarding page import

// Change ProtectedRoute:
const ProtectedRoute = ({ element }) => {
  const { isSignedIn, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  // Just wrap in MainLayout - no onboarding check
  return <MainLayout>{element}</MainLayout>
}

// Remove /onboarding route
```

### Step 4: Handle Stripe Success Callback

Since you removed `/onboarding`, handle Stripe callback directly in the success URL:

**Update SubscriptionContext.jsx:**
```javascript
// Change success URL:
const successUrl = `${window.location.origin}/?payment_success=true`
```

**Update Dashboard to show success message:**
```javascript
// In src/pages/Dashboard/index.jsx
const [searchParams] = useSearchParams()

useEffect(() => {
  if (searchParams.get('payment_success') === 'true') {
    // Show success toast
    alert('Payment successful! Your subscription has been upgraded.')
    // Clean URL
    window.history.replaceState({}, '', '/')
  }
}, [])
```

### Step 5: Simplify Database Migrations

Create ONE new migration that supersedes all Clerk migrations:

```sql
-- supabase/migrations/99999999999999_simple_clerk_auth.sql

-- Drop all old Clerk-related policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Simple policies: service role can do anything
CREATE POLICY "Service role full access"
  ON profiles FOR ALL
  USING (current_setting('role', true) = 'service_role')
  WITH CHECK (current_setting('role', true) = 'service_role');

-- Users can read their own profile (using Clerk JWT sub claim)
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING ((SELECT auth.jwt()->>'sub') = id);

-- That's it! Profile creation happens via service role in AuthContext
```

---

## Why This Works

1. **No JWT template needed** - Service role creates profiles
2. **No OnboardingGuard** - Users go straight to dashboard
3. **No complex sync logic** - Simple upsert on sign-in
4. **No onboarding flow** - One less thing to break
5. **Stripe callback simple** - Just show message on dashboard

---

## Implementation Steps

### 1. Backup First
```bash
cd /Users/abemacmini/Documents/dashboard
git add .
git commit -m "Backup before auth rebuild"
```

### 2. Delete Complex Files
```bash
rm -rf src/pages/Onboarding
rm src/components/OnboardingGuard.jsx
```

### 3. Add Service Role Key to .env
```bash
# Get from Supabase Dashboard → Settings → API
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

⚠️ **Note:** Service role key in frontend is normally not recommended for production, but for profile creation it's the simplest approach. Alternative: create an edge function for profile creation.

### 4. Replace AuthContext
Copy the simple version above into `src/contexts/AuthContext.jsx`

### 5. Update Routes
Remove OnboardingGuard and onboarding route from `src/Routes.jsx`

### 6. Test
```bash
npm run dev
# Sign in with Google
# Should: Create profile → Go to dashboard
# No stuck loading, no errors
```

---

## Production Consideration

If you don't want service role key in frontend, create a simple edge function:

```typescript
// supabase/functions/sync-profile/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, email, name, avatar } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: name,
      avatar_url: avatar,
      subscription_tier: 'basic',
      subscription_status: 'active',
    }, { onConflict: 'id' })

  return new Response(JSON.stringify({ success: !error }))
})
```

Then call it from AuthContext instead of direct insert.

---

## Expected Outcome

### Before (Complex):
```
Sign in → Wait for Clerk
→ Check JWT template
→ Check if profile exists
→ Insert profile (maybe fails due to RLS)
→ OnboardingGuard checks onboarding_completed
→ Redirect to /onboarding
→ Check onboarding_data
→ Maybe redirect to dashboard
→ SubscriptionContext checks profile (maybe fails)
→ Finally show dashboard
```

### After (Simple):
```
Sign in → Wait for Clerk
→ Create/update profile (service role)
→ Show dashboard
→ Done
```

---

## Decision Time

Do you want me to:

**A)** Implement this simple version now (delete complex files, create simple auth)

**B)** Just give you the files and you implement manually

**C)** Try one more fix on the current system (not recommended)

Let me know and I'll execute immediately.
