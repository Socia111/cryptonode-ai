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
    console.log('[Signals Live Feed] Starting live signal feed processing...');

    // Get recent signals from enhanced scanner
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (signalsError) {
      console.error('[Signals Live Feed] Error fetching signals:', signalsError);
      throw signalsError;
    }

    // Filter for high-quality signals
    const qualitySignals = recentSignals?.filter(signal => 
      signal.score >= 70 && 
      signal.source?.includes('aitradex1') &&
      signal.symbol?.includes('USDT')
    ) || [];

    console.log(`[Signals Live Feed] Found ${qualitySignals.length} high-quality signals`);

    // Update signal priorities based on real-time market conditions
    if (qualitySignals.length > 0) {
      const priorityUpdates = qualitySignals.map(signal => ({
        id: signal.id,
        metadata: {
          ...signal.metadata,
          priority_score: signal.score,
          live_feed_processed: true,
          processed_at: new Date().toISOString()
        }
      }));

      for (const update of priorityUpdates) {
        await supabase
          .from('signals')
          .update({ metadata: update.metadata })
          .eq('id', update.id);
      }
    }

    // Trigger real-time updates
    const response = {
      success: true,
      signals_processed: qualitySignals.length,
      high_priority_count: qualitySignals.filter(s => s.score >= 85).length,
      timestamp: new Date().toISOString()
    };

    console.log('[Signals Live Feed] ✅ Processing completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Signals Live Feed] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});