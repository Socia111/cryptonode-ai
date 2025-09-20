import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 1d Strategic Signal Engine started');

    // Major crypto pairs for long-term strategic analysis
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT'];
    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch daily OHLCV data
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=D&limit=365`;
        const response = await fetch(klineUrl);
        const data = await response.json();

        if (!data.result?.list?.length) continue;

        const klines = data.result.list.reverse();
        const latest = klines[klines.length - 1];
        
        // Strategic long-term analysis
        const closes = klines.slice(-200).map((k: any) => parseFloat(k[4]));
        const sma50 = calculateSMA(closes, 50);
        const sma200 = calculateSMA(closes, 200);
        const rsi = calculateRSI(closes, 14);
        const currentPrice = parseFloat(latest[4]);

        // Long-term strategic criteria
        const goldenCross = sma50 > sma200;
        const priceAboveSMA200 = currentPrice > sma200;
        const healthyRSI = rsi > 40 && rsi < 70;

        if (goldenCross && priceAboveSMA200 && healthyRSI) {
          const score = 75 + (rsi > 50 ? 10 : 0) + (currentPrice > sma50 ? 10 : 0);
          
          signals.push({
            id: crypto.randomUUID(),
            symbol,
            timeframe: '1d',
            direction: 'LONG',
            side: 'long',
            price: currentPrice,
            entry_price: currentPrice,
            score,
            confidence: 0.8,
            source: 'signal_engine_1d',
            algo: 'strategic_trend',
            bar_time: new Date(parseInt(latest[0])),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            is_active: true,
            take_profit: currentPrice * 1.08, // 8% target
            stop_loss: currentPrice * 0.95, // 5% stop
            metadata: {
              signal_type: 'strategic_investment',
              timeframe_optimized: '1d',
              golden_cross: goldenCross,
              long_term_trend: true
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    if (signals.length > 0) {
      await supabase.from('signals').insert(signals);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe: '1d',
        signals_generated: signals.length,
        engine_type: 'strategic_trend'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 1d Signal Engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message, timeframe: '1d' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  const changes = data.slice(1).map((price, i) => price - data[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = calculateSMA(gains.slice(-period), period);
  const avgLoss = calculateSMA(losses.slice(-period), period);
  
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}