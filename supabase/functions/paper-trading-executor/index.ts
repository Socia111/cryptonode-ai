import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

    const { symbol, side, amount, leverage, paperMode = true, quantity } = await req.json();

    console.log(`[Paper Trading Executor] Processing paper trade: ${symbol} ${side} ${amount || quantity}`);

    // Simulate paper trade execution
    const orderResult = {
      success: true,
      order_id: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side: side.toLowerCase(),
      quantity: quantity || amount || 0.001,
      leverage: leverage || 1,
      paper_mode: true,
      status: 'filled',
      timestamp: new Date().toISOString()
    };

    // Log the paper trade to execution_orders table
    const { data: insertData, error: insertError } = await supabase
      .from('execution_orders')
      .insert({
        symbol,
        side: side.toLowerCase(),
        qty: quantity || amount || 0.001,
        amount_usd: (quantity || amount || 0.001) * 50000, // Mock price calculation
        leverage: leverage || 1,
        paper_mode: true,
        status: 'filled',
        exchange_order_id: orderResult.order_id,
        raw_response: orderResult
      });

    if (insertError) {
      console.error('[Paper Trading Executor] Failed to log trade:', insertError);
    } else {
      console.log('[Paper Trading Executor] Trade logged successfully');
    }

    // Log to audit trail
    await supabase
      .from('audit_log')
      .insert({
        action: 'paper_trade_executed',
        resource_type: 'trade',
        resource_id: orderResult.order_id,
        metadata: {
          symbol,
          side,
          quantity: quantity || amount,
          leverage,
          paper_mode: true
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Paper trade executed successfully',
        data: orderResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Paper Trading Executor] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});