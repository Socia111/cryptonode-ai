import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client first
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const body = await req.json().catch(() => ({}));
    
    // Default symbols to scan if none provided
    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'];
    const { 
      exchange = 'bybit', 
      timeframe = '15m', 
      symbols = defaultSymbols, 
      relaxed_filters = true 
    } = body;

    // Ensure we have symbols to scan
    const symbolsToScan = Array.isArray(symbols) && symbols.length > 0 ? symbols : defaultSymbols;

    console.log(`🔍 Starting live scanner with params: ${JSON.stringify({exchange, timeframe, symbols: symbolsToScan, relaxed_filters})}`);
    console.log(`📊 Scanning ${symbolsToScan.length} symbols on ${timeframe} timeframe`);

    // For now, return existing signals that match criteria
    let query = supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .eq('exchange', exchange)
      .gte('score', relaxed_filters ? 70 : 80)
      .order('created_at', { ascending: false })
      .limit(50);

    if (timeframe) {
      query = query.eq('timeframe', timeframe);
    }

    if (symbolsToScan.length > 0) {
      query = query.in('symbol', symbolsToScan);
    }

    const { data: signals, error } = await query;

    if (error) {
      throw error;
    }

    const signalsFound = signals?.length || 0;
    console.log(`✅ Found ${signalsFound} signals meeting criteria`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        signals_found: signalsFound,
        signals: signals || [],
        scan_config: {
          exchange,
          timeframe,
          symbols: symbolsToScan,
          relaxed_filters
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Live Scanner Production] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})