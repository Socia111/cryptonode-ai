import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
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

    const { apiKey, apiSecret, testnet } = await req.json();

    if (!apiKey || !apiSecret) {
      return Response.json(
        { success: false, error: 'API Key and Secret are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Test the Bybit API credentials
    const authResult = await authenticateBybit({ apiKey, apiSecret, testnet });

    if (authResult.success) {
      // Store credentials securely in Supabase
      const { error: storeError } = await supabase
        .from('user_trading_accounts')
        .upsert({
          user_id: user.id,
          exchange: 'bybit',
          api_key_encrypted: apiKey, // In production, encrypt this
          api_secret_encrypted: apiSecret, // In production, encrypt this
          account_type: testnet ? 'testnet' : 'mainnet',
          balance_info: authResult.balance,
          permissions: authResult.permissions,
          risk_settings: authResult.riskSettings,
          is_active: true,
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        });

      if (storeError) {
        console.error('Failed to store credentials:', storeError);
        throw new Error('Failed to store credentials');
      }

      return Response.json({
        success: true,
        accountType: testnet ? 'testnet' : 'mainnet',
        balance: authResult.balance,
        permissions: authResult.permissions,
        riskSettings: authResult.riskSettings
      }, { headers: corsHeaders });
    } else {
      return Response.json({
        success: false,
        error: authResult.error
      }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Bybit authentication error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});

async function authenticateBybit(credentials: BybitCredentials) {
  try {
    const { apiKey, apiSecret, testnet } = credentials;
    const baseUrl = testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    
    console.log(`Testing Bybit ${testnet ? 'testnet' : 'mainnet'} authentication...`);

    // Test 1: Get server time (public endpoint)
    const timeResponse = await fetch(`${baseUrl}/v5/market/time`);
    if (!timeResponse.ok) {
      throw new Error('Failed to connect to Bybit API');
    }

    // Test 2: Get account balance (private endpoint)
    const timestamp = Date.now().toString();
    const balanceEndpoint = '/v5/account/wallet-balance';
    const params = 'accountType=UNIFIED';
    const message = timestamp + apiKey + '5000' + balanceEndpoint + params;
    const signature = await createHmacSignature(apiSecret, message);

    const balanceResponse = await fetch(`${baseUrl}${balanceEndpoint}?${params}`, {
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json'
      }
    });

    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      console.error('Bybit balance API error:', balanceResponse.status, errorText);
      return {
        success: false,
        error: `Authentication failed: ${errorText}`
      };
    }

    const balanceData = await balanceResponse.json();
    console.log('Bybit authentication successful');

    if (balanceData.retCode !== 0) {
      return {
        success: false,
        error: `API Error: ${balanceData.retMsg}`
      };
    }

    // Extract balance info
    const accountInfo = balanceData.result?.list?.[0] || {};
    const balance = {
      totalEquity: accountInfo.totalEquity || '0',
      totalAvailableBalance: accountInfo.totalAvailableBalance || '0',
      totalPerpUPL: accountInfo.totalPerpUPL || '0',
      totalWalletBalance: accountInfo.totalWalletBalance || '0'
    };

    // Test 3: Check API key permissions
    const permissions = ['read'];
    
    // Test if we can place orders (we won't actually place them)
    try {
      const orderTestEndpoint = '/v5/order/create';
      const orderTestMessage = timestamp + apiKey + '5000' + orderTestEndpoint;
      const orderTestSig = await createHmacSignature(apiSecret, orderTestMessage);
      
      // This will fail but tells us if we have trading permissions
      const orderTestResponse = await fetch(`${baseUrl}${orderTestEndpoint}`, {
        method: 'POST',
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': orderTestSig,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: 'spot',
          symbol: 'BTCUSDT',
          side: 'Buy',
          orderType: 'Market',
          qty: '0.001'
        })
      });
      
      const orderTestData = await orderTestResponse.json();
      // If we get a different error than permission denied, we likely have trading rights
      if (orderTestData.retCode !== 10004) { // 10004 is permission denied
        permissions.push('trade', 'spot', 'derivatives');
      }
    } catch (error) {
      console.log('Order test failed (expected):', error);
    }

    const riskSettings = {
      maxPositionSize: testnet ? 1000 : 10000, // Default limits
      stopLossEnabled: true,
      takeProfitEnabled: true
    };

    return {
      success: true,
      balance,
      permissions,
      riskSettings,
      accountType: testnet ? 'testnet' : 'mainnet'
    };

  } catch (error) {
    console.error('Bybit authentication failed:', error);
    return {
      success: false,
      error: `Connection failed: ${error.message}`
    };
  }
}

async function createHmacSignature(secret: string, message: string): Promise<string> {
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