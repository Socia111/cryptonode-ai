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
    console.log('🤖 Auto-trader poller started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with auto-trading enabled
    const { data: configs, error: configError } = await supabase
      .from('user_trading_configs')
      .select('*')
      .eq('auto_execute_enabled', true);

    if (configError) {
      throw new Error(`Failed to fetch trading configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('📋 No users have auto-trading enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users with auto-trading enabled',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👥 Found ${configs.length} users with auto-trading enabled`);

    let totalExecuted = 0;
    const results = [];

    for (const config of configs) {
      try {
        console.log(`🔄 Processing user ${config.user_id}`);

        // Fetch recent high-confidence signals for AItradeX1 strategy
        const { data: signals, error: signalsError } = await supabase
          .from('signals')
          .select('*')
          .gte('confidence_score', config.min_confidence_score || 80)
          .eq('status', 'active')
          .in('timeframe', ['15m', '30m']) // AItradeX1 criteria
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
          .not('symbol', 'in', `(${config.symbols_blacklist?.join(',') || ''})`)
          .order('confidence_score', { ascending: false })
          .limit(config.max_open_positions || 3);

        if (signalsError) {
          console.error(`❌ Error fetching signals for user ${config.user_id}:`, signalsError);
          continue;
        }

        if (!signals || signals.length === 0) {
          console.log(`📊 No qualifying signals for user ${config.user_id}`);
          continue;
        }

        console.log(`📈 Found ${signals.length} qualifying signals for user ${config.user_id}`);

        // Check current open positions to respect max_open_positions
        const { data: openTrades } = await supabase
          .from('trades')
          .select('id')
          .eq('user_id', config.user_id)
          .eq('status', 'open');

        const currentPositions = openTrades?.length || 0;
        const availableSlots = Math.max(0, config.max_open_positions - currentPositions);

        if (availableSlots === 0) {
          console.log(`🚫 User ${config.user_id} has max positions (${currentPositions}/${config.max_open_positions})`);
          continue;
        }

        // Execute signals up to available slots
        const signalsToExecute = signals.slice(0, availableSlots);
        let userExecuted = 0;

        for (const signal of signalsToExecute) {
          try {
            // Calculate order size based on risk per trade
            const orderSizeUSDT = config.risk_per_trade || 10;
            
            // Prepare order payload
            const orderPayload = {
              category: config.use_leverage ? 'linear' : 'spot',
              symbol: signal.symbol.replace('/', ''),
              side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
              orderType: 'Market',
              qty: config.use_leverage ? 
                (orderSizeUSDT / signal.entry_price * config.leverage_amount).toFixed(4) :
                (orderSizeUSDT / signal.entry_price).toFixed(4),
              timeInForce: 'IOC',
              orderLinkId: `auto_${signal.id}_${Date.now()}`,
              positionIdx: config.use_leverage ? 0 : undefined
            };

            // Add stop loss and take profit
            if (signal.stop_loss) {
              orderPayload.stopLoss = signal.stop_loss.toString();
              orderPayload.slTriggerBy = 'LastPrice';
              orderPayload.slOrderType = 'Market';
            }
            
            if (signal.take_profit) {
              orderPayload.takeProfit = signal.take_profit.toString();
              orderPayload.tpTriggerBy = 'LastPrice';
              orderPayload.tpOrderType = 'Market';
            }

            console.log(`🎯 Executing order for ${signal.symbol} (confidence: ${signal.confidence_score}%)`);

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
              userExecuted++;
              totalExecuted++;

              // Log trade to database
              await supabase.from('trades').insert({
                user_id: config.user_id,
                signal_id: signal.id,
                exchange: 'bybit',
                symbol: signal.symbol,
                side: signal.direction,
                quantity: parseFloat(orderPayload.qty),
                entry_price: signal.entry_price,
                leverage: config.use_leverage ? config.leverage_amount : 1,
                status: 'open',
                external_order_id: orderResult.result.result.orderId,
                fees: 0,
                opened_at: new Date().toISOString()
              });

              // Mark signal as executed
              await supabase
                .from('signals')
                .update({ status: 'executed' })
                .eq('id', signal.id);

              console.log(`✅ Successfully executed ${signal.symbol} for user ${config.user_id}`);
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
          signals_found: signals.length,
          executed: userExecuted,
          available_slots: availableSlots
        });

      } catch (error) {
        console.error(`❌ Error processing user ${config.user_id}:`, error.message);
      }
    }

    console.log(`🎉 Auto-trader completed: ${totalExecuted} orders executed across ${configs.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-trader completed successfully`,
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