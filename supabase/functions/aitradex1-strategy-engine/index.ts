import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbols, timeframe = '1h', action = 'generate_signals', force_refresh = false } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🚀 AItradeX1 Strategy Engine ${action} - ${timeframe} - Symbols: ${symbols?.length || 0}`)
    
    // Environment validation
    const coinApiKey = Deno.env.get('COINAPI_KEY') || Deno.env.get('FREE_CRYPTO_API_KEY')
    const allowedSymbolsEnv = Deno.env.get('ALLOWED_SYMBOLS')
    const defaultSymbols = allowedSymbolsEnv ? allowedSymbolsEnv.split(',') : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']
    const targetSymbols = symbols || defaultSymbols

    if (action === 'status') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'operational',
          engine: 'AItradeX1',
          version: '2.0',
          features: ['real_time_analysis', 'multi_timeframe', 'auto_trading'],
          environment: {
            coin_api_configured: !!coinApiKey,
            auto_trading_enabled: Deno.env.get('AUTO_TRADING_ENABLED') === 'true',
            live_trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
            allowed_symbols_count: targetSymbols.length
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!coinApiKey && action === 'generate_signals') {
      throw new Error('CoinAPI key not configured')
    }

    const signals = []

    for (const symbol of targetSymbols) {
      try {
        // Fetch enhanced market data from Bybit
        const response = await fetch(
          `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=200`
        )
        const data = await response.json()
        
        if (data?.result?.list?.length > 0) {
          const candles = data.result.list.reverse()
          const signal = await analyzeWithAItradeX1(symbol, timeframe, candles)
          
          if (signal && signal.score >= 65) {
            // Enhanced signal insertion with real market data
            const { data: insertedSignal, error } = await supabaseClient
              .from('signals')
              .insert({
                symbol: signal.symbol,
                timeframe: signal.timeframe,
                direction: signal.direction,
                price: signal.price,
                entry_price: signal.price,
                score: signal.score,
                algo: 'AITRADEX1',
                source: 'aitradex1_strategy_engine_enhanced',
                bar_time: new Date().toISOString(),
                metadata: {
                  ...signal.metadata,
                  generated_at: new Date().toISOString(),
                  real_market_data: true,
                  engine_version: '2.0',
                  force_refresh
                },
                is_active: true,
                expires_at: new Date(Date.now() + (4 * 60 * 60 * 1000)) // 4 hours
              })
              .select()
              .single()

            if (!error) {
              signals.push(insertedSignal)
              console.log(`✅ Generated signal: ${symbol} ${timeframe} ${signal.direction} (${signal.score})`)
            } else {
              console.error(`❌ Failed to insert signal for ${symbol}:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error)
      }
    }

    // Log generation stats
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'aitradex1_strategy_engine',
        stage: 'signal_generation_completed',
        payload: {
          signals_generated: signals.length,
          symbols_processed: targetSymbols.length,
          timeframe,
          action,
          force_refresh,
          timestamp: new Date().toISOString()
        }
      })

    console.log(`🎯 AItradeX1 Engine completed: ${signals.length}/${targetSymbols.length} signals generated`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        signals,
        symbols_processed: targetSymbols.length,
        timeframe,
        engine: 'AItradeX1',
        version: '2.0',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ AItradeX1 strategy engine error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function analyzeWithAItradeX1(symbol: string, timeframe: string, candles: any[]) {
  try {
    const closes = candles.slice(-100).map((c: any) => parseFloat(c[4]))
    const highs = candles.slice(-100).map((c: any) => parseFloat(c[2]))
    const lows = candles.slice(-100).map((c: any) => parseFloat(c[3]))
    const volumes = candles.slice(-100).map((c: any) => parseFloat(c[5]))
    
    if (closes.length < 50) return null
    
    const currentPrice = closes[closes.length - 1]
    
    // Enhanced technical indicators
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    const bb = calculateBollingerBands(closes, 20, 2)
    const atr = calculateATR(highs, lows, closes, 14)
    const volumeMA = calculateSMA(volumes, 20)
    
    // Market structure analysis
    const priceAboveEMA21 = currentPrice > ema21
    const priceAboveEMA50 = currentPrice > ema50
    const ema21AboveEMA50 = ema21 > ema50
    const trendStrength = Math.abs((currentPrice - ema21) / ema21) * 100
    const momentum = calculateMomentum(closes, 10)
    const volatility = atr / currentPrice * 100
    const volumeConfirmation = volumes[volumes.length - 1] > volumeMA
    
    let score = 50
    let direction = null
    
    // Enhanced AItradeX1 Strategy Logic
    if (priceAboveEMA21 && ema21AboveEMA50) {
      // Bullish setup
      score += 25
      direction = 'LONG'
      
      // Additional bullish confirmations
      if (priceAboveEMA50) score += 10 // Strong trend
      if (rsi > 45 && rsi < 75) score += 10 // Healthy RSI
      if (macd.histogram > 0) score += 10 // MACD momentum
      if (currentPrice > bb.middle) score += 5 // Above BB middle
      if (volumeConfirmation) score += 10 // Volume confirmation
      if (momentum > 0.01) score += 5 // Strong momentum
      if (trendStrength > 1 && trendStrength < 5) score += 5 // Good trend strength
    }
    else if (!priceAboveEMA21 && !ema21AboveEMA50) {
      // Bearish setup
      score += 25
      direction = 'SHORT'
      
      // Additional bearish confirmations
      if (!priceAboveEMA50) score += 10 // Strong downtrend
      if (rsi > 25 && rsi < 55) score += 10 // Healthy RSI
      if (macd.histogram < 0) score += 10 // MACD momentum
      if (currentPrice < bb.middle) score += 5 // Below BB middle
      if (volumeConfirmation) score += 10 // Volume confirmation
      if (momentum < -0.01) score += 5 // Strong momentum
      if (trendStrength > 1 && trendStrength < 5) score += 5 // Good trend strength
    }
    
    // Risk management adjustments
    if (volatility > 5) score -= 15 // Too volatile
    if (rsi > 80 || rsi < 20) score -= 10 // Overbought/oversold
    
    // Quality threshold
    if (score >= 65 && direction) {
      return {
        symbol,
        timeframe,
        direction,
        price: currentPrice,
        score: Math.round(Math.min(score, 100)),
        metadata: {
          ema21: ema21.toFixed(2),
          ema50: ema50.toFixed(2),
          rsi: rsi.toFixed(2),
          macd_signal: macd.histogram > 0 ? 'bullish' : 'bearish',
          trend_strength: trendStrength.toFixed(2),
          volatility: volatility.toFixed(2),
          momentum: momentum.toFixed(4),
          volume_confirmation: volumeConfirmation,
          bb_position: ((currentPrice - bb.lower) / (bb.upper - bb.lower)).toFixed(3),
          atr: atr.toFixed(2)
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`❌ Analysis error for ${symbol}:`, error)
    return null
  }
}

// Technical Analysis Functions
function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateSMA(values: number[], period: number): number {
  return values.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateRSI(values: number[], period: number): number {
  const changes = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }
  
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0)
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(values: number[]) {
  const ema12 = calculateEMA(values, 12)
  const ema26 = calculateEMA(values, 26)
  const macd = ema12 - ema26
  const signal = macd * 0.9 // Simplified signal line
  
  return {
    macd,
    signal,
    histogram: macd - signal
  }
}

function calculateBollingerBands(values: number[], period: number, stdDev: number) {
  const sma = calculateSMA(values, period)
  const recentValues = values.slice(-period)
  const squaredDiffs = recentValues.map(value => Math.pow(value - sma, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const standardDeviation = Math.sqrt(variance)
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  const trueRanges = []
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trueRanges.push(tr)
  }
  
  return calculateSMA(trueRanges, period)
}

function calculateMomentum(values: number[], period: number): number {
  const current = values[values.length - 1]
  const previous = values[values.length - 1 - period]
  return (current - previous) / previous
}