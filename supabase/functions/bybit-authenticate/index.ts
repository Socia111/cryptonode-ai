import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function createBybitSignature(params: string, secret: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + 'BYBIT_API_KEY' + '5000' + params);
  const key = encoder.encode(secret);
  
  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => 
    crypto.subtle.sign('HMAC', cryptoKey, data)
  ).then(signature => 
    Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

async function validateBybitCredentials(apiKey: string, apiSecret: string, testnet: boolean = true) {
  const timestamp = Date.now().toString();
  const baseUrl = testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  
  try {
    // Test with account info endpoint
    const params = '';
    const signature = await createBybitSignature(params, apiSecret, timestamp);

    const response = await fetch(`${baseUrl}/v5/account/wallet-balance?accountType=UNIFIED`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });

    const data = await response.json();
    
    return {
      valid: data.retCode === 0,
      error: data.retCode !== 0 ? data.retMsg : null,
      permissions: data.retCode === 0 ? ['read', 'trade'] : [],
      balance_info: data.result || null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      permissions: [],
      balance_info: null
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case 'validate_and_save': {
        const { user_id, api_key, api_secret, account_type = 'testnet' } = payload;

        if (!user_id || !api_key || !api_secret) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing required fields: user_id, api_key, api_secret'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('🔐 Validating Bybit credentials for user:', user_id);

        // Validate credentials with Bybit
        const validation = await validateBybitCredentials(
          api_key, 
          api_secret, 
          account_type === 'testnet'
        );

        if (!validation.valid) {
          return new Response(JSON.stringify({
            success: false,
            error: `Invalid credentials: ${validation.error}`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Save or update credentials using the database function
        const { data: accountId, error: saveError } = await supabase
          .rpc('restore_user_trading_account', {
            p_user_id: user_id,
            p_api_key: api_key,
            p_api_secret: api_secret,
            p_account_type: account_type
          });

        if (saveError) {
          console.error('Failed to save trading account:', saveError);
          return new Response(JSON.stringify({
            success: false,
            error: `Failed to save credentials: ${saveError.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update balance info if available
        if (validation.balance_info && accountId) {
          await supabase
            .from('user_trading_accounts')
            .update({
              balance_info: validation.balance_info,
              permissions: validation.permissions
            })
            .eq('id', accountId);
        }

        return new Response(JSON.stringify({
          success: true,
          account_id: accountId,
          account_type: account_type,
          permissions: validation.permissions,
          balance_info: validation.balance_info,
          message: 'Bybit credentials validated and saved successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'test_connection': {
        const { api_key, api_secret, testnet = true } = payload;

        if (!api_key || !api_secret) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing API key or secret'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const validation = await validateBybitCredentials(api_key, api_secret, testnet);

        return new Response(JSON.stringify({
          success: validation.valid,
          valid: validation.valid,
          error: validation.error,
          permissions: validation.permissions,
          balance_info: validation.balance_info
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_account_info': {
        const { user_id, account_type = 'testnet' } = payload;

        if (!user_id) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing user_id'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: account, error } = await supabase
          .rpc('get_user_trading_account', {
            p_user_id: user_id,
            p_account_type: account_type
          });

        if (error || !account || account.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No trading account found'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accountData = account[0];

        return new Response(JSON.stringify({
          success: true,
          account: {
            id: accountData.id,
            account_type: accountData.account_type,
            is_active: accountData.is_active,
            permissions: accountData.permissions,
            balance_info: accountData.balance_info,
            risk_settings: accountData.risk_settings
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in bybit-authenticate:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});