# Environment Variables Setup

## ⚠️ Security Warning

**IMPORTANT:** Never commit real API keys or secrets to git. This file contains **placeholder examples only**.

- The `.env` file is gitignored for your protection
- If secrets were exposed in git history, **rotate them immediately**:
  - Supabase: Generate new anon/service keys in Supabase Dashboard
  - Stripe: Rotate API keys in Stripe Dashboard
  - Google AI: Regenerate API key in Google AI Studio

**Note:** Secrets in git history cannot be fully removed without rewriting history. Always rotate exposed credentials.

---

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# Supabase (Backend & Auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Google AI (Optional - for scanner/recipes)
VITE_GOOGLE_GENAI_API_KEY=your-google-ai-key

# Stripe (Optional - for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Authentication

The app uses **Supabase Auth** (`supabase.auth`) for all authentication:

- Email/password sign-up and sign-in
- Google OAuth (sign in with Google)
- Sessions persist automatically via PKCE flow

No extra auth provider or JWT template configuration is required — Supabase
issues and validates the JWTs, and RLS policies read the user ID directly from
`auth.uid()`.

### Supabase Dashboard Setup
- Go to Supabase Dashboard → **Authentication** → **Providers**
- Ensure **Email** is enabled
- Enable **Google** and add your Google OAuth Client ID and Client Secret
- Configure redirect URLs under **Authentication** → **URL Configuration**

## Testing the Integration

1. **Start your app**: `npm run dev`
2. **Sign in** with email/password or Google
3. **Open browser console**
4. **Test database access**:
```javascript
// This should work once you are signed in
const { data, error } = await supabase.from('profiles').select('*')
console.log('Profile data:', data)
```

## Troubleshooting

### Database Access Denied
- Verify you are signed in (`await supabase.auth.getSession()` returns a session)
- Check RLS policies use `(auth.uid())::text = user_id`
- Verify user_id columns are TEXT type

### Authentication Errors
- Verify Supabase URL and anon key are correct
- Confirm the provider (Email/Google) is enabled in the Supabase Dashboard
- Ensure redirect URLs are configured for OAuth
