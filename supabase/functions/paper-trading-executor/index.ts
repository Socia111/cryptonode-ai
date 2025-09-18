import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const { symbol, side, quantity, amount, orderType = 'Market', testMode = true } = body
    
    // Handle both quantity and amount parameters
    let tradeQuantity = quantity;
    if (!tradeQuantity && amount) {
      // Convert amount to quantity based on current market price
      try {
        const { data: marketPrice } = await supabase
          .from('live_market_data')
          .select('price')
          .eq('symbol', symbol)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (marketPrice?.price) {
          tradeQuantity = amount / Number(marketPrice.price);
        }
      } catch (err) {
        console.warn('[paper-trading-executor] Could not fetch price for amount conversion:', err);
      }
    }
    
    // Default quantities for different assets if no quantity provided
    if (!tradeQuantity) {
      if (symbol.includes('BTC')) tradeQuantity = 0.001;
      else if (symbol.includes('ETH')) tradeQuantity = 0.01;
      else if (symbol.includes('SOL')) tradeQuantity = 1;
      else if (symbol.includes('ADA') || symbol.includes('DOGE')) tradeQuantity = 100;
      else tradeQuantity = 0.1;
    }
    
    console.log('[paper-trading-executor] Executing paper trade:', { symbol, side, quantity: tradeQuantity, orderType })
    
    if (!symbol || !side || !tradeQuantity) {
      throw new Error('Missing required parameters: symbol, side, quantity')
    }

    // Get REAL current market price from live_market_data
    let executionPrice = 50000; // Fallback
    
    try {
      const { data: marketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('price')
        .eq('symbol', symbol)
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (marketData && !marketError) {
        executionPrice = Number(marketData.price);
        console.log(`[paper-trading-executor] Using REAL market price: ${executionPrice} for ${symbol}`);
      } else {
        console.warn(`[paper-trading-executor] No recent market data for ${symbol}, using fallback price`);
        
        // Try to trigger live feed for this symbol
        await supabase.functions.invoke('live-exchange-feed', {
          body: { symbols: [symbol], trigger: 'trading_execution' }
        });
      }
    } catch (priceError) {
      console.error(`[paper-trading-executor] Error fetching real price for ${symbol}:`, priceError);
    }
    
    const orderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Log the paper trade
    const { data: order, error } = await supabase
      .from('execution_orders')
      .insert({
        symbol,
        side: side.toUpperCase(),
        qty: tradeQuantity,
        status: 'filled',
        paper_mode: true,
        exchange_order_id: orderId,
        amount_usd: tradeQuantity * executionPrice,
        raw_response: {
          orderId,
          symbol,
          side,
          quantity: tradeQuantity,
          price: executionPrice,
          status: 'FILLED',
          executionTime: new Date().toISOString(),
          type: 'paper_trade'
        }
      })
      .select()
      .single()

    if (error) {
      console.error('[paper-trading-executor] Database error:', error)
      throw error
    }

    console.log('[paper-trading-executor] Paper trade executed successfully:', orderId)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId,
        symbol,
        side,
        quantity: tradeQuantity,
        executionPrice,
        status: 'filled',
        type: 'paper_trade',
        order
      }),
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('[paper-trading-executor] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    )
  }
})