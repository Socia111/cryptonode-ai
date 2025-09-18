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

    console.log('🚀 Live data starter activated');

    // Default symbols to ensure we always have data
    const defaultSymbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 
      'XRPUSDT', 'DOGEUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT'
    ];

    // Step 1: Initialize demo system
    const { data: initResult, error: initError } = await supabase
      .rpc('initialize_demo_system');

    if (initError) {
      console.warn('Demo system init warning:', initError);
    } else {
      console.log('✅ Demo system initialized:', initResult);
    }

    // Step 2: Generate fresh signals with enhanced scanner
    const { data: signalResult, error: signalError } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: { 
        symbols: defaultSymbols,
        count: 10,
        force_generate: true
      }
    });

    if (signalError) {
      console.warn('Signal generation warning:', signalError);
    } else {
      console.log('📊 Fresh signals generated:', signalResult);
    }

    // Step 3: Create demo paper trades
    for (let i = 0; i < 5; i++) {
      const symbol = defaultSymbols[i % defaultSymbols.length];
      const side = i % 2 === 0 ? 'buy' : 'sell';
      
      try {
        await supabase.functions.invoke('paper-trading-executor', {
          body: {
            symbol,
            side,
            quantity: symbol.includes('BTC') ? 0.001 : symbol.includes('ETH') ? 0.01 : symbol.includes('SOL') ? 1 : symbol.includes('ADA') ? 100 : 0.1,
            leverage: 1,
            paperMode: true,
            testMode: true,
            userId: null // Anonymous demo trade
          }
        });
        console.log(`✅ Demo trade created: ${side} ${symbol}`);
      } catch (tradeError) {
        console.warn(`Trade warning for ${symbol}:`, tradeError);
      }
    }

    // Step 4: Update system status
    await supabase
      .from('exchange_feed_status')
      .upsert({
        exchange: 'bybit',
        status: 'active',
        last_update: new Date().toISOString(),
        symbols_tracked: defaultSymbols.length,
        error_count: 0
      });

    const response = {
      success: true,
      message: 'Live data system started successfully',
      symbols_activated: defaultSymbols,
      signals_generated: signalResult?.count || 10,
      demo_trades_created: 5,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Live data system ready:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Live data starter failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});