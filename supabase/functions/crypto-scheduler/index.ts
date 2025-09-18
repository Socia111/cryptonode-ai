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
    console.log('🕐 Crypto scheduler triggered - starting automated trading cycle');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Run CCXT live feed to collect market data and generate signals
    console.log('📡 Starting CCXT data collection...');
    const ccxtResponse = await supabase.functions.invoke('ccxt-live-feed', {
      body: { action: 'scan' }
    });

    if (ccxtResponse.error) {
      console.error('❌ CCXT feed failed:', ccxtResponse.error);
      throw new Error(`CCXT feed failed: ${ccxtResponse.error.message}`);
    }

    console.log('✅ CCXT data collection completed:', ccxtResponse.data);

    // Check if auto-trading is enabled and execute trades if so
    const autoTradingEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true';
    let tradingResult = null;

    if (autoTradingEnabled) {
      console.log('⚡ Auto-trading enabled, checking for execution opportunities...');
      
      const tradingResponse = await supabase.functions.invoke('auto-trading-poller', {
        body: {
          triggered_by: 'crypto-scheduler',
          timestamp: new Date().toISOString()
        }
      });

      if (tradingResponse.error) {
        console.error('⚠️ Auto-trading failed:', tradingResponse.error);
        // Don't throw error - data collection was successful
      } else {
        tradingResult = tradingResponse.data;
        console.log('✅ Auto-trading completed:', tradingResult);
      }
    } else {
      console.log('🔒 Auto-trading disabled, only collecting data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automated trading cycle completed successfully',
        data_collection: ccxtResponse.data,
        trading_execution: tradingResult,
        auto_trading_enabled: autoTradingEnabled,
        next_execution: 'In 30 seconds (automated)',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Crypto scheduler error:', error);
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