import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('[Auto-Trading Poller] Starting polling cycle...');

    // Check if auto-trading is enabled
    const autoTradingEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true';
    if (!autoTradingEnabled) {
      console.log('[Auto-Trading Poller] Auto-trading is disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-trading disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch high-confidence signals from last 5 minutes that haven't been executed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', 75)
      .gte('created_at', fiveMinutesAgo)
      .order('score', { ascending: false })
      .limit(5);
    
    // Filter out already executed signals (check metadata.executed_at)
    const unexecutedSignals = signals?.filter(s => !s.metadata?.executed_at) || [];

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`);
    }

    if (!unexecutedSignals || unexecutedSignals.length === 0) {
      console.log('[Auto-Trading Poller] No unexecuted signals to process');
      return new Response(
        JSON.stringify({ success: true, signals_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Auto-Trading Poller] Found ${unexecutedSignals.length} signals to process`);

    const executedTrades = [];

    for (const signal of unexecutedSignals) {
      try {
        // Call trade executor
        const tradeExecutorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/aitradex1-trade-executor`;
        const response = await fetch(tradeExecutorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: signal.symbol,
            side: signal.side || (signal.direction === 'LONG' ? 'BUY' : 'SELL'),
            amount_usd: parseFloat(Deno.env.get('DEFAULT_TRADE_AMOUNT') || '100'),
            leverage: parseInt(Deno.env.get('DEFAULT_LEVERAGE') || '1'),
            signal_id: signal.id,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[Auto-Trading Poller] ✅ Executed trade for ${signal.symbol}`);
          executedTrades.push({
            signal_id: signal.id,
            symbol: signal.symbol,
            order_id: result.orderId,
          });

          // Mark signal as executed
          await supabase
            .from('signals')
            .update({ 
              is_active: false,
              metadata: { 
                ...signal.metadata, 
                executed_at: new Date().toISOString(),
                auto_executed: true 
              }
            })
            .eq('id', signal.id);
        } else {
          console.error(`[Auto-Trading Poller] Failed to execute ${signal.symbol}:`, result.error);
        }

      } catch (error) {
        console.error(`[Auto-Trading Poller] Error executing ${signal.symbol}:`, error.message);
      }

      // Add small delay between trades
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[Auto-Trading Poller] ✅ Completed: ${executedTrades.length}/${unexecutedSignals.length} trades executed`);

    return new Response(
      JSON.stringify({
        success: true,
        signals_processed: unexecutedSignals.length,
        trades_executed: executedTrades.length,
        executed_trades: executedTrades,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Auto-Trading Poller] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
