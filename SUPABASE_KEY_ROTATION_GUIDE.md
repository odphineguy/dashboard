# 🚨 CRITICAL: Supabase Service Role Key Rotation Required

## What Happened
Your **Supabase service_role key** was exposed in git history. This key provides **full admin access** to your database, bypassing ALL security policies (RLS).

## ✅ What I Already Fixed

- ✅ Deleted `execute_trigger_sql.mjs` and `run_sql.js`
- ✅ Purged them from entire git history (111 commits cleaned)
- ✅ Force-pushed to GitHub - secrets removed from remote
- ✅ Updated .gitignore to prevent future leaks
- ✅ Created safe template: `run_sql.template.js`

---

## ⚠️ URGENT ACTION REQUIRED

The exposed key is still **active and valid**. You MUST rotate it immediately!

### What You Need to Do (10 minutes)

I can help you understand where to go and what to do, but you'll need to complete these steps:

#### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **qrkkcrkxpydosxwkdeve**
3. Navigate to: **Settings** → **API**

#### Step 2: Identify the Exposed Key

Look for the **service_role** key that starts with:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya2tjcmt4cHlkb3N4d2tkZXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg4MTM4MCwiZXhwIjoyMDcyNDU3MzgwfQ...
```

#### Step 3: Rotate the Service Role Key

**Option A - Contact Supabase Support (Recommended)**

Supabase doesn't provide a self-service key rotation UI yet. You need to:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **Support** (bottom left)
3. Send this message:

```
Subject: URGENT: Service Role Key Rotation Required

Hi Supabase Team,

I need to rotate my service_role key immediately due to accidental exposure in git history.

Project: qrkkcrkxpydosxwkdeve
Exposed Key: service_role key ending in ...JGI

Please rotate this key at your earliest convenience.

Thank you!
```

**Expected response time:** Usually within a few hours

**Option B - Create New Project (Nuclear Option)**

If this is a development project with minimal data:

1. Create a new Supabase project
2. Export your database schema
3. Migrate to the new project
4. Update all environment variables

**⚠️ Only do this if support is taking too long and you're seriously concerned**

---

## 🔐 What the Exposed Key Could Do

With the service_role key, an attacker could:
- ❌ Read ALL data (including private user information)
- ❌ Modify/delete ALL data
- ❌ Bypass Row Level Security (RLS) policies
- ❌ Execute arbitrary SQL commands
- ❌ Create/modify database triggers
- ❌ Access auth.users table directly

**Impact Level:** 🔴 **CRITICAL** - Full database compromise

---

## 🛡️ Immediate Mitigation Steps

While waiting for key rotation:

### 1. Monitor Your Database

Check Supabase logs for suspicious activity:
1. Dashboard → **Logs** → **Database**
2. Look for:
   - Unusual queries from unknown IPs
   - Bulk data exports
   - Schema modifications

### 2. Check Recent Activity

```sql
-- Run this in SQL Editor to check recent database changes
SELECT 
  schemaname, 
  tablename, 
  last_vacuum, 
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC
LIMIT 20;
```

### 3. Review User Data

Check if any unauthorized users were created:
```sql
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 50;
```

---

## 📊 Current Status

| Action | Status | Priority |
|--------|--------|----------|
| Delete exposed files | ✅ Complete | - |
| Update .gitignore | ✅ Complete | - |
| Purge git history | ✅ Complete | - |
| Create template | ✅ Complete | - |
| **Contact Supabase Support** | ⚠️ **REQUIRED** | 🔴 **CRITICAL** |
| **Rotate service_role key** | ⚠️ **PENDING** | 🔴 **CRITICAL** |
| Monitor for suspicious activity | ⚠️ **RECOMMENDED** | 🟡 **MEDIUM** |

---

## ✅ After Key Rotation

Once Supabase rotates your key, you'll need to:

1. **Update Environment Variables**
   - Update `.env` (if you have service_role key there)
   - Update any CI/CD secrets
   - Update any deployment platforms (Vercel, etc.)

2. **Update Edge Functions**
   - Check `supabase/functions/` for any hardcoded keys
   - Use environment variables instead

3. **Verify Everything Works**
   - Test your app
   - Check Edge Functions
   - Verify admin operations

---

## 🎓 Prevention for the Future

1. **Never use service_role key in frontend code** - Only use anon key
2. **Never commit keys to git** - Always use environment variables
3. **Use templates** - Like the `run_sql.template.js` I created
4. **Enable secret scanning** - GitHub can detect exposed keys
5. **Regular audits** - Review what keys are in use

---

## 🆘 Need Help?

- **Supabase Support:** [support.supabase.com](https://supabase.com/dashboard/support)
- **Supabase Discord:** [discord.supabase.com](https://discord.supabase.com)
- **Emergency:** Contact Supabase via Twitter [@supabase](https://twitter.com/supabase)

---

## 📖 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Understanding Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

