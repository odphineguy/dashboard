import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthRequest {
  code: string;
  state: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/gmail-oauth`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Token exchange failed:', errorData);
    throw new Error('Failed to exchange authorization code for tokens');
  }

  return await tokenResponse.json();
}

async function saveTokensToDatabase(userId: string, tokens: GoogleTokenResponse): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

  const { error } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      provider: 'gmail',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to save Gmail integration');
  }
}

function parseState(state: string): { uid: string | null; ts: number } {
  try {
    const decoded = atob(state);
    return JSON.parse(decoded);
  } catch {
    return { uid: null, ts: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, state }: OAuthRequest = await req.json();

    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log('Gmail OAuth: Processing authorization code');

    // Parse state to get user ID
    const { uid } = parseState(state);
    if (!uid) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    console.log('Gmail OAuth: Successfully exchanged code for tokens');

    // Save tokens to database
    await saveTokensToDatabase(uid, tokens);
    console.log('Gmail OAuth: Saved tokens to database for user:', uid);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Gmail connected successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Gmail OAuth Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );
  }
})
