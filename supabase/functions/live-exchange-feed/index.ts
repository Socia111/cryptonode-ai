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
    console.log('[Live Exchange Feed] Starting live market data fetch...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const trigger = body.trigger || 'manual';
    const forceRefresh = body.force_refresh || false;

    // Trigger enhanced CCXT feed to get fresh market data
    const ccxtResponse = await supabase.functions.invoke('enhanced-ccxt-feed', {
      body: { 
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'],
        exchanges: ['bybit'],
        trigger: trigger,
        force_refresh: forceRefresh
      }
    });

    let marketDataPoints = 0;
    let errors = [];

    if (ccxtResponse.error) {
      console.error('[Live Exchange Feed] CCXT feed error:', ccxtResponse.error);
      errors.push(`CCXT feed failed: ${ccxtResponse.error.message}`);
    } else {
      marketDataPoints = ccxtResponse.data?.market_data_points || 0;
      console.log(`[Live Exchange Feed] ✅ Fetched ${marketDataPoints} market data points`);
    }

    // Update exchange feed status
    const { error: statusError } = await supabase
      .from('exchange_feed_status')
      .upsert({
        exchange: 'live_exchange_feed',
        status: errors.length === 0 ? 'active' : 'error',
        last_update: new Date().toISOString(),
        symbols_tracked: 8,
        error_count: errors.length,
        last_error: errors.length > 0 ? errors[errors.length - 1] : null
      }, {
        onConflict: 'exchange'
      });

    if (statusError) {
      console.error('[Live Exchange Feed] Status update error:', statusError);
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      marketDataPoints: marketDataPoints,
      trigger: trigger,
      force_refresh: forceRefresh,
      errors: errors,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Live Exchange Feed] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});