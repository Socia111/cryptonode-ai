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

    console.log('🚀 System initializer activated');

    // Call the database function to initialize demo system
    const { data: initResult, error: initError } = await supabase
      .rpc('initialize_demo_system');

    if (initError) {
      throw new Error(`Failed to initialize demo system: ${initError.message}`);
    }

    console.log('✅ Demo system initialized:', initResult);

    // Generate fresh signals
    const { data: signalResult, error: signalError } = await supabase.functions.invoke('demo-signal-generator', {
      body: { generate_fresh_signals: true }
    });

    if (signalError) {
      console.warn('⚠️ Signal generation warning:', signalError);
    } else {
      console.log('📊 Fresh signals generated:', signalResult);
    }

    // Create some demo paper trades
    const demoTrades = [
      { symbol: 'BTCUSDT', side: 'buy', amount: 100, leverage: 1, paperMode: true },
      { symbol: 'ETHUSDT', side: 'sell', amount: 200, leverage: 2, paperMode: true },
      { symbol: 'SOLUSDT', side: 'buy', amount: 150, leverage: 1, paperMode: true }
    ];

    for (const trade of demoTrades) {
      try {
        await supabase.functions.invoke('paper-trading-executor', {
          body: trade
        });
      } catch (tradeError) {
        console.warn('⚠️ Demo trade warning:', tradeError);
      }
    }

    const response = {
      success: true,
      message: 'System initialization completed successfully',
      initialization: initResult,
      signals: signalResult,
      demo_trades_created: demoTrades.length,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 System initialization completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ System initialization failed:', error);
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