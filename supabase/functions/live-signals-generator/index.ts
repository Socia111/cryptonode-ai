import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RSI Calculation
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Moving Average Calculation
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  return prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
}

// Enhanced Signal Scoring Algorithm
function calculateSignalScore(marketData: any): number {
  const { rsi, sma20, sma50, currentPrice, volume24h, avgVolume, change24h } = marketData;
  
  let score = 50; // Base score
  
  // RSI Analysis
  if (rsi < 30) score += 15; // Oversold
  else if (rsi > 70) score += 15; // Overbought
  else if (rsi >= 40 && rsi <= 60) score += 5; // Neutral zone
  
  // Moving Average Analysis
  if (currentPrice > sma20 && sma20 > sma50) score += 10; // Bullish trend
  else if (currentPrice < sma20 && sma20 < sma50) score += 10; // Bearish trend
  
  // Volume Analysis
  const volumeRatio = volume24h / avgVolume;
  if (volumeRatio > 1.5) score += 8; // High volume
  else if (volumeRatio > 1.2) score += 5; // Above average volume
  
  // Price Action
  if (Math.abs(change24h) > 3) score += 7; // Significant movement
  
  return Math.min(95, Math.max(30, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Live Signals Generator started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'DOTUSDT']
    const timeframes = ['15m', '1h', '4h']
    const generatedSignals = []

    for (const timeframe of timeframes) {
      for (const symbol of symbols) {
        try {
          // Fetch real market data from Bybit
          const [tickerResponse, klineResponse] = await Promise.all([
            fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`),
            fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=100`)
          ])

          if (!tickerResponse.ok || !klineResponse.ok) continue

          const [tickerData, klineData] = await Promise.all([
            tickerResponse.json(),
            klineResponse.json()
          ])

          if (!tickerData.result?.list?.[0] || !klineData.result?.list?.length) continue

          const ticker = tickerData.result.list[0]
          const klines = klineData.result.list.map((k: any) => ({
            timestamp: parseInt(k[0]),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          })).reverse()

          if (klines.length < 50) continue

          const currentPrice = parseFloat(ticker.lastPrice)
          const volume24h = parseFloat(ticker.volume24h)
          const change24h = parseFloat(ticker.price24hPcnt) * 100

          // Calculate technical indicators
          const closes = klines.map(k => k.close)
          const volumes = klines.map(k => k.volume)
          
          const rsi = calculateRSI(closes)
          const sma20 = calculateSMA(closes, 20)
          const sma50 = calculateSMA(closes, 50)
          const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length

          // Calculate signal score
          const score = calculateSignalScore({
            rsi, sma20, sma50, currentPrice, volume24h, avgVolume, change24h
          })

          // Generate signal if score is high enough
          if (score >= 65) {
            let direction = 'LONG'
            let confidence = 0.7

            // Determine direction based on technical analysis
            if (rsi < 30 && currentPrice < sma20) {
              direction = 'LONG'
              confidence = 0.8
            } else if (rsi > 70 && currentPrice > sma20) {
              direction = 'SHORT'
              confidence = 0.8
            } else if (currentPrice > sma20 && sma20 > sma50) {
              direction = 'LONG'
              confidence = 0.75
            } else if (currentPrice < sma20 && sma20 < sma50) {
              direction = 'SHORT'
              confidence = 0.75
            }

            // Calculate stop loss and take profit
            const atr = Math.abs(klines[klines.length - 1].high - klines[klines.length - 1].low)
            const stopLoss = direction === 'LONG' 
              ? currentPrice - (atr * 2)
              : currentPrice + (atr * 2)
            const takeProfit = direction === 'LONG'
              ? currentPrice + (atr * 3)
              : currentPrice - (atr * 3)

            const signal = {
              symbol,
              timeframe,
              direction,
              price: currentPrice,
              entry_price: currentPrice,
              stop_loss: Math.round(stopLoss * 100) / 100,
              take_profit: Math.round(takeProfit * 100) / 100,
              score: Math.round(score),
              confidence,
              source: 'live_signals_generator',
              algo: 'AItradeX1_Enhanced',
              atr: Math.round(atr * 100) / 100,
              bar_time: new Date().toISOString(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              is_active: true,
              metadata: {
                rsi: Math.round(rsi * 10) / 10,
                sma20: Math.round(sma20 * 100) / 100,
                sma50: Math.round(sma50 * 100) / 100,
                volume_ratio: Math.round((volume24h / avgVolume) * 100) / 100,
                grade: score >= 85 ? 'A' : score >= 75 ? 'B' : 'C',
                data_source: 'bybit_live',
                verified_real_data: true
              },
              indicators: {
                rsi,
                sma20,
                sma50,
                volume_ratio: volume24h / avgVolume
              }
            }

            generatedSignals.push(signal)
          }

        } catch (error) {
          console.error(`Error processing ${symbol} ${timeframe}:`, error)
        }
      }
    }

    // Insert signals into database
    if (generatedSignals.length > 0) {
      const { error } = await supabaseClient
        .from('signals')
        .insert(generatedSignals)
      
      if (error) {
        console.error('Error inserting signals:', error)
      } else {
        console.log(`✅ Successfully inserted ${generatedSignals.length} signals`)
      }
    }

    // Update system status
    await supabaseClient
      .from('system_status')
      .upsert({
        service_name: 'live_signals_generator',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: generatedSignals.length,
        metadata: {
          signals_generated: generatedSignals.length,
          symbols_processed: symbols.length,
          timeframes_processed: timeframes.length
        }
      }, { onConflict: 'service_name' })

    console.log(`🎯 Generated ${generatedSignals.length} high-quality signals`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: generatedSignals.length,
        signals: generatedSignals.slice(0, 10), // Return first 10 for response
        summary: {
          total_signals: generatedSignals.length,
          timeframes_scanned: timeframes.length,
          symbols_scanned: symbols.length,
          avg_score: generatedSignals.length > 0 
            ? Math.round(generatedSignals.reduce((sum, s) => sum + s.score, 0) / generatedSignals.length)
            : 0,
          signal_distribution: {
            long: generatedSignals.filter(s => s.direction === 'LONG').length,
            short: generatedSignals.filter(s => s.direction === 'SHORT').length,
            grade_A: generatedSignals.filter(s => s.metadata.grade === 'A').length,
            grade_B: generatedSignals.filter(s => s.metadata.grade === 'B').length,
            grade_C: generatedSignals.filter(s => s.metadata.grade === 'C').length
          }
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Live Signals Generator error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})