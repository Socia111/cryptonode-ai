import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting automated signals generation...');

    const results = [];

    // 1. Generate live signals
    try {
      const liveSignalsResponse = await fetch(`${supabaseUrl}/functions/v1/live-signals-generator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      const liveSignalsData = await liveSignalsResponse.json();
      results.push({
        function: 'live-signals-generator',
        success: liveSignalsData.success,
        signals_created: liveSignalsData.signals_created || 0
      });
    } catch (error) {
      results.push({
        function: 'live-signals-generator',
        success: false,
        error: error.message
      });
    }

    // 2. Start live price feed
    try {
      const priceFeedResponse = await fetch(`${supabaseUrl}/functions/v1/live-price-feed?action=start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      const priceFeedData = await priceFeedResponse.json();
      results.push({
        function: 'live-price-feed',
        success: priceFeedData.success
      });
    } catch (error) {
      results.push({
        function: 'live-price-feed',
        success: false,
        error: error.message
      });
    }

    // 3. Generate enhanced signals
    try {
      const enhancedResponse = await fetch(`${supabaseUrl}/functions/v1/enhanced-signal-generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: 'bybit',
          symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT'],
          timeframes: ['1h'] // Only 1h signals allowed
        })
      });
      
      const enhancedData = await enhancedResponse.json();
      results.push({
        function: 'enhanced-signal-generation',
        success: enhancedData.success,
        signals_found: enhancedData.signals_found || 0
      });
    } catch (error) {
      results.push({
        function: 'enhanced-signal-generation',
        success: false,
        error: error.message
      });
    }

    // 4. Run live scanner
    try {
      const scannerResponse = await fetch(`${supabaseUrl}/functions/v1/live-scanner-production`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: 'bybit',
          timeframe: '1h', // Only 1h signals
          symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
        })
      });
      
      const scannerData = await scannerResponse.json();
      results.push({
        function: 'live-scanner-production',
        success: scannerData.success,
        signals_found: scannerData.signals_found || 0
      });
    } catch (error) {
      results.push({
        function: 'live-scanner-production',
        success: false,
        error: error.message
      });
    }

    // Calculate summary
    const totalSignals = results.reduce((sum, result) => 
      sum + (result.signals_created || result.signals_found || 0), 0
    );
    
    const successfulFunctions = results.filter(r => r.success).length;

    console.log(`✅ Automated signals generation complete: ${totalSignals} signals from ${successfulFunctions}/${results.length} functions`);

    return new Response(JSON.stringify({
      success: true,
      total_signals_generated: totalSignals,
      functions_executed: results.length,
      successful_functions: successfulFunctions,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Automated signals scheduler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});