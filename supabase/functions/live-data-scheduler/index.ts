import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[live-data-scheduler] Starting comprehensive data collection cycle...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Phase 1: Collect live market data from multiple exchanges
    console.log('[live-data-scheduler] Phase 1: Collecting live market data...');
    
    const dataCollectionResult = await supabase.functions.invoke('ccxt-live-feed', {
      body: {
        exchanges: ['bybit', 'binance'],
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT', 'BCHUSDT'],
        timeframes: ['5m', '15m', '1h'],
        update_indicators: true
      }
    });

    if (dataCollectionResult.error) {
      console.error('[live-data-scheduler] Data collection failed:', dataCollectionResult.error);
    } else {
      console.log('[live-data-scheduler] ✅ Market data collected successfully');
    }

    // Phase 2: Generate fresh trading signals using AITRADEX1
    console.log('[live-data-scheduler] Phase 2: Generating trading signals...');
    
    const signalGenerationResult = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: {
        exchange: 'bybit',
        timeframes: ['5m', '15m', '1h'],
        scan_all_coins: true,
        relaxed_filters: false,
        min_volume_usdt: 1000000
      }
    });

    if (signalGenerationResult.error) {
      console.error('[live-data-scheduler] Signal generation failed:', signalGenerationResult.error);
    } else {
      console.log('[live-data-scheduler] ✅ Signals generated successfully');
    }

    // Phase 3: Auto-trading execution (if enabled)
    const autoTradingEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true';
    let tradingResult = { message: 'Auto-trading disabled' };
    
    if (autoTradingEnabled) {
      console.log('[live-data-scheduler] Phase 3: Executing auto-trading...');
      
      const tradingResponse = await supabase.functions.invoke('auto-trading-poller', {
        body: { trigger: 'scheduler' }
      });

      if (tradingResponse.error) {
        console.error('[live-data-scheduler] Auto-trading failed:', tradingResponse.error);
      } else {
        tradingResult = tradingResponse.data;
        console.log('[live-data-scheduler] ✅ Auto-trading completed');
      }
    }

    // Phase 4: Update system status
    console.log('[live-data-scheduler] Phase 4: Updating system status...');
    
    await supabase.from('exchange_feed_status').upsert({
      exchange: 'scheduler',
      status: 'active',
      last_update: new Date().toISOString(),
      symbols_tracked: 10,
      error_count: 0
    });

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data_collection: dataCollectionResult.data || 'completed',
      signal_generation: signalGenerationResult.data || 'completed',
      auto_trading: tradingResult,
      next_run: new Date(Date.now() + 30000).toISOString() // Next run in 30 seconds
    };

    console.log('[live-data-scheduler] ✅ Complete cycle finished successfully');
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[live-data-scheduler] ❌ Cycle failed:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});