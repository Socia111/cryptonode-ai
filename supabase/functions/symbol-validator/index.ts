import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache for Bybit instruments
let instrumentsCache: any = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchBybitInstruments() {
  const now = Date.now();
  if (instrumentsCache && now < cacheExpiry) {
    return instrumentsCache;
  }

  try {
    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
    const data = await response.json();
    
    if (data.retCode === 0) {
      instrumentsCache = data.result.list;
      cacheExpiry = now + CACHE_DURATION;
      
      // Store in database cache
      await supabase.from('instruments_cache').upsert({
        category: 'linear',
        payload: data.result.list,
        fetched_at: new Date().toISOString()
      });
      
      return instrumentsCache;
    }
  } catch (error) {
    console.error('Failed to fetch Bybit instruments:', error);
  }

  // Fallback to database cache
  const { data: cached } = await supabase
    .from('instruments_cache')
    .select('payload')
    .eq('category', 'linear')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  return cached?.payload || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Symbol is required',
        retCode: 10001
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check local markets table first
    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('enabled', true)
      .single();

    if (market) {
      return new Response(JSON.stringify({
        success: true,
        category: market.category,
        minQty: market.min_qty.toString(),
        qtyStep: market.qty_step.toString(),
        tickSize: market.tick_size.toString(),
        minNotional: market.min_notional_usd
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from Bybit if not in local markets
    const instruments = await fetchBybitInstruments();
    const instrument = instruments.find((inst: any) => inst.symbol === symbol.toUpperCase());

    if (!instrument) {
      // Find similar symbols for suggestions
      const suggestions = instruments
        .filter((inst: any) => inst.symbol.includes(symbol.toUpperCase().replace('USDT', '')))
        .slice(0, 5)
        .map((inst: any) => inst.symbol);

      return new Response(JSON.stringify({
        success: false,
        error: 'Symbol not supported',
        retCode: 10001,
        suggestions
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      category: 'linear',
      minQty: instrument.lotSizeFilter.minOrderQty,
      qtyStep: instrument.lotSizeFilter.qtyStep,
      tickSize: instrument.priceFilter.tickSize,
      minNotional: instrument.lotSizeFilter.minOrderAmt || '5'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in symbol-validator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      retCode: 10003
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});