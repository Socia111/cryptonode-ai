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
    const { exchange = 'bybit', timeframe = '1h', relaxed_filters = false } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[Scanner Engine] Starting scan: ${exchange} ${timeframe}`);
    
    // Fetch real market data from Bybit
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT', 'DOGEUSDT'];
    const interval = timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '1h' ? '60' : '240';
    
    const signals = [];
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=100`
        );
        
        const data = await response.json();
        
        if (data.result && data.result.list && data.result.list.length > 0) {
          const candles = data.result.list.reverse();
          const latestCandle = candles[candles.length - 1];
          const price = parseFloat(latestCandle[4]); // close price
          
          // Calculate simple moving averages
          const closes = candles.map(c => parseFloat(c[4]));
          const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
          const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
          
          // Calculate RSI
          let gains = 0, losses = 0;
          for (let i = 1; i < 14 && i < closes.length; i++) {
            const change = closes[closes.length - i] - closes[closes.length - i - 1];
            if (change > 0) gains += change;
            else losses -= change;
          }
          const avgGain = gains / 14;
          const avgLoss = losses / 14;
          const rs = avgGain / (avgLoss || 1);
          const rsi = 100 - (100 / (1 + rs));
          
          // Calculate volume profile
          const volumes = candles.map(c => parseFloat(c[5]));
          const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
          const currentVolume = parseFloat(latestCandle[5]);
          const volumeRatio = currentVolume / avgVolume;
          
          // Generate signal logic
          const isOversold = rsi < 30;
          const isOverbought = rsi > 70;
          const bullishCross = price > sma20 && sma20 > sma50;
          const bearishCross = price < sma20 && sma20 < sma50;
          const highVolume = volumeRatio > 1.5;
          
          let score = 50;
          let direction = null;
          
          if (bullishCross && isOversold && highVolume) {
            direction = 'LONG';
            score = 85;
          } else if (bearishCross && isOverbought && highVolume) {
            direction = 'SHORT';
            score = 82;
          } else if (bullishCross) {
            direction = 'LONG';
            score = relaxed_filters ? 70 : 75;
          } else if (bearishCross) {
            direction = 'SHORT';
            score = relaxed_filters ? 68 : 73;
          }
          
          const minScore = relaxed_filters ? 65 : 75;
          
          if (direction && score >= minScore) {
            const signal = {
              symbol,
              direction,
              price,
              score,
              timeframe,
              exchange,
              confidence: score / 100,
              entry_price: price,
              stop_loss: direction === 'LONG' ? price * 0.98 : price * 1.02,
              take_profit: direction === 'LONG' ? price * 1.05 : price * 0.95,
              indicators: {
                rsi,
                sma20,
                sma50,
                volumeRatio
              },
              bar_time: new Date(parseInt(latestCandle[0])).toISOString(),
              metadata: {
                source: 'scanner-engine',
                version: 'v2.0'
              }
            };
            
            signals.push(signal);
            
            // Insert into database
            const { error: insertError } = await supabaseClient
              .from('signals')
              .insert(signal);
            
            if (insertError) {
              console.error(`Error inserting signal for ${symbol}:`, insertError);
            } else {
              console.log(`✅ Generated signal: ${symbol} ${direction} @ ${price} (score: ${score})`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error.message);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Scan completed for ${exchange} ${timeframe}`,
        signals_found: signals.length,
        data_source: 'bybit_real_ohlcv',
        signals: signals.slice(0, 5) // Return first 5 for response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Scanner Engine] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
