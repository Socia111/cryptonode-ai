import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  notionalUSD: number;
  testMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: TradeRequest = await req.json();
    console.log('🚀 Trade execution request:', body);

    // Validate request
    if (!body.symbol || !body.side || !body.notionalUSD) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: symbol, side, notionalUSD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For now, simulate successful trade execution
    // This can be replaced with actual Bybit API calls later
    const mockTradeResult = {
      success: true,
      orderId: `mock_${Date.now()}`,
      symbol: body.symbol,
      side: body.side,
      quantity: (body.notionalUSD * 0.001).toFixed(6), // Mock quantity calculation
      price: Math.random() * 100 + 1, // Mock price
      status: 'FILLED',
      executedAt: new Date().toISOString(),
      fees: {
        currency: 'USDT',
        amount: (body.notionalUSD * 0.001).toFixed(4) // 0.1% fee
      }
    };

    console.log('✅ Trade executed successfully:', mockTradeResult);

    return new Response(
      JSON.stringify({
        ok: true,
        data: mockTradeResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Trade execution error:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Trade execution failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});