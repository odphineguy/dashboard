# Clerk JWT Template Setup for Supabase RLS
**CRITICAL:** This must be configured for authentication to work!

---

## Problem

The app now uses Clerk for authentication but Supabase for data storage. For RLS (Row Level Security) policies to work, Supabase needs to know WHO the user is. We pass this via a JWT (JSON Web Token) from Clerk.

---

## Setup Steps

### 1. Go to Clerk Dashboard

https://dashboard.clerk.com/

### 2. Select Your Application

Click on "Meal Saver" or "smart_pantry" app

### 3. Go to JWT Templates

- Click on **"JWT Templates"** in the left sidebar
- Click **"+ New template"**

### 4. Create Supabase Template

**Template Name:** `supabase`

**Important:** The name MUST be exactly `supabase` (lowercase)

### 5. Configure the Template

#### Claims Section

Add these claims:

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "aud": "authenticated",
  "role": "authenticated"
}
```

#### Token Lifetime

- **Default:** 60 seconds (leave as is)
- **Maximum:** 3600 seconds (1 hour)

### 6. Get Supabase JWT Secret

You need your Supabase JWT secret for the signing key:

1. Go to https://supabase.com/dashboard
2. Select your project (qrkkcrkxpydosxwkdeve)
3. Go to **Settings** → **API**
4. Scroll down to **JWT Settings**
5. Copy the **JWT Secret** (it's a long string starting with `ey...`)

### 7. Configure Signing Key in Clerk

Back in Clerk JWT Template editor:

- **Signing Algorithm:** HS256 (HMAC with SHA-256)
- **Signing Key:** Paste your Supabase JWT Secret here

### 8. Save the Template

Click **"Save"** or **"Create template"**

---

## Verification

To verify it's working:

1. Log in to your app
2. Open browser console
3. Run this:

```javascript
const token = await window.Clerk.session.getToken({ template: 'supabase' })
console.log('Clerk JWT:', token)
```

You should see a JWT token (long string starting with `eyJ...`)

If you get an error or `null`, the template is not configured correctly.

---

## How It Works

### Without JWT Template (BROKEN):

```
User → Clerk Auth ✅
  ↓
Supabase Request (no JWT) ❌
  ↓
RLS Policy checks clerk_user_id() → NULL
  ↓
ERROR: "Row level security policy violated"
```

### With JWT Template (WORKING):

```
User → Clerk Auth ✅
  ↓
Get Clerk JWT with 'supabase' template ✅
  ↓
Supabase Request (JWT in Authorization header) ✅
  ↓
RLS Policy checks clerk_user_id() → Extracts user ID from JWT ✅
  ↓
Access granted! ✅
```

---

## What Happens If Not Configured

If you don't set this up, you'll see these errors:

- ❌ "new row violates row-level security policy for table 'profiles'"
- ❌ "Session not available. Please try signing in again."
- ❌ Scanner won't save items
- ❌ Profile won't update
- ❌ Can't complete onboarding

**Everything will fail because Supabase can't identify the user!**

---

## Testing After Setup

1. **Clear browser cache and cookies**
2. Go to https://app.mealsaver.app/onboarding
3. Sign up with Google (or email)
4. Complete all onboarding steps
5. **Should work without errors!**

If you still get RLS errors after setting this up, check:
- Template name is exactly `supabase` (case-sensitive)
- Supabase JWT secret is correct
- Token contains `sub` claim with user ID

---

## Quick Reference

**Template Name:** `supabase`
**Signing Algorithm:** HS256
**Signing Key:** Your Supabase JWT Secret from Settings → API → JWT Settings

**Claims:**
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "aud": "authenticated",
  "role": "authenticated"
}
```

---

**This is REQUIRED for the app to work. Don't skip this step!**
