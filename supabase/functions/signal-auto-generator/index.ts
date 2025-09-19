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
    console.log('🔄 Auto Signal Generator Starting...');

    // Get whitelist settings
    const { data: whitelist } = await supabase
      .from('whitelist_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const symbols = whitelist?.whitelist_enabled && whitelist.whitelist_pairs?.length > 0
      ? whitelist.whitelist_pairs
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'BNBUSDT'];

    console.log(`📊 Processing ${symbols.length} symbols:`, symbols);

    // Update live market data first
    console.log('📡 Updating live market data...');
    const marketDataUpdate = await supabase.functions.invoke('live-bybit-data-feed', {
      body: { symbols: symbols.slice(0, 10) } // Limit to prevent timeout
    });

    console.log('💾 Market data update result:', marketDataUpdate.data);

    // Generate signals from fresh market data
    console.log('🎯 Generating signals...');
    const signalResults = [];

    for (const symbol of symbols.slice(0, 8)) { // Process top 8 symbols
      try {
        const signalGen = await supabase.functions.invoke('aitradex1-signal-generator', {
          body: {
            symbol,
            mode: 'production',
            force_generate: true,
            min_score: 70
          }
        });

        console.log(`✅ Signal generated for ${symbol}:`, signalGen.data);
        signalResults.push({ symbol, success: true, data: signalGen.data });
        
      } catch (error) {
        console.error(`❌ Signal generation failed for ${symbol}:`, error);
        signalResults.push({ symbol, success: false, error: error.message });
      }
    }

    // Count recent signals
    const { data: recentSignals, error: countError } = await supabase
      .from('signals')
      .select('id, symbol, score, created_at')
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (!countError) {
      console.log(`📈 Generated ${recentSignals?.length || 0} recent signals`);
    }

    // Update system status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'signal_auto_generator',
        status: 'active',
        metadata: {
          last_run: new Date().toISOString(),
          symbols_processed: symbols.length,
          signals_generated: recentSignals?.length || 0,
          success_rate: signalResults.filter(r => r.success).length / signalResults.length
        },
        success_count: signalResults.filter(r => r.success).length,
        last_update: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      success: true,
      symbols_processed: symbols.length,
      signals_generated: recentSignals?.length || 0,
      signal_results: signalResults,
      recent_signals: recentSignals?.slice(0, 5) || [], // Top 5 recent signals
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Auto signal generator error:', error);
    
    // Update system status with error
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'signal_auto_generator',
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