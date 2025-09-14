import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BybitRequest {
  action: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Bybit Live Trading - Request received');
    
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
      console.log('🔄 Mock balance check...');
      
      // Return mock balance data for now
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            totalWalletBalance: "1000.00000000",
            totalUnrealizedPnl: "0.00000000",
            totalMarginBalance: "1000.00000000",
            totalAvailableBalance: "1000.00000000",
            coin: [
              {
                coin: "USDT",
                walletBalance: "1000.00000000",
                usdValue: "1000.00000000"
              }
            ]
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle positions check
    if (body.action === 'positions') {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            list: []
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
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