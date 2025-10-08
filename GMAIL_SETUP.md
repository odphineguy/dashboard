# Gmail Receipt Scanner Setup Guide

## Overview
The Gmail Receipt Scanner feature allows users to connect their Gmail account and automatically scan for grocery receipts from popular services like Instacart, DoorDash, Walmart, UberEats, GrubHub, and more.

## Features Implemented

✅ **Frontend Components**
- Gmail connection UI in Scanner page (`src/components/ScannerTest.jsx`)
- OAuth callback handler (`src/pages/GmailConnect/index.jsx`)
- Connect/Disconnect Gmail functionality
- Email scanning interface with results display
- Route configuration for Gmail OAuth callback

## Required Backend Setup

To complete the Gmail integration, you need to set up the following:

### 1. Google Cloud Project Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://yourdomain.com/gmail-connect` (production)
     - `http://localhost:5173/gmail-connect` (development)
   - Save the **Client ID** and **Client Secret**

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Gmail Integration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/gmail-connect

# For Supabase Edge Functions
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 3. Database Schema

Ensure you have the `user_integrations` table in your Supabase database:

```sql
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own integrations
CREATE POLICY "Users can manage their own integrations"
  ON user_integrations
  FOR ALL
  USING (auth.uid() = user_id);
```

### 4. Supabase Edge Functions

Create two edge functions in your Supabase project:

#### **Function 1: gmail-oauth**
Location: `supabase/functions/gmail-oauth/index.ts`

This function handles the OAuth code exchange. Copy the implementation from:
`~/Documents/smart_pantry/supabase/functions/gmail-oauth/index.ts`

**Key responsibilities:**
- Exchanges authorization code for access/refresh tokens
- Saves tokens to `user_integrations` table
- Returns success/error response

#### **Function 2: gmail-sync**
Location: `supabase/functions/gmail-sync/index.ts`

This function scans Gmail for grocery receipts. Copy the implementation from:
`~/Documents/smart_pantry/supabase/functions/gmail-sync/index.ts`

**Key responsibilities:**
- Retrieves Gmail access token from database
- Searches for emails from grocery stores
- Extracts order information (store, items, total, date)
- Saves order summaries to `pantry_events` table
- Returns extracted orders

**Supported stores:**
- walmart.com
- target.com
- kroger.com
- safeway.com
- wholefoods.com
- traderjoes.com
- costco.com
- instacart.com
- doordash.com
- ubereats.com
- grubhub.com
- amazon.com
- freshdirect.com
- peapod.com
- gopuff.com

### 5. Deploy Edge Functions

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy gmail-oauth
supabase functions deploy gmail-sync

# Set secrets
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
supabase secrets set GOOGLE_REDIRECT_URI=your_redirect_uri
```

### 6. Testing

1. Start your dev server: `npm run dev`
2. Navigate to `/scanner`
3. Click "Connect Gmail" in the Gmail Receipt Scanner section
4. Authorize the app in Google OAuth consent screen
5. You'll be redirected back to `/gmail-connect` then to `/scanner`
6. Click "Scan My Emails" to test the email scanning

## Security & Privacy

- **Read-only access:** Only reads emails, never sends or modifies
- **Scoped access:** Only searches for order confirmation emails
- **No storage:** Email contents are not stored, only order summaries
- **User control:** Users can disconnect anytime
- **OAuth 2.0:** Industry-standard secure authentication

## How It Works

1. **Connect:** User authorizes app via Google OAuth
2. **Store tokens:** Access and refresh tokens saved securely in database
3. **Scan:** When user clicks "Scan My Emails":
   - Searches last 7 days for emails from grocery stores
   - Filters for order confirmation keywords
   - Extracts store name, order ID, total, and detected items
4. **Save:** Order summaries saved to `pantry_events` for analytics
5. **Display:** Shows results in Scanner page UI

## Troubleshooting

**"Gmail integration not configured"**
- Missing `VITE_GOOGLE_CLIENT_ID` in `.env`

**"OAuth exchange failed"**
- Check that `GOOGLE_CLIENT_SECRET` is set in Supabase secrets
- Verify redirect URI matches in Google Console and `.env`

**"Gmail not connected"**
- User needs to reconnect via Scanner page
- Check `user_integrations` table for expired tokens

**"Sync failed"**
- Check Supabase function logs
- Verify Gmail API is enabled in Google Console
- Ensure user has recent grocery order emails

## Future Enhancements

- [ ] Automatic periodic syncing (daily/weekly)
- [ ] More detailed item extraction using AI
- [ ] Support for additional grocery stores
- [ ] Email notification preferences
- [ ] Sync history and logs

## Reference Files

- Frontend: `src/components/ScannerTest.jsx`
- OAuth Callback: `src/pages/GmailConnect/index.jsx`
- Backend Reference: `~/Documents/smart_pantry/supabase/functions/`
