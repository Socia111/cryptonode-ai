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

    console.log('🚀 AItradeX1 Trade Executor:', { action, symbol, side, amountUSD });

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

    // Calculate position size
    const minAmount = scalpMode ? 1 : 5;
    const finalAmount = Math.max(amountUSD, minAmount);
    
    // Clean symbol format
    const cleanSymbol = symbol.replace(/[\/\s]/g, '');
    
    // Prepare signal for Bybit API
    const tradeSignal = {
      symbol: cleanSymbol,
      side: side,
      orderType: orderType,
      qty: (finalAmount / (price || 100)).toString(), // Approximate qty calculation
      ...(price && orderType === 'Limit' && { price: price.toString() }),
      ...(orderType === 'Market' && { timeInForce: 'IOC' }),
      ...(orderType === 'Limit' && { timeInForce: 'GTC' }),
      ...(stopLoss && { stopLoss: stopLoss.toString() }),
      ...(takeProfit && { takeProfit: takeProfit.toString() })
    };

    // Call Bybit Live Trading function
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
      throw new Error(bybitResponse?.error || 'Trade execution failed');
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