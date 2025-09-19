import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting automatic system refresh...');
    const startTime = Date.now();
    
    let results = {
      market_data_refresh: null,
      signal_generation: null,
      old_signals_cleanup: null,
      feed_status_update: null,
      total_time_ms: 0
    };

    // Step 1: Clean old signals (older than 24 hours)
    console.log('🗑️ Cleaning old signals...');
    try {
      const { data: deletedSignals, error: cleanupError } = await supabase
        .from('signals')
        .delete()
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (cleanupError) {
        console.error('❌ Cleanup error:', cleanupError);
        results.old_signals_cleanup = { error: cleanupError.message };
      } else {
        console.log('✅ Old signals cleaned');
        results.old_signals_cleanup = { success: true };
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      results.old_signals_cleanup = { error: error.message };
    }

    // Step 2: Refresh market data
    console.log('📊 Refreshing market data...');
    try {
      const { data: marketData, error: marketError } = await supabase.functions.invoke('live-bybit-data-feed', {
        body: { 
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'],
          force_refresh: true 
        }
      });
      
      if (marketError) {
        console.error('❌ Market data error:', marketError);
        results.market_data_refresh = { error: marketError.message };
      } else {
        console.log('✅ Market data refreshed');
        results.market_data_refresh = marketData;
      }
    } catch (error) {
      console.error('❌ Market data refresh failed:', error);
      results.market_data_refresh = { error: error.message };
    }

    // Wait 2 seconds for data to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Generate new signals
    console.log('🎯 Generating new signals...');
    try {
      const { data: signalData, error: signalError } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
        body: { 
          timeframe: '15m',
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'],
          min_score: 70
        }
      });
      
      if (signalError) {
        console.error('❌ Signal generation error:', signalError);
        results.signal_generation = { error: signalError.message };
      } else {
        console.log('✅ New signals generated');
        results.signal_generation = signalData;
      }
    } catch (error) {
      console.error('❌ Signal generation failed:', error);
      results.signal_generation = { error: error.message };
    }

    // Step 4: Update feed status
    console.log('📡 Updating feed status...');
    try {
      const { error: statusError } = await supabase
        .from('exchange_feed_status')
        .upsert({
          exchange: 'bybit',
          status: 'active',
          last_update: new Date().toISOString(),
          symbols_tracked: 6,
          error_count: 0
        });
      
      if (statusError) {
        console.error('❌ Status update error:', statusError);
        results.feed_status_update = { error: statusError.message };
      } else {
        console.log('✅ Feed status updated');
        results.feed_status_update = { success: true };
      }
    } catch (error) {
      console.error('❌ Status update failed:', error);
      results.feed_status_update = { error: error.message };
    }

    const totalTime = Date.now() - startTime;
    results.total_time_ms = totalTime;

    console.log(`🏁 Auto-refresh completed in ${totalTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Auto-refresh system executed successfully',
      execution_time_ms: totalTime,
      timestamp: new Date().toISOString(),
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Auto-refresh system failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});