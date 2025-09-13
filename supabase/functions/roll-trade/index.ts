import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RollRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  amountUSD: number;
  clientId?: string;
}

interface RollResult {
  symbol: string;
  side: 'Buy' | 'Sell';
  entryPrice: number;
  leverage: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  baseQty: number;
  orderId: string;
  tpOrderId?: string;
  slOrderId?: string;
  status: 'OPENED' | 'REJECTED';
  raw?: any;
}

// Helper functions for calculations
function calculateTPSL(entryPrice: number, side: 'Buy' | 'Sell') {
  const tpROI = 0.06; // +6%
  const slROI = -0.03; // -3%
  
  if (side === 'Buy') {
    return {
      tp: entryPrice * (1 + tpROI),
      sl: entryPrice * (1 + slROI)
    };
  } else {
    return {
      tp: entryPrice * (1 - tpROI),
      sl: entryPrice * (1 + Math.abs(slROI))
    };
  }
}

function roundToStep(value: number, stepSize: string): number {
  const step = parseFloat(stepSize);
  return Math.floor(value / step) * step;
}

function roundToTick(value: number, tickSize: string): number {
  const tick = parseFloat(tickSize);
  return Math.round(value / tick) * tick;
}

// Bybit API integration
async function callBybitBroker(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const baseUrl = Deno.env.get('BYBIT_BROKER_URL') || 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';
  
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bybit broker error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: RollRequest = await req.json();
    const { symbol, side, amountUSD, clientId } = body;

    // Validate input
    if (!symbol || !side || !amountUSD || amountUSD <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: symbol, side, and positive amountUSD required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['Buy', 'Sell'].includes(side)) {
      return new Response(
        JSON.stringify({ error: 'Invalid side: must be Buy or Sell' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ROLL] Processing ${side} ${symbol} for $${amountUSD}`);

    // Step 1: Get current market price and symbol info
    const tickerData = await callBybitBroker(`/tickers?category=linear&symbol=${symbol}`);
    if (!tickerData?.result?.list?.[0]) {
      throw new Error(`No ticker data found for ${symbol}`);
    }

    const ticker = tickerData.result.list[0];
    const entryPrice = parseFloat(ticker.lastPrice);
    
    // Step 2: Calculate TP/SL prices
    const { tp, sl } = calculateTPSL(entryPrice, side);
    
    // Step 3: Calculate quantity
    const leverage = 10;
    const notionalValue = amountUSD * leverage;
    const baseQty = notionalValue / entryPrice;
    
    // For now, we'll use a simplified quantity (should be refined with proper step size)
    const roundedQty = Math.floor(baseQty * 1000) / 1000; // 3 decimal places

    console.log(`[ROLL] Entry: ${entryPrice}, TP: ${tp}, SL: ${sl}, Qty: ${roundedQty}`);

    // Step 4: Place market order via Bybit broker
    const orderParams = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty: roundedQty.toString(),
      positionIdx: 0,
    };

    // Add client order ID for idempotency
    if (clientId) {
      (orderParams as any).orderLinkId = clientId;
    }

    const orderResult = await callBybitBroker('/order', 'POST', orderParams);
    
    if (!orderResult?.result?.orderId) {
      throw new Error('Failed to place order: ' + JSON.stringify(orderResult));
    }

    // Step 5: Set position TP/SL (simplified approach)
    // Note: In a production system, you'd want to set these as proper OCO orders
    console.log(`[ROLL] Order placed: ${orderResult.result.orderId}`);
    
    const result: RollResult = {
      symbol,
      side,
      entryPrice,
      leverage,
      takeProfitPrice: tp,
      stopLossPrice: sl,
      baseQty: roundedQty,
      orderId: orderResult.result.orderId,
      status: 'OPENED',
      raw: orderResult
    };

    console.log(`[ROLL] Success:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ROLL] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});