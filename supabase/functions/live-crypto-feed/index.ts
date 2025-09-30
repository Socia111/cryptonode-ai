import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbols = SYMBOLS } = await req.json().catch(() => ({}));

    console.log(`[Live Crypto Feed] Fetching data for ${symbols.length} symbols`);

    const marketData = [];

    for (const symbol of symbols) {
      try {
        // Fetch ticker data
        const tickerUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
        const tickerResp = await fetch(tickerUrl);
        const tickerData = await tickerResp.json();

        if (tickerData.retCode !== 0) continue;

        const ticker = tickerData.result.list[0];

        const data = {
          symbol,
          exchange: 'bybit',
          base_asset: symbol.replace('USDT', ''),
          quote_asset: 'USDT',
          price: parseFloat(ticker.lastPrice),
          bid: parseFloat(ticker.bid1Price),
          ask: parseFloat(ticker.ask1Price),
          volume: parseFloat(ticker.volume24h),
          volume_quote: parseFloat(ticker.turnover24h),
          high_24h: parseFloat(ticker.highPrice24h),
          low_24h: parseFloat(ticker.lowPrice24h),
          change_24h: parseFloat(ticker.price24hPcnt) * 100,
          change_24h_percent: parseFloat(ticker.price24hPcnt) * 100,
          raw_data: ticker,
        };

        marketData.push(data);

        console.log(`[Live Crypto Feed] ${symbol}: $${data.price} (${data.change_24h.toFixed(2)}%)`);

      } catch (error) {
        console.error(`[Live Crypto Feed] Error fetching ${symbol}:`, error.message);
      }
    }

    // Update live_market_data table
    if (marketData.length > 0) {
      for (const data of marketData) {
        const { error } = await supabase
          .from('live_market_data')
          .upsert(data, {
            onConflict: 'symbol,exchange',
          });

        if (error) {
          console.error(`[Live Crypto Feed] Failed to upsert ${data.symbol}:`, error);
        }
      }

      console.log(`[Live Crypto Feed] ✅ Updated ${marketData.length} symbols`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbols_updated: marketData.length,
        data: marketData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Live Crypto Feed] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
