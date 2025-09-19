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
    console.log('[Auto Refresh System] Starting automated data refresh cycle...');

    const startTime = Date.now();
    const results = {
      market_data_refresh: false,
      signal_generation: false,
      old_signals_cleaned: false,
      errors: []
    };

    // Step 1: Clean old signals (older than 6 hours)
    try {
      const { error: cleanError } = await supabase
        .from('signals')
        .update({ is_active: false })
        .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

      if (cleanError) {
        results.errors.push(`Clean signals error: ${cleanError.message}`);
      } else {
        results.old_signals_cleaned = true;
        console.log('[Auto Refresh] ✅ Cleaned old signals');
      }
    } catch (error) {
      results.errors.push(`Clean signals exception: ${error.message}`);
    }

    // Step 2: Trigger live Bybit data feed
    try {
      const dataResponse = await supabase.functions.invoke('live-bybit-data-feed', {
        body: { 
          auto_refresh: true,
          timestamp: new Date().toISOString()
        }
      });

      if (dataResponse.error) {
        results.errors.push(`Data feed error: ${dataResponse.error.message}`);
      } else if (dataResponse.data?.success) {
        results.market_data_refresh = true;
        console.log(`[Auto Refresh] ✅ Market data updated: ${dataResponse.data.data_points} points`);
      }
    } catch (error) {
      results.errors.push(`Data feed exception: ${error.message}`);
    }

    // Step 3: Wait 2 seconds for data to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Trigger comprehensive signal generation
    try {
      const signalResponse = await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: { 
          force_refresh: true,
          data_source: 'auto_refresh',
          timestamp: new Date().toISOString()
        }
      });

      if (signalResponse.error) {
        results.errors.push(`Signal generation error: ${signalResponse.error.message}`);
      } else {
        results.signal_generation = true;
        console.log('[Auto Refresh] ✅ Signal generation completed');
      }
    } catch (error) {
      results.errors.push(`Signal generation exception: ${error.message}`);
    }

    // Step 5: Update system status
    const currentTime = new Date().toISOString();
    try {
      await supabase
        .from('exchange_feed_status')
        .upsert([
          {
            exchange: 'bybit',
            status: results.market_data_refresh ? 'active' : 'error',
            last_update: currentTime,
            symbols_tracked: 18,
            error_count: results.errors.length
          }
        ], { onConflict: 'exchange' });
    } catch (error) {
      console.warn('[Auto Refresh] Failed to update feed status:', error);
    }

    const executionTime = Date.now() - startTime;
    const summary = {
      success: results.market_data_refresh && results.signal_generation,
      execution_time_ms: executionTime,
      timestamp: currentTime,
      results,
      next_refresh: new Date(Date.now() + 2 * 60 * 1000).toISOString() // Next refresh in 2 minutes
    };

    console.log(`[Auto Refresh] Cycle completed in ${executionTime}ms:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Auto Refresh System] Critical error:', error);
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