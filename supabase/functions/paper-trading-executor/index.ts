import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[paper-trading-executor] Received trade request:', body);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      symbol = 'BTCUSDT',
      side = 'buy',
      amount = 100,
      leverage = 1,
      orderType = 'market',
      paperMode = true,
      userId
    } = body;

    // Get current market price (simulate realistic execution)
    const basePrice = symbol === 'BTCUSDT' ? 92100 :
                     symbol === 'ETHUSDT' ? 3420 :
                     symbol === 'SOLUSDT' ? 243 : 50000;
    
    // Add realistic slippage
    const slippage = 0.001 + Math.random() * 0.002; // 0.1-0.3% slippage
    const executedPrice = side === 'buy' ? 
      basePrice * (1 + slippage) : 
      basePrice * (1 - slippage);

    const quantity = amount / executedPrice;

    // Create execution order record
    const orderData = {
      user_id: userId || null,
      symbol,
      side,
      amount_usd: amount,
      qty: Number(quantity.toFixed(6)),
      leverage: leverage || 1,
      paper_mode: paperMode,
      status: 'filled',
      exchange_order_id: `PAPER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ret_code: 0,
      ret_msg: 'OK',
      raw_response: {
        orderId: `PAPER_${Date.now()}`,
        symbol,
        side,
        orderType,
        qty: quantity,
        price: executedPrice,
        timeInForce: 'GTC',
        orderStatus: 'Filled',
        avgPrice: executedPrice,
        cumExecQty: quantity,
        cumExecValue: amount,
        cumExecFee: amount * 0.001, // 0.1% fee
        createTime: Date.now(),
        updateTime: Date.now()
      }
    };

    console.log('[paper-trading-executor] Creating order record:', orderData);

    const { data: order, error: orderError } = await supabase
      .from('execution_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('[paper-trading-executor] Order insert error:', orderError);
      throw orderError;
    }

    // Log to trade_logs
    await supabase.from('trade_logs').insert({
      symbol,
      side,
      quantity,
      price: executedPrice,
      amount,
      leverage,
      paper_trade: paperMode,
      status: 'filled',
      order_type: orderType,
      exchange: 'bybit',
      bybit_order_id: orderData.exchange_order_id,
      bybit_response: orderData.raw_response
    });

    const result = {
      success: true,
      orderId: order.exchange_order_id,
      message: `${paperMode ? 'Paper' : 'Live'} ${side.toUpperCase()} order executed successfully`,
      executedPrice: Number(executedPrice.toFixed(4)),
      executedQty: Number(quantity.toFixed(6)),
      executedValue: amount,
      fees: Number((amount * 0.001).toFixed(4)),
      timestamp: new Date().toISOString(),
      orderDetails: order
    };

    console.log('[paper-trading-executor] ✅ Trade executed successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[paper-trading-executor] ❌ Trade execution failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Trade execution failed',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});