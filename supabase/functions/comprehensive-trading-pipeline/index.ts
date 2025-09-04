import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Signal {
  id: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  score: number;
  timeframe: string;
  tp?: number;
  sl?: number;
  created_at: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting comprehensive trading pipeline...');

    // Step 1: Clear old data (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { error: clearError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', fiveMinutesAgo);

    if (clearError) {
      console.warn('Error clearing old signals:', clearError);
    } else {
      console.log('✅ Cleared old signals');
    }

    // Step 2: Trigger live data feeds
    console.log('📊 Triggering live data feeds...');
    
    const feedPromises = [
      // Live scanner for multiple timeframes
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '5m',
          relaxed_filters: true,
          symbols: []
        }
      }),
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '15m',
          relaxed_filters: true,
          symbols: []
        }
      }),
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '1h',
          relaxed_filters: false,
          symbols: []
        }
      }),
      // Enhanced signal generation
      supabase.functions.invoke('enhanced-signal-generation', {
        body: {
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
          timeframes: ['5m', '15m', '1h'],
          algorithms: ['AITRADEX1']
        }
      })
    ];

    const feedResults = await Promise.allSettled(feedPromises);
    let totalSignalsGenerated = 0;

    feedResults.forEach((result, index) => {
      const timeframes = ['5m', '15m', '1h', 'enhanced'];
      if (result.status === 'fulfilled' && result.value.data) {
        const signalsFound = result.value.data.signals_found || 0;
        totalSignalsGenerated += signalsFound;
        console.log(`✅ ${timeframes[index]} scan: ${signalsFound} signals`);
      } else {
        console.warn(`⚠️ ${timeframes[index]} scan failed:`, result.status === 'rejected' ? result.reason : result.value.error);
      }
    });

    // Wait a moment for signals to be saved
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Filter high-confidence signals (80%+)
    console.log('🔍 Filtering high-confidence signals...');
    
    const { data: highConfidenceSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('score', 80) // 80%+ confidence
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('score', { ascending: false })
      .limit(20);

    if (signalsError) {
      throw new Error(`Error fetching signals: ${signalsError.message}`);
    }

    console.log(`📈 Found ${highConfidenceSignals?.length || 0} high-confidence signals`);

    // Step 4: Execute trades for filtered signals
    let executedTrades = 0;
    let tradeErrors = 0;

    if (highConfidenceSignals && highConfidenceSignals.length > 0) {
      console.log('🤖 Executing automated trades...');

      // Check trading config
      const { data: tradingConfig } = await supabase
        .from('trading_configs')
        .select('*')
        .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
        .single();

      if (tradingConfig?.enabled) {
        // Process each high-confidence signal
        for (const signal of highConfidenceSignals.slice(0, 5)) { // Limit to 5 trades per cycle
          try {
            console.log(`💼 Processing signal: ${signal.symbol} ${signal.direction} (${signal.score}%)`);

            const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('automated-trading-engine', {
              body: {
                action: 'execute_signal',
                signal: {
                  symbol: signal.symbol,
                  direction: signal.direction,
                  entry_price: signal.price,
                  tp_price: signal.tp,
                  sl_price: signal.sl,
                  confidence_score: signal.score,
                  timeframe: signal.timeframe
                },
                config: tradingConfig
              }
            });

            if (tradeError) {
              console.error(`❌ Trade execution failed for ${signal.symbol}:`, tradeError);
              tradeErrors++;
            } else {
              console.log(`✅ Trade executed for ${signal.symbol}`);
              executedTrades++;
            }

          } catch (error) {
            console.error(`💥 Exception executing trade for ${signal.symbol}:`, error);
            tradeErrors++;
          }
        }
      } else {
        console.log('⚠️ Automated trading is disabled');
      }
    }

    // Step 5: Log pipeline results
    const { error: logError } = await supabase.from('pipeline_logs').insert({
      pipeline_run_at: new Date().toISOString(),
      signals_generated: totalSignalsGenerated,
      high_confidence_signals: highConfidenceSignals?.length || 0,
      trades_executed: executedTrades,
      trade_errors: tradeErrors,
      timeframes_scanned: ['5m', '15m', '1h'],
      min_confidence_threshold: 80
    });

    if (logError) {
      console.warn('Error logging pipeline results:', logError);
    }

    const response = {
      success: true,
      message: 'Comprehensive trading pipeline completed',
      results: {
        signals_generated: totalSignalsGenerated,
        high_confidence_signals: highConfidenceSignals?.length || 0,
        trades_executed: executedTrades,
        trade_errors: tradeErrors,
        pipeline_duration_seconds: Math.round((Date.now() - Date.now()) / 1000),
        next_run_in_seconds: 60
      }
    };

    console.log('✨ Pipeline completed:', response.results);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Pipeline failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});