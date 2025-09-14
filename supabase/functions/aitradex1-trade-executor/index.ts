import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  action: string;
  symbol?: string;
  side?: 'Buy' | 'Sell';
  amountUSD?: number;
  leverage?: number;
  orderType?: string;
  timeInForce?: string;
  scalpMode?: boolean;
  reduceOnly?: boolean;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  idempotencyKey?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AItradeX1 Trade Executor - Request received');
    
    const body: TradeRequest = await req.json();
    console.log('📋 Request body:', body);

    // Handle status check
    if (body.action === 'status') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'online',
          timestamp: new Date().toISOString(),
          message: 'AItradeX1 Trade Executor is operational'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle trade execution
    if (body.action === 'place_order') {
      // Get API credentials from secrets
      const apiKey = Deno.env.get('BYBIT_API_KEY');
      const apiSecret = Deno.env.get('BYBIT_API_SECRET');
      
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

      // For now, return a mock success response until Bybit integration is complete
      console.log('✅ Mock trade execution successful');
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            orderId: `mock_${Date.now()}`,
            symbol: body.symbol,
            side: body.side,
            amountUSD: body.amountUSD,
            leverage: body.leverage,
            status: 'filled',
            message: 'Mock trade executed successfully (API integration in progress)'
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
    console.error('❌ Trade executor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});