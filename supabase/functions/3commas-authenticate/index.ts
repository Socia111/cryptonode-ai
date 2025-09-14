import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ThreeCommasCredentials {
  apiKey: string;
  apiSecret: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) {
      return Response.json(
        { success: false, error: 'API Key and Secret are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Test the 3Commas API credentials
    const authResult = await authenticate3Commas({ apiKey, apiSecret });

    if (authResult.success) {
      // Store credentials securely in Supabase
      const { error: storeError } = await supabase
        .from('user_trading_accounts')
        .upsert({
          user_id: user.id,
          exchange: '3commas',
          api_key: apiKey,
          api_secret: apiSecret, // In production, encrypt this
          account_info: authResult.accountInfo,
          permissions: authResult.permissions,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (storeError) {
        console.error('Failed to store credentials:', storeError);
        throw new Error('Failed to store credentials');
      }

      return Response.json({
        success: true,
        apiKey: apiKey.substring(0, 8) + '...',
        accountInfo: authResult.accountInfo,
        permissions: authResult.permissions
      }, { headers: corsHeaders });
    } else {
      return Response.json({
        success: false,
        error: authResult.error
      }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('3Commas authentication error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});

async function authenticate3Commas(credentials: ThreeCommasCredentials) {
  try {
    const { apiKey, apiSecret } = credentials;
    
    // Create signature for 3Commas API
    const timestamp = Date.now().toString();
    const message = `/public/api/ver1/accounts${timestamp}`;
    const signature = await createSignature(apiSecret, message);

    console.log('Testing 3Commas authentication...');

    const response = await fetch('https://api.3commas.io/public/api/ver1/accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'APIKEY': apiKey,
        'Signature': signature,
        'Timestamp': timestamp
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('3Commas API error:', response.status, errorText);
      return {
        success: false,
        error: `API Error ${response.status}: ${errorText}`
      };
    }

    const accounts = await response.json();
    console.log('3Commas authentication successful:', accounts.length, 'accounts found');

    // Determine permissions based on API response
    const permissions = ['read'];
    if (accounts.some((acc: any) => acc.trade_enabled)) {
      permissions.push('trade');
    }
    permissions.push('bots', 'portfolios');

    const accountInfo = {
      accountsCount: accounts.length,
      accounts: accounts.slice(0, 3).map((acc: any) => ({
        name: acc.name,
        exchange: acc.exchange_name,
        enabled: acc.trade_enabled
      })),
      activeBots: accounts.reduce((sum: number, acc: any) => sum + (acc.active_bots_count || 0), 0),
      totalProfit: accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.day_profit_usd || '0'), 0).toFixed(2)
    };

    return {
      success: true,
      accountInfo,
      permissions,
      accountsFound: accounts.length
    };

  } catch (error) {
    console.error('3Commas authentication failed:', error);
    return {
      success: false,
      error: `Connection failed: ${error.message}`
    };
  }
}

async function createSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}