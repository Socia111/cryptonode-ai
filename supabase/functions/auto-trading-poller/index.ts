import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Auto-trader poller started using new atomic queueing system');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch and atomically queue high-confidence signals
    const { data: signalsToExecute, error: signalsError } = await supabase
      .rpc('fetch_signals_to_execute', {
        p_min_confidence: 80,
        p_timeframes: ['1h'], // Only 1h signals
        p_limit: 10
      });

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`);
    }

    if (!signalsToExecute || signalsToExecute.length === 0) {
      console.log('📋 No high-confidence signals to execute');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No signals to execute',
          signals_processed: 0,
          trades_executed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Found ${signalsToExecute.length} signals to execute`);

    // 2. Get users with auto-trading enabled
    const { data: configs, error: configError } = await supabase
      .from('user_trading_configs')
      .select('*')
      .eq('auto_execute_enabled', true);

    if (configError) {
      throw new Error(`Failed to fetch trading configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('👥 No users have auto-trading enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users with auto-trading enabled',
          signals_processed: signalsToExecute.length,
          trades_executed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👥 Found ${configs.length} users with auto-trading enabled`);

    let totalExecuted = 0;
    const results = [];

    // 3. For each user and each signal, execute trades
    for (const config of configs) {
      let userExecuted = 0;

      for (const signal of signalsToExecute) {
        try {
          // Check if user already has max positions
          const { data: openTrades } = await supabase
            .from('trades')
            .select('id')
            .eq('user_id', config.user_id)
            .eq('status', 'open');

          const currentPositions = openTrades?.length || 0;
          if (currentPositions >= config.max_open_positions) {
            console.log(`🚫 User ${config.user_id} has max positions (${currentPositions}/${config.max_open_positions})`);
            continue;
          }

          // Calculate position size based on risk per trade
          const orderSizeUSDT = config.risk_per_trade || 1.0;
          const leverage = config.leverage || 5;
          
          // Prepare order for Bybit
          const orderPayload = {
            category: 'linear',
            symbol: signal.symbol.replace('/', ''),
            side: signal.side,
            orderType: 'Market',
            qty: (orderSizeUSDT * leverage / (signal.entry_hint || 50000)).toFixed(4),
            timeInForce: 'IOC',
            orderLinkId: `auto_${signal.id}_${Date.now()}`,
            positionIdx: 0
          };

          // Add stop loss and take profit if available
          if (signal.sl_price) {
            orderPayload.stopLoss = signal.sl_price.toString();
            orderPayload.slTriggerBy = 'LastPrice';
            orderPayload.slOrderType = 'Market';
          }
          
          if (signal.tp_price) {
            orderPayload.takeProfit = signal.tp_price.toString();
            orderPayload.tpTriggerBy = 'LastPrice';
            orderPayload.tpOrderType = 'Market';
          }

          console.log(`🎯 Executing order for ${signal.symbol} (confidence: ${signal.confidence}%)`);

          // Execute via bybit-order-execution endpoint
          const orderResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bybit-order-execution/order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify(orderPayload)
          });

          const orderResult = await orderResponse.json();

          if (orderResult.ok && orderResult.result?.retCode === 0) {
            // Log trade using the new atomic function
            const { data: tradeId, error: tradeError } = await supabase
              .rpc('log_trade_sent', {
                p_user_id: config.user_id,
                p_strategy_signal_id: signal.id,
                p_symbol: signal.symbol,
                p_side: signal.side,
                p_qty: parseFloat(orderPayload.qty),
                p_tp: signal.tp_price,
                p_sl: signal.sl_price,
                p_order_link_id: orderPayload.orderLinkId
              });

            if (!tradeError) {
              userExecuted++;
              totalExecuted++;
              console.log(`✅ Successfully executed ${signal.symbol} for user ${config.user_id}`);
            }
          } else {
            const errorMsg = orderResult.data?.retMsg || orderResult.error || 'Unknown error';
            console.error(`❌ Failed to execute ${signal.symbol}:`, errorMsg);
          }
        } catch (error) {
          console.error(`❌ Error executing ${signal.symbol}:`, error.message);
        }
      }

      results.push({
        user_id: config.user_id,
        signals_available: signalsToExecute.length,
        executed: userExecuted
      });
    }

    // 4. Update trading session stats
    await supabase.rpc('update_trading_session_stats', {
      p_signals_processed: signalsToExecute.length,
      p_trades_executed: totalExecuted,
      p_users_processed: configs.length
    });

    console.log(`🎉 Auto-trader completed: ${totalExecuted} orders executed from ${signalsToExecute.length} signals`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-trader completed successfully`,
        signals_processed: signalsToExecute.length,
        total_executed: totalExecuted,
        users_processed: configs.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auto-trader error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});