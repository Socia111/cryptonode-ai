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
    console.log('[Comprehensive Trading Pipeline] Starting complete real data trading pipeline...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'full'; // 'full', 'data_only', 'signals_only'

    let results = {
      success: true,
      pipeline_mode: mode,
      timestamp: new Date().toISOString(),
      steps_completed: [],
      market_data_points: 0,
      signals_generated: 0,
      errors: []
    };

    try {
      // STEP 1: Fetch Real Market Data
      if (mode === 'full' || mode === 'data_only') {
        console.log('[Pipeline] Step 1: Fetching real market data...');
        
        const liveExchangeResponse = await supabase.functions.invoke('enhanced-ccxt-feed', {
          body: { 
            symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'],
            exchanges: ['bybit'],
            trigger: 'pipeline_orchestration',
            force_refresh: true 
          }
        });

        if (liveExchangeResponse.error) {
          console.error('[Pipeline] Live exchange feed error:', liveExchangeResponse.error);
          results.errors.push(`Live exchange feed failed: ${liveExchangeResponse.error.message}`);
        } else {
          console.log('[Pipeline] ✅ Step 1 completed: Live market data fetched');
          results.steps_completed.push('live_market_data_fetch');
          results.market_data_points = liveExchangeResponse.data?.marketDataPoints || 0;
        }

        // Wait for data to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // STEP 2: Generate Real Signals from Market Data
      if (mode === 'full' || mode === 'signals_only') {
        console.log('[Pipeline] Step 2: Generating real signals...');
        
        // Clear old signals first
        const { data: deletedSignals } = await supabase
          .from('signals')
          .delete()
          .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
          .select();

        console.log(`[Pipeline] Cleaned ${deletedSignals?.length || 0} old signals`);

        // Enhanced Signal Generation (with real data)
        const enhancedResponse = await supabase.functions.invoke('enhanced-signal-generation', {
          body: { trigger: 'pipeline_orchestration' }
        });

        let enhancedSignals = 0;
        if (enhancedResponse.error) {
          console.error('[Pipeline] Enhanced signal generation error:', enhancedResponse.error);
          results.errors.push(`Enhanced signals failed: ${enhancedResponse.error.message}`);
        } else {
          enhancedSignals = enhancedResponse.data?.signals_generated || 0;
          console.log(`[Pipeline] ✅ Enhanced signals generated: ${enhancedSignals}`);
        }

        // AItradeX1 Enhanced Scanner (with real data)
        const scannerResponse = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
          body: { 
            symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'],
            trigger: 'pipeline_orchestration'
          }
        });

        let scannerSignals = 0;
        if (scannerResponse.error) {
          console.error('[Pipeline] Scanner signal generation error:', scannerResponse.error);
          results.errors.push(`Scanner signals failed: ${scannerResponse.error.message}`);
        } else {
          scannerSignals = scannerResponse.data?.signals_found || 0;
          console.log(`[Pipeline] ✅ Scanner signals generated: ${scannerSignals}`);
        }

        results.signals_generated = enhancedSignals + scannerSignals;
        results.steps_completed.push('real_signal_generation');
        console.log(`[Pipeline] ✅ Step 2 completed: ${results.signals_generated} total signals generated`);
      }

      // STEP 3: Update Exchange Feed Status
      console.log('[Pipeline] Step 3: Updating system status...');
      
      const { error: statusError } = await supabase
        .from('exchange_feed_status')
        .upsert({
          exchange: 'comprehensive_pipeline',
          status: 'active',
          last_update: new Date().toISOString(),
          symbols_tracked: 15,
          error_count: results.errors.length,
          last_error: results.errors.length > 0 ? results.errors[results.errors.length - 1] : null
        }, {
          onConflict: 'exchange'
        });

      if (statusError) {
        console.error('[Pipeline] Status update error:', statusError);
        results.errors.push(`Status update failed: ${statusError.message}`);
      } else {
        results.steps_completed.push('status_update');
        console.log('[Pipeline] ✅ Step 3 completed: System status updated');
      }

      // STEP 4: Validate Generated Data
      console.log('[Pipeline] Step 4: Validating generated data...');
      
      const { data: recentSignals, error: signalsError } = await supabase
        .from('signals')
        .select('id, symbol, direction, score, source, metadata')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (signalsError) {
        results.errors.push(`Signal validation failed: ${signalsError.message}`);
      } else {
        const realDataSignals = recentSignals?.filter(s => 
          s.source?.includes('real') || 
          s.metadata?.real_data === true
        ).length || 0;
        
        results.real_data_signals = realDataSignals;
        results.total_recent_signals = recentSignals?.length || 0;
        results.steps_completed.push('data_validation');
        console.log(`[Pipeline] ✅ Step 4 completed: ${realDataSignals}/${recentSignals?.length || 0} signals using real data`);
      }

      // STEP 5: Performance Metrics
      const { data: marketDataCount } = await supabase
        .from('live_market_data')
        .select('id', { count: 'exact' })
        .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      results.market_data_count = marketDataCount?.length || 0;
      results.pipeline_success = results.errors.length === 0;
      results.steps_completed.push('performance_metrics');

      console.log(`[Pipeline] ✅ Complete pipeline finished: ${results.steps_completed.length} steps completed`);

    } catch (pipelineError) {
      console.error('[Pipeline] Critical pipeline error:', pipelineError);
      results.success = false;
      results.errors.push(`Pipeline critical error: ${pipelineError.message}`);
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: results.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('[Comprehensive Trading Pipeline] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        pipeline_mode: 'failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});