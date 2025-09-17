import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Scanner Engine started');
    
    const { exchange = 'bybit', timeframe = '1h', relaxed_filters = false } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the live-scanner function which does the actual work
    const { data: scanResults, error: scanError } = await supabase.functions.invoke('live-scanner', {
      body: { 
        exchange, 
        timeframe, 
        relaxed_filters 
      }
    });

    if (scanError) {
      throw new Error(`Live scanner failed: ${scanError.message}`);
    }

    // Get recent signals from database
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (signalsError) {
      console.warn('Could not fetch recent signals:', signalsError.message);
    }

    const response = {
      success: true,
      scan_completed: true,
      exchange,
      timeframe,
      relaxed_filters,
      scan_results: scanResults,
      recent_signals: recentSignals || [],
      signals_found: scanResults?.signals_found || 0,
      signals_processed: scanResults?.signals_processed || 0,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Scanner completed: ${response.signals_found} signals found, ${response.signals_processed} processed`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Scanner Engine Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});