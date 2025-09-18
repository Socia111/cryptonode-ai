import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('🤖 Auto-trading poller activated');

    // Check if auto-trading is globally enabled
    const autoTradingEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true';
    if (!autoTradingEnabled) {
      console.log('🔒 Auto-trading is disabled globally');
      return new Response(JSON.stringify({
        success: false,
        message: 'Auto-trading is disabled',
        trades_executed: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get high-confidence signals from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', oneHourAgo)
      .gte('score', 85) // Only execute high-confidence signals
      .eq('algo', 'AITRADEX1')
      .order('score', { ascending: false })
      .limit(10);

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`);
    }

    if (!signals || signals.length === 0) {
      console.log('📊 No high-confidence signals found for auto-trading');
      return new Response(JSON.stringify({
        success: true,
        message: 'No signals to execute',
        trades_executed: 0,
        signals_checked: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`📊 Found ${signals.length} high-confidence signals for potential execution`);

    // Get active trading accounts (users who have enabled auto-trading)
    const { data: accounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('exchange', 'bybit');

    if (accountsError) {
      throw new Error(`Failed to fetch trading accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('👤 No active trading accounts found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No active trading accounts',
        trades_executed: 0,
        signals_checked: signals.length
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`👤 Found ${accounts.length} active trading accounts`);

    let totalTradesExecuted = 0;
    const paperTradingMode = Deno.env.get('PAPER_TRADING') !== 'false';

    // Execute trades for each high-confidence signal
    for (const signal of signals.slice(0, 5)) { // Limit to top 5 signals
      for (const account of accounts.slice(0, 3)) { // Limit to 3 accounts for safety
        try {
          console.log(`🎯 Executing ${signal.direction} ${signal.symbol} for user ${account.user_id}`);
          
          const tradeAmount = Number(Deno.env.get('DEFAULT_TRADE_AMOUNT') || '100');
          const leverage = Number(Deno.env.get('DEFAULT_LEVERAGE') || '1');

          // Execute the trade
          const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
            body: {
              action: 'execute_trade',
              symbol: signal.symbol,
              side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
              amountUSD: tradeAmount,
              leverage: leverage,
              paper_mode: paperTradingMode,
              user_id: account.user_id,
              signal_id: signal.id,
              auto_trade: true
            }
          });

          if (tradeError) {
            console.error(`❌ Trade execution failed for ${signal.symbol}:`, tradeError);
            continue;
          }

          if (tradeResult?.success) {
            totalTradesExecuted++;
            console.log(`✅ Trade executed: ${signal.direction} ${signal.symbol} for ${tradeAmount} USDT`);
            
            // Log the trade execution
            await supabase.from('trade_logs').insert({
              symbol: signal.symbol,
              side: signal.direction,
              amount: tradeAmount,
              leverage: leverage,
              paper_trade: paperTradingMode,
              status: 'executed',
              bybit_response: tradeResult,
              created_at: new Date().toISOString()
            });
          }

        } catch (tradeError) {
          console.error(`❌ Failed to execute trade for ${signal.symbol}:`, tradeError);
        }
      }
    }

    console.log(`🎉 Auto-trading cycle completed: ${totalTradesExecuted} trades executed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Auto-trading completed successfully`,
      trades_executed: totalTradesExecuted,
      signals_checked: signals.length,
      accounts_checked: accounts.length,
      paper_mode: paperTradingMode,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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