import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      symbol, 
      side, 
      amountUSD, 
      leverage = 1, 
      orderType = 'Market',
      price,
      stopLoss,
      takeProfit,
      scalpMode = false,
      testMode = true
    } = await req.json();

    console.log('🚀 AItradeX1 Trade Executor:', { action, symbol, side, amountUSD, orderType, testMode });

    if (action === 'status') {
      return new Response(JSON.stringify({
        success: true,
        status: 'connected',
        message: 'Trade executor is operational',
        testMode,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action !== 'place_order') {
      throw new Error(`Unknown action: ${action}`);
    }

    // Validate required parameters
    if (!symbol || !side || !amountUSD) {
      throw new Error('Missing required parameters: symbol, side, amountUSD');
    }

    // Calculate position size with minimums
    const minAmount = scalpMode ? 1 : 5;
    const finalAmount = Math.max(amountUSD, minAmount);

    // Clean symbol format
    const cleanSymbol = symbol.replace(/[\/\s]/g, '');
    
    // Calculate quantity based on price (need to get current price first)
    let currentPrice = price;
    if (!currentPrice) {
      // Get current price from Bybit public API
      try {
        const priceResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${cleanSymbol}`);
        const priceData = await priceResponse.json();
        currentPrice = parseFloat(priceData.result?.list?.[0]?.lastPrice || '100');
      } catch {
        currentPrice = 100; // Fallback price
      }
    }
    
    const qty = (finalAmount / currentPrice).toFixed(6);
    
    // Prepare signal data for Bybit API exactly as expected
    const tradeSignal = {
      symbol: cleanSymbol,
      side: side, // 'Buy' or 'Sell'
      orderType: orderType || 'Market',
      qty: qty,
      timeInForce: orderType === 'Market' ? 'IOC' : 'GTC',
      ...(orderType === 'Limit' && price && { price: price.toString() }),
      ...(stopLoss && { stopLoss: stopLoss.toString() }),
      ...(takeProfit && { takeProfit: takeProfit.toString() })
    };

    console.log('📋 Calling Bybit Live Trading with:', { 
      action: 'place_order', 
      signal: tradeSignal,
      testMode,
      cleanSymbol,
      qty,
      currentPrice
    });

    // Call Bybit Live Trading function with correct structure
    const { data: bybitResponse, error: bybitError } = await supabase.functions.invoke('bybit-live-trading', {
      body: {
        action: 'place_order',
        signal: tradeSignal,
        testMode,
        idempotencyKey: crypto.randomUUID()
      }
    });

    if (bybitError) {
      console.error('❌ Bybit API error:', bybitError);
      throw new Error(`Trading error: ${bybitError.message}`);
    }

    if (!bybitResponse?.success) {
      console.error('❌ Bybit trade failed:', bybitResponse);
      throw new Error(bybitResponse?.error || bybitResponse?.message || 'Trade execution failed');
    }

    console.log('✅ Trade executed successfully:', bybitResponse);

    return new Response(JSON.stringify({
      success: true,
      data: bybitResponse.data,
      message: 'Trade executed successfully',
      testMode,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Trade executor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});