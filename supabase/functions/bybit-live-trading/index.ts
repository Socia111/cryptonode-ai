import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bybit API helper functions
function generateSignature(params: string, secret: string): string {
  const hmac = createHmac("sha256", new TextEncoder().encode(secret));
  hmac.update(new TextEncoder().encode(params));
  return Array.from(new Uint8Array(hmac.digest()))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function makeBybitRequest(endpoint: string, params: any = {}, apiKey: string, apiSecret: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  
  // Create parameter string for signing
  const paramString = timestamp + apiKey + recvWindow + (Object.keys(params).length ? JSON.stringify(params) : '');
  const signature = generateSignature(paramString, apiSecret);
  
  const url = `https://api-testnet.bybit.com${endpoint}`;
  
  console.log(`🔄 Bybit API Call: GET ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

interface BybitRequest {
  action: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Bybit Live Trading - REAL API Request received');
    
    const body: BybitRequest = await req.json();
    console.log('📋 Request action:', body.action);

    // Get API credentials
    const apiKey = Deno.env.get('BYBIT_API_KEY');
    const apiSecret = Deno.env.get('BYBIT_API_SECRET');
    
    console.log('🔧 Environment Check:');
    console.log('- Live Trading: true');
    console.log('- API Key present:', !!apiKey, apiKey ? `(${apiKey.length} chars)` : '');
    console.log('- API Secret present:', !!apiSecret, apiSecret ? `(${apiSecret.length} chars)` : '');
    console.log('- Base URL: https://api.bybit.com');
    console.log('- Is Testnet: true');

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing Bybit API credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Bybit API credentials. Please configure BYBIT_API_KEY and BYBIT_API_SECRET.',
          code: 'MISSING_CREDENTIALS'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Handle balance check
    if (body.action === 'balance') {
      console.log('🔄 Fetching real account balance...');
      
      try {
        const balanceData = await makeBybitRequest('/v5/account/wallet-balance', {
          accountType: 'UNIFIED'
        }, apiKey, apiSecret);
        
        console.log('📊 Balance response:', balanceData);
        
        if (balanceData.retCode !== 0) {
          throw new Error(`Balance check failed: ${balanceData.retMsg}`);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            data: balanceData.result
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
        
      } catch (error) {
        console.error('❌ Balance check error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Balance check failed: ${error.message}`,
            code: 'BALANCE_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }

    // Handle positions check
    if (body.action === 'positions') {
      try {
        const positionsData = await makeBybitRequest('/v5/position/list', {
          category: 'linear'
        }, apiKey, apiSecret);
        
        console.log('📊 Positions response:', positionsData);
        
        if (positionsData.retCode !== 0) {
          throw new Error(`Positions check failed: ${positionsData.retMsg}`);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            data: positionsData.result
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
        
      } catch (error) {
        console.error('❌ Positions check error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Positions check failed: ${error.message}`,
            code: 'POSITIONS_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action',
        code: 'INVALID_ACTION'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('❌ Bybit Live Trading Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});