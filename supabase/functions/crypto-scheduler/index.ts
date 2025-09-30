import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    console.log('[Crypto Scheduler] Starting scheduled tasks...');

    const results = {
      scanner_5m: { success: false, error: null },
      scanner_15m: { success: false, error: null },
      scanner_1h: { success: false, error: null },
      auto_trading: { success: false, error: null },
    };

    // Run scanners in parallel
    const scannerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/live-scanner-production`;
    const authHeader = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

    const scannerPromises = ['5m', '15m', '1h'].map(async (timeframe) => {
      try {
        const response = await fetch(scannerUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeframe }),
        });

        const result = await response.json();
        results[`scanner_${timeframe}` as keyof typeof results] = { 
          success: result.success, 
          error: null 
        };
        console.log(`[Crypto Scheduler] ✅ Scanner ${timeframe} completed: ${result.signals_generated} signals`);
      } catch (error) {
        results[`scanner_${timeframe}` as keyof typeof results] = { 
          success: false, 
          error: error.message 
        };
        console.error(`[Crypto Scheduler] Scanner ${timeframe} failed:`, error.message);
      }
    });

    await Promise.all(scannerPromises);

    // Run auto-trading poller
    try {
      const pollerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-trading-poller`;
      const pollerResponse = await fetch(pollerUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const pollerResult = await pollerResponse.json();
      results.auto_trading = { success: pollerResult.success, error: null };
      console.log(`[Crypto Scheduler] ✅ Auto-trading completed: ${pollerResult.trades_executed || 0} trades`);
    } catch (error) {
      results.auto_trading = { success: false, error: error.message };
      console.error('[Crypto Scheduler] Auto-trading failed:', error.message);
    }

    // Log scheduler run
    await supabase.from('edge_event_log').insert({
      fn: 'crypto-scheduler',
      stage: 'completed',
      payload: results,
    });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Crypto Scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
