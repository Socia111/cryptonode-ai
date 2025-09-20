import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialRequest {
  user_id: string;
  api_key: string;
  api_secret: string;
  account_type: 'testnet' | 'mainnet';
  exchange: string;
}

interface CredentialResponse {
  success: boolean;
  account_id?: string;
  balance_info?: any;
  permissions?: string[];
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...requestData } = await req.json();

    console.log(`🔐 Bybit Credentials Manager - Action: ${action}`);

    switch (action) {
      case 'store_credentials':
        return await storeCredentials(supabase, requestData as CredentialRequest);
      
      case 'validate_credentials':
        return await validateCredentials(requestData as CredentialRequest);
      
      case 'get_credentials':
        return await getCredentials(supabase, requestData.user_id);
      
      case 'test_connection':
        return await testConnection(requestData.api_key, requestData.api_secret);
      
      case 'update_credentials':
        return await updateCredentials(supabase, requestData);
      
      case 'delete_credentials':
        return await deleteCredentials(supabase, requestData.user_id);
      
      case 'get_account_info':
        return await getAccountInfo(requestData.api_key, requestData.api_secret);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Bybit Credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function storeCredentials(supabase: any, request: CredentialRequest): Promise<Response> {
  try {
    console.log(`💾 Storing credentials for user: ${request.user_id}`);

    // First validate the credentials
    const validation = await validateBybitCredentials(request.api_key, request.api_secret);
    
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.error}`);
    }

    // Encrypt credentials (in production, use proper encryption)
    const encryptedApiKey = await encryptCredential(request.api_key);
    const encryptedApiSecret = await encryptCredential(request.api_secret);

    // Store in database
    const { data, error } = await supabase
      .from('user_trading_accounts')
      .upsert({
        user_id: request.user_id,
        exchange: request.exchange || 'bybit',
        account_type: request.account_type,
        api_key_encrypted: encryptedApiKey,
        api_secret_encrypted: encryptedApiSecret,
        is_active: true,
        permissions: validation.permissions,
        balance_info: validation.balance_info,
        risk_settings: {
          maxPositionSize: 1000,
          stopLossEnabled: true,
          takeProfitEnabled: true,
          maxDailyLoss: 0.05
        },
        connected_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,exchange,account_type'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Log the credential storage
    await supabase
      .from('audit_log')
      .insert({
        user_id: request.user_id,
        action: 'store_credentials',
        resource_type: 'trading_account',
        resource_id: data.id,
        metadata: {
          exchange: request.exchange,
          account_type: request.account_type,
          permissions: validation.permissions
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        account_id: data.id,
        balance_info: validation.balance_info,
        permissions: validation.permissions,
        message: 'Credentials stored successfully',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Failed to store credentials:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function validateCredentials(request: CredentialRequest): Promise<Response> {
  try {
    const validation = await validateBybitCredentials(request.api_key, request.api_secret);
    
    return new Response(
      JSON.stringify({
        success: true,
        valid: validation.valid,
        permissions: validation.permissions,
        balance_info: validation.balance_info,
        error: validation.error,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function validateBybitCredentials(apiKey: string, apiSecret: string): Promise<any> {
  try {
    // Test connection with server time
    const serverTimeResponse = await fetch('https://api.bybit.com/v5/market/time');
    const serverTimeData = await serverTimeResponse.json();
    
    if (serverTimeData.retCode !== 0) {
      throw new Error('Unable to connect to Bybit API');
    }

    // Test authenticated endpoint - Get wallet balance
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const queryString = `accountType=UNIFIED&coin=USDT`;
    
    const signature = await createBybitSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);

    const balanceResponse = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow
      }
    });

    const balanceData = await balanceResponse.json();

    if (balanceData.retCode === 0) {
      // Test trading permissions by checking if we can query positions
      const positionsResponse = await fetch('https://api.bybit.com/v5/position/list?category=linear&settleCoin=USDT', {
        headers: {
          'X-BAPI-API-KEY': apiKey,
          'X-BAPI-SIGN': await createBybitSignature(timestamp, apiKey, recvWindow, 'category=linear&settleCoin=USDT', apiSecret),
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      });

      const positionsData = await positionsResponse.json();
      const canTrade = positionsData.retCode === 0;

      const permissions = ['read'];
      if (canTrade) permissions.push('trade');

      return {
        valid: true,
        permissions,
        balance_info: balanceData.result,
        server_time: serverTimeData.result.timeSecond,
        trading_enabled: canTrade
      };
    } else {
      return {
        valid: false,
        error: `Authentication failed: ${balanceData.retMsg} (Code: ${balanceData.retCode})`
      };
    }

  } catch (error) {
    return {
      valid: false,
      error: `Connection failed: ${error.message}`
    };
  }
}

async function getCredentials(supabase: any, userId: string): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('user_trading_accounts')
      .select('id, exchange, account_type, is_active, permissions, balance_info, risk_settings, connected_at, last_used_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts: data || [],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function testConnection(apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const result = await validateBybitCredentials(apiKey, apiSecret);
    
    return new Response(
      JSON.stringify({
        success: true,
        connected: result.valid,
        details: result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function updateCredentials(supabase: any, request: any): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('user_trading_accounts')
      .update({
        last_used_at: new Date().toISOString(),
        ...request.updates
      })
      .eq('user_id', request.user_id)
      .eq('id', request.account_id);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Credentials updated successfully',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function deleteCredentials(supabase: any, userId: string): Promise<Response> {
  try {
    const { error } = await supabase
      .from('user_trading_accounts')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Deletion failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Credentials deactivated successfully',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getAccountInfo(apiKey: string, apiSecret: string): Promise<Response> {
  try {
    const validation = await validateBybitCredentials(apiKey, apiSecret);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        account_info: validation.balance_info,
        permissions: validation.permissions,
        trading_enabled: validation.trading_enabled,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function encryptCredential(credential: string): Promise<string> {
  // In production, use proper encryption with a secret key
  // For now, we'll use base64 encoding as a placeholder
  return btoa(credential);
}

async function createBybitSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, apiSecret: string): Promise<string> {
  const message = timestamp + apiKey + recvWindow + queryString;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}