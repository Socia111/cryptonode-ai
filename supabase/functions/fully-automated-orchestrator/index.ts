import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting Fully Automated Trading Orchestrator');

    // Phase 1: Generate Fresh Signals
    console.log('📡 Phase 1: Generating live signals...');
    const signalGeneration = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: { 
        mode: 'live_production',
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'],
        force_generate: true
      }
    });

    console.log('📊 Signal generation result:', signalGeneration);

    // Get high-quality signals with lowered threshold
    const { data: highQualitySignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', 60) // ✅ Lowered threshold from 70 to 60
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('score', { ascending: false })
      .limit(10); // Process more signals

    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError);
      throw signalsError;
    }

    console.log(`🎯 Found ${highQualitySignals?.length || 0} high-quality signals`);

    // Phase 3: Get Automated Trading Config
    const { data: config, error: configError } = await supabase
      .from('automated_trading_config')
      .select('*')
      .eq('enabled', true)
      .single();

    if (configError || !config) {
      console.log('⚠️ No enabled automated trading config found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Automated trading not enabled',
        signals_found: highQualitySignals?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Automated trading enabled for user:', config.user_id);

    // Execute trades for signals that meet the lowered criteria
    const tradeResults = [];
    
    for (const signal of highQualitySignals || []) {
      if (signal.score >= 60) { // ✅ Lowered threshold
        console.log(`🚀 Executing trade for ${signal.symbol} (Score: ${signal.score})`);
        
        try {
          const tradeExecution = await supabase.functions.invoke('automated-trading-executor', {
            body: {
              signal_id: signal.id,
              user_id: config.user_id,
              symbol: signal.symbol,
              direction: signal.direction,
              amount_usd: 100, // Default amount
              leverage: 1,
              paper_mode: true, // Start with paper trading
              entry_price: signal.price,
              stop_loss: signal.stop_loss,
              take_profit: signal.take_profit
            }
          });

          console.log(`📈 Trade result for ${signal.symbol}:`, tradeExecution);
          tradeResults.push({
            symbol: signal.symbol,
            score: signal.score,
            result: tradeExecution.data || tradeExecution.error
          });

        } catch (tradeError) {
          console.error(`❌ Trade execution failed for ${signal.symbol}:`, tradeError);
          tradeResults.push({
            symbol: signal.symbol,
            score: signal.score,
            error: tradeError.message
          });
        }
      }
    }

    // Phase 5: Update System Status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'fully_automated_orchestrator',
        status: 'active',
        metadata: {
          last_run: new Date().toISOString(),
          signals_processed: highQualitySignals?.length || 0,
          trades_executed: tradeResults.length,
          success_rate: tradeResults.filter(r => !r.error).length / Math.max(tradeResults.length, 1)
        },
        success_count: tradeResults.filter(r => !r.error).length,
        last_update: new Date().toISOString()
      });

    console.log('🎉 Automated orchestrator completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      signals_found: highQualitySignals?.length || 0,
      trades_executed: tradeResults.length,
      trade_results: tradeResults,
      config_user: config.user_id,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Automated orchestrator error:', error);
    
    // Update system status with error
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'fully_automated_orchestrator',
        status: 'error',
        metadata: {
          last_error: error.message,
          error_timestamp: new Date().toISOString()
        },
        error_count: 1,
        last_update: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});