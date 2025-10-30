# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# Clerk Authentication (Primary)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Database (Using Clerk Auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

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
