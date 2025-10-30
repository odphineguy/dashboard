# MealSaver Architecture Analysis & Fix Report

## Executive Summary

This document outlines the architectural differences between the broken MealSaver app and the working MealSaver Rebuild. The primary issue in the broken app is **authentication confusion between Supabase Auth and Clerk**, which causes onboarding and authentication failures.

---

## Critical Problem Identified

### The Broken App's Core Issue

The broken MealSaver app (meal_saver) has a **dual authentication system conflict**:

1. **Uses Supabase's native authentication** (`auth.users` table)
2. **Also tries to integrate Clerk** (via `clerk_user_id()` function)
3. **Result**: Authentication fails because the two systems don't properly sync

**Evidence from Schema:**
- Has `auth.users` table (Supabase Auth)
- Has `profiles` table referencing `auth.users.id` (Supabase-style)
- RLS policies use `clerk_user_id()` function (expecting Clerk)
- User IDs are TEXT type (Clerk uses text-based IDs, Supabase uses UUIDs)
- Recent migration (#10) shows "Standardize user ID columns to text" - indicating ongoing struggles

### The Working App's Solution

MealSaver Rebuild uses **pure Clerk authentication** with proper Supabase integration:

1. **Clerk handles all authentication** (login, signup, OAuth)
2. **Supabase uses Clerk's JWT tokens** for database access
3. **Clean integration** via Clerk's Supabase template
4. **No dual system confusion**

---

## Architectural Comparison

### Authentication Flow

#### Broken App (meal_saver)
```
User → Clerk OR Supabase Auth → Confusion
├── Creates profile in auth.users (if Supabase Auth)
├── Creates profile in public.profiles
├── Clerk JWT might not match
└── RLS policies expect clerk_user_id() but system isn't unified
```

**Problems:**
- Race conditions between two auth systems
- `clerk_user_id()` function expects Clerk JWT in `request.jwt.claims`
- But if user signed up with Supabase Auth, that JWT structure is different
- Database can't determine which auth system the user came from

#### Working App (mealsaverRebuild)
```
User → Clerk (ONLY) → Clerk JWT Token → Supabase Database
├── Clerk manages authentication entirely
├── Supabase receives Clerk JWT via request.jwt.claims
├── `requesting_user_id()` extracts Clerk user_id from JWT
└── RLS policies work perfectly because JWT structure is consistent
```

**Why this works:**
- Single source of truth (Clerk)
- Consistent JWT structure from Clerk
- `requesting_user_id()` always gets the right user ID
- No ambiguity about authentication method

---

## Code-Level Implementation

### 1. Client-Side Authentication

#### Working App (`src/integrations/supabase/client.ts`)

```typescript
export function useSupabaseClient() {
  const { getToken, isSignedIn } = useAuth(); // Clerk hook
  
  useEffect(() => {
    async function createAuthClient() {
      if (!isSignedIn) return;
      
      // Get JWT from Clerk with 'supabase' template
      const token = await getToken({ template: 'supabase' });
      
      // Create Supabase client with Clerk JWT in headers
      const authClient = createClient(SUPABASE_URL, KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`, // This is the KEY
          },
        },
      });
      
      setClient(authClient);
    }
    
    createAuthClient();
  }, [getToken, isSignedIn]);
  
  return client;
}
```

**Critical Points:**
1. Uses Clerk's `useAuth()` hook - single auth system
2. Gets JWT with `getToken({ template: 'supabase' })` - this tells Clerk to add Supabase-compatible claims
3. Passes JWT in `Authorization` header to Supabase
4. Supabase receives JWT in `request.jwt.claims` - standard location

#### Broken App (likely implementation)
Would have something like:
- Attempts to use Supabase Auth client directly
- OR attempts to pass Clerk JWT without proper template
- Multiple auth clients competing

### 2. Middleware Protection

#### Working App (`src/middleware.ts`)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublic = createRouteMatcher(['/', '/sign-in', '/sign-up', '/api/webhook']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) {
    return NextResponse.next();
  }
  
  const { userId } = await auth(); // Get user from Clerk
  
  if (!userId) {
    // Redirect to Clerk sign-in
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
});
```

