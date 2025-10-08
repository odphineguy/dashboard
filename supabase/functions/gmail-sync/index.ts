import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Grocery stores and delivery services to scan for
const GROCERY_STORES = [
  'walmart.com',
  'target.com',
  'kroger.com',
  'safeway.com',
  'wholefoods.com',
  'traderjoes.com',
  'costco.com',
  'instacart.com',
  'doordash.com',
  'ubereats.com',
  'grubhub.com',
  'amazon.com',
  'freshdirect.com',
  'peapod.com',
  'gopuff.com'
];

// Keywords to look for in email subjects
const ORDER_KEYWORDS = [
  'order confirmation',
  'receipt',
  'your order',
  'purchase confirmation',
  'order summary',
  'delivery confirmation',
  'pickup ready',
  'order received'
];

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ body: { data: string } }>;
    body?: { data: string };
  };
}

interface ExtractedOrder {
  store: string;
  items: string[];
  total: string;
  date: string;
  orderId: string;
}

async function getGmailAccessToken(userId: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('user_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single();

  if (error || !data) {
    throw new Error('Gmail not connected');
  }

  // Check if token is expired and refresh if needed
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Token is expired, need to refresh
    // For now, throw error - in production you'd implement refresh logic
    throw new Error('Gmail token expired, please reconnect');
  }

  return data.access_token;
}

async function searchGmailMessages(accessToken: string, query: string): Promise<GmailMessage[]> {
  // First, search for message IDs
  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search Gmail messages');
  }

  const searchData = await searchResponse.json();
  const messageIds = searchData.messages?.map((msg: any) => msg.id) || [];

  // Then, get full message details for each message
  const messages: GmailMessage[] = [];
  for (const messageId of messageIds.slice(0, 10)) { // Limit to 10 most recent
    const messageResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (messageResponse.ok) {
      const messageData = await messageResponse.json();
      messages.push(messageData);
    }
  }

  return messages;
}

function extractOrderInfo(message: GmailMessage): ExtractedOrder | null {
  const headers = message.payload.headers;
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';

  // Check if this is from a grocery store or delivery service
  const store = GROCERY_STORES.find(store => from.toLowerCase().includes(store));
  if (!store) return null;

  // Check if this looks like an order confirmation
  const isOrderEmail = ORDER_KEYWORDS.some(keyword => 
    subject.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!isOrderEmail) return null;

  // Extract order ID from subject or snippet
  const orderIdMatch = subject.match(/(?:order|confirmation)[\s#:]*([A-Z0-9\-]+)/i);
  const orderId = orderIdMatch ? orderIdMatch[1] : 'unknown';

  // Extract total amount
  const totalMatch = message.snippet.match(/\$(\d+\.?\d*)/);
  const total = totalMatch ? `$${totalMatch[1]}` : 'unknown';

  // For now, we'll extract basic item info from snippet
  // In production, you'd parse the email body more thoroughly
  const items: string[] = [];
  
  // Simple extraction of common food items from snippet
  const foodKeywords = ['milk', 'bread', 'eggs', 'cheese', 'chicken', 'beef', 'fish', 'vegetables', 'fruits', 'yogurt'];
  foodKeywords.forEach(keyword => {
    if (message.snippet.toLowerCase().includes(keyword)) {
      items.push(keyword);
    }
  });

  return {
    store,
    items,
    total,
    date,
    orderId
  };
}

async function saveOrderToDatabase(userId: string, order: ExtractedOrder): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Create a pantry event for this order
  await supabase
    .from('pantry_events')
    .insert({
      user_id: userId,
      type: 'consumed', // Changed to match valid enum values
      name: `Order from ${order.store}`,
      quantity: order.items.length,
      unit: 'items',
      category: 'grocery_order',
      at: new Date().toISOString(),
      data_source: 'manual', // Changed to match valid enum values
      meta: {
        store: order.store,
        orderId: order.orderId,
        total: order.total,
        items: order.items,
        orderDate: order.date,
        source: 'gmail_sync'
      }
    });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Gmail Sync: Starting sync for user:', user.id);

    // Get Gmail access token
    const accessToken = await getGmailAccessToken(user.id);

    // Search for recent grocery order emails
    const query = `from:(${GROCERY_STORES.join(' OR ')}) subject:(${ORDER_KEYWORDS.join(' OR ')}) newer_than:7d`;
    const messages = await searchGmailMessages(accessToken, query);

    console.log(`Gmail Sync: Found ${messages.length} potential order emails`);

    const extractedOrders: ExtractedOrder[] = [];
    
    // Process each message
    for (const message of messages) {
      const order = extractOrderInfo(message);
      if (order) {
        extractedOrders.push(order);
        await saveOrderToDatabase(user.id, order);
      }
    }

    console.log(`Gmail Sync: Extracted ${extractedOrders.length} orders`);

    return new Response(
      JSON.stringify({
        success: true,
        ordersFound: extractedOrders.length,
        orders: extractedOrders
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Gmail Sync Error:', error);
    
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
