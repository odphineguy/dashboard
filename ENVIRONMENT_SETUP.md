# Environment Variables Setup

## ⚠️ Security Warning

**IMPORTANT:** Never commit real API keys or secrets to git. This file contains **placeholder examples only**.

- The `.env` file is gitignored for your protection
- If secrets were exposed in git history, **rotate them immediately**:
  - Supabase: Generate new anon/service keys in Supabase Dashboard
  - Clerk: Regenerate publishable keys in Clerk Dashboard
  - Stripe: Rotate API keys in Stripe Dashboard
  - Google AI: Regenerate API key in Google AI Studio

**Note:** Secrets in git history cannot be fully removed without rewriting history. Always rotate exposed credentials.

---

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# Clerk Authentication (Primary)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Database (Using Clerk Auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Google AI (Optional - for scanner/recipes)
VITE_GOOGLE_GENAI_API_KEY=your-google-ai-key

# Stripe (Optional - for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Clerk Configuration

### 1. JWT Template Setup
- Go to https://dashboard.clerk.com
- Navigate to **JWT Templates**
- Create new template named **"supabase"**
- Add these claims:
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "email_verified": true
}
```

### 2. Supabase Configuration
- Go to Supabase Dashboard → **Authentication** → **URL Configuration**
- Set **JWT URL**: `https://[your-clerk-domain]/jwks`
- Leave **JWT Secret** empty

## Testing the Integration

1. **Start your app**: `npm run dev`
2. **Sign in with Clerk**
3. **Open browser console**
4. **Test database access**:
```javascript
// This should work after JWT template is configured
const { data, error } = await supabase.from('profiles').select('*')
console.log('Profile data:', data)
```

## Troubleshooting

### JWT Template Not Working
- Verify template name is exactly "supabase"
- Check claims format matches exactly
- Ensure template is saved and active

### Database Access Denied
- Check RLS policies use `clerk_user_id()` function
- Verify user_id columns are TEXT type
- Test with: `SELECT clerk_user_id(), requesting_user_id()`

### Authentication Errors
- Verify Clerk publishable key is correct
- Check Supabase URL and anon key
- Ensure no conflicting auth systems
