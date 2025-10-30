{\rtf1\ansi\ansicpg1252\cocoartf2862
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset128 HiraginoSans-W3;\f2\fnil\fcharset0 LucidaGrande;
\f3\fnil\fcharset0 AppleColorEmoji;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Quick Fix Guide for Broken MealSaver App\
\
## Problem Diagnosis\
\
Your broken app tries to use **BOTH Supabase Auth AND Clerk**, causing authentication failures.\
\
## The Root Cause\
\
```\
Auth Confusion:\

\f1 \'84\'a5
\f0 \uc0\u9472 \u9472  Some users 
\f2 \uc0\u8594 
\f0  Supabase Auth (UUID user IDs)\

\f1 \'84\'a5
\f0 \uc0\u9472 \u9472  Some users 
\f2 \uc0\u8594 
\f0  Clerk (text user IDs)  \
\uc0\u9492 \u9472 \u9472  Database doesn't know which one 
\f2 \uc0\u8594 
\f0  RLS blocks 
\f2 \uc0\u8594 
\f0  Failure\
```\
\
## The Fix: Use Clerk Only (Like Working App)\
\
### Step 1: Configure Clerk for Supabase\
\
1. Go to https://dashboard.clerk.com 
\f2 \uc0\u8594 
\f0  Your Application\
2. Navigate to **JWT Templates**\
3. Create a new template called **"supabase"**\
4. Use these claims:\
\
```json\
\{\
  "sub": "\{\{user.id\}\}",\
  "email": "\{\{user.primary_email_address\}\}",\
  "email_verified": true\
\}\
```\
\
5. Save the template\
\
### Step 2: Configure Supabase to Accept Clerk JWTs\
\
1. Get your Clerk domain (e.g., `suitable-martin-55.clerk.accounts.dev`)\
2. Go to Supabase Dashboard 
\f2 \uc0\u8594 
\f0  Authentication 
\f2 \uc0\u8594 
\f0  URL Configuration\
3. Set:\
   - **JWT URL**: `https://[your-clerk-domain]/jwks`\
   - **JWT Secret**: (leave empty or consult Clerk docs)\
\
### Step 3: Update Database Schema\
\
All user ID columns should be **TEXT** type (not UUID):\
\
```sql\
-- Fix all user_id columns\
ALTER TABLE profiles ALTER COLUMN id TYPE text;\
ALTER TABLE pantry_items ALTER COLUMN user_id TYPE text;\
-- Repeat for all tables with user_id\
```\
\
### Step 4: Update RLS Policies\
\
**Current (Broken):**\
```sql\
USING (clerk_user_id() = id);\
```\
\
**Fixed:**\
```sql\
USING (\
  requesting_user_id() IS NOT NULL \
  AND requesting_user_id() = id\
);\
```\
\
The `requesting_user_id()` function should be:\
```sql\
CREATE OR REPLACE FUNCTION requesting_user_id()\
RETURNS TEXT AS $$\
  SELECT NULLIF(\
    current_setting('request.jwt.claims', true)::json->>'sub',\
    ''\
  )::text;\
$$ LANGUAGE SQL STABLE;\
```\
\
### Step 5: Update Client Code\
\
**Critical change in your Supabase client initialization:**\
\
```typescript\
import \{ useAuth \} from '@clerk/clerk-react';\
\
export function useSupabaseClient() \{\
  const \{ getToken, isSignedIn \} = useAuth();\
  \
  const [client, setClient] = useState(supabase);\
\
  useEffect(() => \{\
    async function createAuthClient() \{\
      if (!isSignedIn) return;\
      \
      // KEY: Get JWT with 'supabase' template\
      const token = await getToken(\{ template: 'supabase' \});\
      \
      if (token) \{\
        const authClient = createClient(SUPABASE_URL, KEY, \{\
          global: \{\
            headers: \{\
              Authorization: `Bearer $\{token\}`, // Pass to Supabase\
            \},\
          \},\
        \});\
        \
        setClient(authClient);\
      \}\
    \}\
\
    createAuthClient();\
  \}, [getToken, isSignedIn]);\
\
  return client;\
\}\
```\
\
### Step 6: Update Middleware\
\
```typescript\
import \{ clerkMiddleware, createRouteMatcher \} from '@clerk/nextjs/server';\
import \{ NextResponse \} from 'next/server';\
\
const isPublic = createRouteMatcher(['/', '/sign-in', '/sign-up']);\
\
export default clerkMiddleware(async (auth, req) => \{\
  if (isPublic(req)) \{\
    return NextResponse.next();\
  \}\
  \
  const \{ userId \} = await auth();\
  \
  if (!userId) \{\
    return NextResponse.redirect(new URL('/sign-in', req.url));\
  \}\
  \
  return NextResponse.next();\
\});\
```\
\
## Comparison Table\
\
| Aspect | Broken App | Working App (mealsaverRebuild) |\
|--------|-----------|-------------------------------|\
| Auth System | Supabase Auth + Clerk (conflicted) | Clerk ONLY |\
| User ID Format | Mixed (UUID + text) | Text (consistent) |\
| JWT Template | Not configured | "supabase" template |\
| RLS Policies | `clerk_user_id()` | `requesting_user_id()` |\
| Onboarding | Fails due to auth | Works properly |\
| Database Access | Inconsistent | Works consistently |\
\
## Testing Your Fix\
\
1. **Sign up a new user via Clerk**\
2. **Check browser console** - should see "Supabase client initialized with Clerk JWT"\
3. **Try to access protected data** - should work\
4. **Check database** - `user_id` should be Clerk format (like `user_2abc...`)\
5. **Test onboarding** - should complete successfully\
\
## What Makes the Working App Work\
\
The `mealsaverRebuild` app works because:\
\

\f3 \uc0\u9989 
\f0  Uses Clerk exclusively for authentication  \

\f3 \uc0\u9989 
\f0  Passes Clerk JWT to Supabase with proper template  \

\f3 \uc0\u9989 
\f0  Database expects TEXT user IDs (Clerk format)  \

\f3 \uc0\u9989 
\f0  RLS policies extract user ID from JWT consistently  \

\f3 \uc0\u9989 
\f0  No confusion between auth systems  \
\
## Key Files to Compare\
\
**Working App:**\
- `src/integrations/supabase/client.ts` - How to pass Clerk JWT to Supabase\
- `src/middleware.ts` - Route protection\
- `supabase/migrations/00001_create_subscriptions.sql` - RLS implementation\
\
**Broken App (files to update):**\
- Your Supabase client initialization\
- Your middleware\
- Your database RLS policies\
- Your user_id column types\
\
## Environment Variables\
\
Make sure your broken app has:\
\
```bash\
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\
CLERK_SECRET_KEY=sk_test_...\
\
NEXT_PUBLIC_SUPABASE_URL=https://...\
NEXT_PUBLIC_SUPABASE_ANON_KEY=...\
```\
\
**Important:** Remove any Supabase Auth credentials if present.\
\
## Summary\
\
**The Issue:** Mixed authentication systems (Supabase Auth + Clerk)  \
**The Fix:** Use Clerk exclusively with proper Supabase integration  \
**The Reference:** The working app (mealsaverRebuild) shows exactly how to do it  \
**The Result:** Consistent authentication, working RLS, successful onboarding}