**Why this works:**
- Uses Clerk v6's `clerkMiddleware` API
- Checks authentication via Clerk directly
- Routes are protected at the middleware level
- No confusion about which auth system to check

### 3. Database RLS Policies

#### Working App (`supabase/migrations/00001_create_subscriptions.sql`)

```sql
-- Function to get user ID from JWT claims
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- RLS Policy
CREATE POLICY "Select subscriptions policy" ON subscriptions
  FOR SELECT TO authenticated
  USING (requesting_user_id() = user_id);
```

**How this works:**
1. Supabase receives JWT in Authorization header
2. JWT is stored in `request.jwt.claims` by Supabase
3. `requesting_user_id()` extracts the 'sub' claim (Clerk's user ID)
4. RLS policies compare this against database `user_id`
5. User can only see their own data

**The Key Connection:**
```
Clerk → JWT with 'sub' claim → Supabase receives it →
requesting_user_id() extracts 'sub' → Matches against user_id column
```

### 4. Server-Side API Routes

#### Working App (`src/app/api/create-checkout-session/route.ts`)

```typescript
import { currentUser } from '@clerk/nextjs/server'; // IMPORTANT: from /server

export async function POST(req: NextRequest) {
  const user = await currentUser(); // Gets user from Clerk
  const userId = user?.id; // Clerk's user_id format
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Use userId from Clerk for database operations
  await supabase.from('subscriptions').upsert({
    user_id: userId, // This matches RLS policy expectation
    ...
  });
}
```

**Critical:**
- Uses `@clerk/nextjs/server` for server-side operations
- Gets user ID directly from Clerk
- Uses same user_id format as database expects
- No auth system confusion

---

## Database Schema Analysis

### Broken App (meal_saver) - From Schema Document

**Key Tables:**
```sql
-- Uses Supabase auth.users
auth.users (id uuid, email, encrypted_password, ...)

-- Tries to connect to both systems
profiles (
  id text, -- References auth.users.id OR clerk user_id?
  full_name text,
  email text,
  subscription_tier text,
  subscription_status text,
  ...
)
```

**Problems Identified:**
1. `profiles.id` is TEXT - trying to accommodate both UUID and text IDs
2. Not clear if it's referencing `auth.users.id` (UUID) or Clerk user_id (text)
3. RLS policy expects `clerk_user_id()` but table might have Supabase users
4. Migration history shows ongoing fixes ("Standardize user ID columns to text")

**RLS Policy Example:**
```sql
-- Broken app's policy structure
CREATE POLICY "Select profiles policy" ON profiles
  FOR SELECT TO authenticated
  USING (clerk_user_id() = id);
```

**Why this fails:**
- If user signed up via Supabase Auth: `id` is UUID, `clerk_user_id()` returns NULL
- If user signed up via Clerk: `id` is text, might not match format
- The `clerk_user_id()` function assumes JWT has Clerk structure, which it might not

### Working App (mealsaverRebuild)

**Simplified Schema:**
```sql
subscriptions (
  id uuid,
  user_id text NOT NULL, -- Clerk user_id (consistent format)
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  status text,
  ...
)
```

**Why this works:**
1. Only uses `user_id` (text) - Clerk's format
2. No references to `auth.users`
3. No dual authentication confusion
4. RLS policies use `requesting_user_id()` which is implemented correctly

---

## Clerk JWT Integration Deep Dive

### The JWT Template System

Clerk has a "template" system for customizing JWT tokens:

```javascript
// In Clerk Dashboard → JWT Templates
{
  "name": "supabase",
  "claims": {
    "sub": "{{user.id}}",
    "email": "{{user.primary_email_address}}",
    ...
  }
}
```

**What this does:**
- When you call `getToken({ template: 'supabase' })`
- Clerk generates a JWT with the claims defined in the template
- This JWT has `sub` claim containing Clerk's user ID
- Supabase receives this and stores it in `request.jwt.claims`

### Broken App's Likely Issues

Looking at the schema, the broken app has:

```sql
CREATE OR REPLACE FUNCTION clerk_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;
```

**The problem:**
- This function exists and looks correct
- BUT: It only works if JWT is properly formatted with 'sub' claim
- If the JWT doesn't have the Supabase template applied, 'sub' is NULL
- If user signed up via Supabase Auth (not Clerk), JWT has different structure
- Function returns NULL, RLS blocks access

---

## Onboarding Flow Analysis

### Broken App's Onboarding Issue

From schema:
```sql
profiles (
  id text,
  full_name text,
  onboarding_completed boolean,
  onboarding_data jsonb,
  ...
)
```

**The Problem:**
1. User signs up → system tries to create profile
2. But `profiles.id` doesn't know which auth system to use
3. If created via Clerk: tries to insert Clerk user_id
4. If created via Supabase: tries to insert UUID
5. Database constraint or RLS policy fails
6. Profile creation fails → onboarding fails
7. User stuck in "onboarding not completed" state

**Why RLS Might Block:**
```sql
CREATE POLICY "Insert profiles policy" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (clerk_user_id() = id);
```

- If `clerk_user_id()` returns NULL (wrong JWT), the policy blocks
- Profile insert fails
- User can't complete onboarding
- App broken

### Working App's Onboarding

**Current Implementation:**
- No onboarding flow yet (this is a minimal rebuild)
- But the foundation is solid:
  - User signs in with Clerk
  - Gets Clerk user_id
  - Can access database with proper RLS
  - Can insert data with matching user_id

**To Add Onboarding:**
1. Create `profiles` table with `user_id text` (Clerk format)
2. RLS policy: `requesting_user_id() = user_id`
3. User signs in → get user from Clerk → insert profile with Clerk user_id
4. Works because JWT is consistently formatted

---

## Supabase Auth vs Clerk - Key Differences

### Why the Confusion Happened

**Supabase Auth:**
- Creates users in `auth.users` table
- User IDs are UUIDs (like `550e8400-e29b-41d4-a716-446655440000`)
- Native integration with Supabase databases
- Works great if you want everything in one system

**Clerk:**
- Creates users in Clerk's cloud
- User IDs are strings (like `user_2abc123`)
- More flexible authentication options
- Better UI components
- Requires custom integration with databases

### Why Using Both Fails

```
┌─────────────────────────────────────────────┐
│  User Signs Up                               │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
  Option A              Option B
  ↓                     ↓
Clerk Signup      Supabase Signup
  ↓                     ↓
user_id="xyz"     id=UUID
  ↓                     ↓
JWT with           JWT without
'sub'='xyz'       Clerk structure
  ↓                     ↓
Can access         Can't access
database           database
```

**The Technical Reason:**

When you mix both systems:
1. Some users have Clerk JWT (works with RLS)
2. Some users have Supabase JWT (doesn't work with Clerk RLS)
3. Database can't handle both consistently
4. `clerk_user_id()` returns NULL for Supabase auth users
5. RLS blocks them → broken app

---

## Fix Strategy for Broken App

### Option 1: Pure Clerk (Recommended - Like Working App)

**Steps:**
1. Disable Supabase Auth entirely
2. Use Clerk for all authentication
3. Set up Clerk's Supabase JWT template
4. Update all database tables to use `user_id text` (Clerk format)
5. Ensure all RLS policies use `requesting_user_id()` or `clerk_user_id()`
6. Migrate existing users to Clerk accounts

**Pros:**
- Clean architecture
- Works like the new app
- Better UI components

**Cons:**
- Need to migrate users
- More setup work

### Option 2: Pure Supabase Auth

**Steps:**
1. Remove Clerk integration
2. Use Supabase Auth only
3. Change RLS policies to not rely on `clerk_user_id()`
4. Use Supabase's native `auth.uid()` instead
5. Update JWT handling to Supabase's format

**Pros:**
- Native integration
- Simpler if already invested in Supabase Auth

**Cons:**
- Lose Clerk's UI components
- Need to rewrite authentication UI

### Option 3: Fix the Hybrid (Complex)

**Steps:**
1. Keep both systems
2. Create adapter layer that normalizes JWT claims
3. Custom middleware to translate between systems
4. Complex RLS policies that work with both
5. Not recommended - high maintenance burden

---

## Specific Technical Fixes for Broken App

### Fix #1: Implement Consistent JWT Passing

**In Supabase client:**
```typescript
// Get JWT from Clerk with Supabase template
const token = await getToken({ template: 'supabase' });

// Pass to Supabase
const client = createClient(URL, KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
});
```

### Fix #2: Update RLS Policies

**Current (Broken):**
```sql
CREATE POLICY "Select profiles policy" ON profiles
  FOR SELECT TO authenticated
  USING (clerk_user_id() = id);
```

**Should be:**
```sql
CREATE POLICY "Select profiles policy" ON profiles
  FOR SELECT TO authenticated
  USING (
    requesting_user_id() IS NOT NULL 
    AND requesting_user_id() = id
  );
```

This ensures the function returns a value before comparing.

### Fix #3: Standardize User ID Column

```sql
-- Ensure user_id is text type (Clerk format)
ALTER TABLE profiles ALTER COLUMN id TYPE text;

-- Ensure all foreign keys match
-- Update all user_id columns to text
-- Run migrations to fix relationships
```

### Fix #4: Clerk JWT Template Setup

In Clerk Dashboard:
1. Go to JWT Templates
2. Create new template named "supabase"
3. Add these claims:
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "email_verified": true
}
```
4. Save and note the template ID

### Fix #5: Verify Supabase JWKS Configuration

In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Set "JWT URL": `https://[your-clerk-domain]/jwks`
3. Set "JWT Secret": (leave empty or set to Clerk's secret)
4. This tells Supabase to validate Clerk JWTs

---

## Testing Checklist for Broken App Fix

After implementing fixes, test:

### Authentication Flow
- [ ] User can sign up via Clerk
- [ ] User can sign in via Clerk
- [ ] JWT token is properly passed to Supabase
- [ ] `requesting_user_id()` returns Clerk user ID
- [ ] No errors in browser console

### Database Access
- [ ] User can read their own data (RLS allows)
- [ ] User cannot read other users' data (RLS blocks)
- [ ] User can insert their own data
- [ ] User can update their own data

### Onboarding
- [ ] New user can complete onboarding
- [ ] Profile is created with correct user_id
- [ ] Onboarding data is saved correctly
- [ ] User can access app after onboarding

### Stripe Integration
- [ ] User can start checkout
- [ ] Subscription is created in Supabase
- [ ] Webhook receives events
- [ ] User subscription status updates correctly

---

## Environment Variables Comparison

### Working App (.env.local)
```bash
# Authentication - Clerk Only
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database - Supabase (using Clerk auth)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Payments - Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Broken App (Likely Has)
```bash
# Authentication - Conflicting
# Either Supabase Auth OR Clerk, or both
# Should be ONLY Clerk

# Database
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# Problem: Not clear which auth system to use
```

---

## Recommendation

**For the broken app (meal_saver):**

1. **Choose Clerk as the ONLY authentication system**
2. **Remove Supabase Auth entirely** (or disable it)
3. **Set up Clerk's Supabase JWT template** in Clerk dashboard
4. **Update all database migrations** to use `user_id text` consistently
5. **Update all RLS policies** to use `requesting_user_id()` function
6. **Migrate existing user data** to use Clerk IDs
7. **Test the authentication flow** end-to-end

**The working app (mealsaverRebuild) can serve as a reference implementation** for:
- How to structure the Clerk + Supabase integration
- How to implement the Supabase client with Clerk JWTs
- How to set up RLS policies correctly
- How to handle server-side authentication

---

## Summary

### The Core Issue

The broken app tries to use **both** Supabase Auth and Clerk simultaneously, causing:
- JWT format mismatches
- RLS policy failures
- Onboarding data creation issues
- User access control problems

### The Solution

The working app uses **Clerk exclusively** for authentication, with proper Supabase integration:
- Consistent JWT format
- Working RLS policies
- Proper user ID handling
- Clean architecture

### Next Steps for Broken App

1. Review this document with your other agent
2. Identify which authentication system the broken app currently uses
3. Choose ONE system (recommend Clerk)
4. Implement the fixes from this document
5. Test thoroughly
6. Migrate user data if needed

The working app (mealsaverRebuild) proves this architecture works and can be used as a template for fixing the broken app.