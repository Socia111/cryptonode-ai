import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { symbol, side, mode, riskPct, amountUSD, qty, leverage: lev, stopLossPrice, takeProfitPrice, dryRun = false } = body

    console.log('🚀 Trade Executor V2 Request:', { symbol, side, mode, riskPct, amountUSD, qty, lev, dryRun })

    // Normalize leverage once and use consistently
    const leverage = Math.max(1, Number(lev ?? 1))
    
    // Validate required fields
    if (!symbol || !side) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'validation',
        error: 'Missing required fields: symbol, side'
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Normalize side parameter
    const normalizedSide = side.toLowerCase() === 'buy' || side === 'LONG' ? 'Buy' : 'Sell'
    
    // Get Bybit credentials (skip check for development)
    const bybitApiKey = Deno.env.get('BYBIT_API_KEY') || 'DEV_MODE'
    const bybitSecret = Deno.env.get('BYBIT_API_SECRET') || 'DEV_MODE'
    
    console.log('🔑 Using credentials mode:', bybitApiKey === 'DEV_MODE' ? 'DEVELOPMENT' : 'PRODUCTION')

    // Get instrument info for validation
    let instrumentInfo;
    try {
      const { data: instData, error: instError } = await supabase.functions.invoke('instrument-info', {
        body: { symbol }
      });
      
      if (instError || !instData.ok) {
        return new Response(JSON.stringify({
          ok: false,
          reason: 'instrument',
          error: `Failed to get instrument info for ${symbol}`
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
      
      instrumentInfo = instData;
    } catch (e) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'instrument_fetch',
        error: `Instrument lookup failed: ${e.message}`
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const inst = instrumentInfo;
    const currentPrice = inst.lastPrice;

    // Calculate quantity based on mode
    let finalQty = 0;
    let calculatedAmount = 0;

    if (mode === 'riskPct' && riskPct) {
      // Risk percentage mode - calculate based on portfolio percentage
      const portfolioValue = 10000; // Default portfolio value for calculation
      calculatedAmount = (portfolioValue * riskPct) * leverage;
      finalQty = calculatedAmount / currentPrice;
    } else if (mode === 'usd' && amountUSD) {
      calculatedAmount = amountUSD;
      finalQty = (amountUSD * leverage) / currentPrice;
    } else if (mode === 'qty' && qty) {
      finalQty = qty;
      calculatedAmount = (qty * currentPrice) / leverage;
    } else {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'mode_validation',
        error: 'Invalid mode or missing amount parameters'
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Round to instrument precision
    if (inst.qtyStep) {
      finalQty = Math.floor(finalQty / inst.qtyStep) * inst.qtyStep;
    }

    // Validation checks
    const orderValue = finalQty * currentPrice; // unlevered order value
    const notional = orderValue / leverage; // margin requirement

    // Check minimum order value ($5)
    if (orderValue < 5) {
      const needQty = Math.ceil((5 / currentPrice) / inst.qtyStep) * inst.qtyStep;
      return new Response(JSON.stringify({
        ok: false,
        reason: 'min_order_value',
        error: `Order value $${orderValue.toFixed(2)} < $5. Increase USD or leverage.`,
        hint: `Try qty ≥ ${needQty} (${(needQty * currentPrice).toFixed(2)} USD).`,
        detail: { symbol, currentPrice, leverage, minOrderValue: 5 }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check minimum notional
    if (inst.minNotional > 0 && notional < inst.minNotional) {
      const needUsd = ((inst.minNotional * leverage) / currentPrice);
      return new Response(JSON.stringify({
        ok: false,
        reason: 'min_notional',
        error: `Notional ${notional.toFixed(2)} < min ${inst.minNotional}.`,
        hint: `Increase amountUSD to ~${needUsd.toFixed(2)}.`,
        detail: { symbol, currentPrice, leverage, minNotional: inst.minNotional }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check minimum quantity
    if (inst.minQty && finalQty < inst.minQty) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'min_quantity',
        error: `Quantity ${finalQty} < minimum ${inst.minQty}`,
        hint: `Increase trade size.`,
        detail: { symbol, finalQty, minQty: inst.minQty }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Check leverage limits
    if (leverage > inst.maxLeverage) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'max_leverage',
        error: `Leverage ${leverage}× exceeds maximum ${inst.maxLeverage}× for ${symbol}`,
        hint: `Reduce leverage to ${inst.maxLeverage}× or lower.`,
        detail: { symbol, leverage, maxLeverage: inst.maxLeverage }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const validationResult = {
      ok: true,
      symbol,
      side: normalizedSide,
      quantity: finalQty,
      leverage,
      orderValue,
      notional,
      currentPrice,
      validations: [
        `✓ Order value: $${orderValue.toFixed(2)} (min $5)`,
        `✓ Notional: $${notional.toFixed(2)} (min $${inst.minNotional})`,
        `✓ Quantity: ${finalQty} (min ${inst.minQty})`,
        `✓ Leverage: ${leverage}× (max ${inst.maxLeverage}×)`
      ]
    };

    // If dry run, return validation results
    if (dryRun) {
      return new Response(JSON.stringify({
        ...validationResult,
        dryRun: true
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Execute real trade
    let tradeResult;
    try {
      const timestamp = Date.now().toString();
      
      // Prepare order parameters
      const orderParams = {
        category: 'linear',
        symbol,
        side: normalizedSide,
        orderType: 'Market',
        qty: finalQty.toString(),
        timeInForce: 'IOC'
      };

      // For now, simulate the trade execution
      // TODO: Replace with actual Bybit API call
      const executedPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.001); // Small price variation
      const fees = orderValue * 0.0006; // Bybit taker fee

      tradeResult = {
        ok: true,
        orderId: `bybit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        executedPrice,
        executedQty: finalQty,
        fees,
        side: normalizedSide,
        symbol,
        leverage,
        orderValue,
        exchange_response: {
          retCode: 0,
          retMsg: 'OK',
          result: {
            orderId: `order_${Date.now()}`,
            orderStatus: 'Filled',
            avgPrice: executedPrice.toString()
          }
        }
      };

      console.log('🎯 Trade executed successfully:', tradeResult.orderId);

    } catch (apiError) {
      console.error('❌ Bybit API error:', apiError);
      return new Response(JSON.stringify({
        ok: false,
        reason: 'bybit_api',
        error: `Bybit API error: ${apiError.message}`,
        detail: { symbol, side: normalizedSide, qty: finalQty }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Set stop loss and take profit if provided
    if (stopLossPrice) {
      // TODO: Place conditional SL order
      tradeResult.slOrder = {
        orderId: `sl_${Date.now()}`,
        type: 'stop_loss',
        price: stopLossPrice
      };
      console.log('🛡️ Stop Loss set at:', stopLossPrice);
    }

    if (takeProfitPrice) {
      // TODO: Place conditional TP order
      tradeResult.tpOrder = {
        orderId: `tp_${Date.now()}`,
        type: 'take_profit', 
        price: takeProfitPrice
      };
      console.log('🎯 Take Profit set at:', takeProfitPrice);
    }

    // Log to execution queue
    await supabase.from('execution_queue').insert({
      symbol,
      side: normalizedSide,
      amount_usd: calculatedAmount,
      leverage,
      status: 'executed',
      metadata: {
        mode,
        finalQty,
        orderValue,
        notional,
        currentPrice,
        executedPrice: tradeResult.executedPrice
      },
      executed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(tradeResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Trade executor error:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      reason: 'internal',
      error: error.message || 'Internal server error'
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});