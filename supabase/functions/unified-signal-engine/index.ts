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
    console.log('🚀 Unified Signal Engine started')
    
    const { 
      timeframes = ['15m', '1h'], 
      symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], 
      algorithms = ['AITRADEX1'] 
    } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const generatedSignals = []

    for (const timeframe of timeframes) {
      for (const symbol of symbols) {
        for (const algorithm of algorithms) {
          try {
            const signal = await generateUnifiedSignal(symbol, timeframe, algorithm)
            
            if (signal) {
              // Insert into database
              const { data: insertedSignal, error } = await supabaseClient
                .from('signals')
                .insert({
                  symbol: signal.symbol,
                  timeframe: signal.timeframe,
                  direction: signal.direction,
                  price: signal.price,
                  entry_price: signal.price,
                  score: signal.score,
                  algo: algorithm,
                  source: 'unified_signal_engine',
                  metadata: {
                    ...signal.metadata,
                    engine: 'unified',
                    generated_at: new Date().toISOString()
                  }
                })
                .select()
                .single()

              if (!error) {
                generatedSignals.push(insertedSignal)
                console.log(`✅ Generated ${algorithm} signal for ${symbol} ${timeframe}:`, signal.direction)
              }
            }
          } catch (error) {
            console.error(`Error generating signal for ${symbol} ${timeframe} ${algorithm}:`, error)
          }
        }
      }
    }

    // Log execution
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'unified_signal_engine',
        stage: 'completed',
        payload: {
          signals_generated: generatedSignals.length,
          timeframes,
          symbols,
          algorithms,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: generatedSignals.length,
        signals: generatedSignals,
        summary: {
          timeframes,
          symbols,
          algorithms
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Unified Signal Engine error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function generateUnifiedSignal(symbol: string, timeframe: string, algorithm: string) {
  try {
    // Fetch market data
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=100`
    )
    const data = await response.json()
    
    if (!data?.result?.list?.length) return null
    
    const candles = data.result.list.reverse()
    
    if (algorithm === 'AITRADEX1') {
      return await analyzeAItradeX1(symbol, timeframe, candles)
    }
    
    return null
  } catch (error) {
    console.error('Signal generation error:', error)
    return null
  }
}

async function analyzeAItradeX1(symbol: string, timeframe: string, candles: any[]) {
  try {
    const closes = candles.slice(-50).map((c: any) => parseFloat(c[4]))
    const highs = candles.slice(-50).map((c: any) => parseFloat(c[2]))
    const lows = candles.slice(-50).map((c: any) => parseFloat(c[3]))
    
    if (closes.length < 21) return null
    
    const currentPrice = closes[closes.length - 1]
    
    // Technical indicators
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    const rsi = calculateRSI(closes, 14)
    const bb = calculateBollingerBands(closes, 20, 2)
    const macd = calculateMACD(closes, 12, 26, 9)
    
    // Market structure
    const trendStrength = Math.abs((currentPrice - ema21) / ema21) * 100
    const volatility = calculateVolatility(closes, 20)
    const momentum = calculateMomentum(closes, 10)
    
    let score = 50
    let direction = null
    let confidence = 'medium'
    
    // Bullish signals
    if (currentPrice > ema21 && ema21 > ema50) {
      score += 15 // Trend alignment
      
      if (rsi > 40 && rsi < 70) score += 10 // RSI in good range
      if (macd.macd > macd.signal) score += 10 // MACD bullish
      if (currentPrice > bb.lower && currentPrice < bb.upper) score += 5 // BB position
      if (momentum > 0) score += 10 // Positive momentum
      
      direction = 'LONG'
    }
    // Bearish signals
    else if (currentPrice < ema21 && ema21 < ema50) {
      score += 15 // Trend alignment
      
      if (rsi > 30 && rsi < 60) score += 10 // RSI in good range
      if (macd.macd < macd.signal) score += 10 // MACD bearish
      if (currentPrice > bb.lower && currentPrice < bb.upper) score += 5 // BB position
      if (momentum < 0) score += 10 // Negative momentum
      
      direction = 'SHORT'
    }
    
    // Adjust for volatility
    if (volatility > 2) score -= 5 // High volatility penalty
    if (volatility < 0.5) score -= 5 // Low volatility penalty
    
    // Set confidence
    if (score >= 80) confidence = 'high'
    else if (score >= 65) confidence = 'medium'
    else confidence = 'low'
    
    // Only return signals with decent score
    if (score >= 65 && direction) {
      return {
        symbol,
        timeframe,
        direction,
        price: currentPrice,
        score: Math.round(Math.min(score, 100)),
        metadata: {
          confidence,
          ema21: ema21.toFixed(2),
          ema50: ema50.toFixed(2),
          rsi: rsi.toFixed(2),
          macd: macd.macd.toFixed(4),
          trend_strength: trendStrength.toFixed(2),
          volatility: volatility.toFixed(3),
          momentum: momentum.toFixed(4),
          bollinger_position: ((currentPrice - bb.lower) / (bb.upper - bb.lower)).toFixed(3)
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('AItradeX1 analysis error:', error)
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

function calculateBollingerBands(values: number[], period: number, stdDev: number) {
  const sma = values.slice(-period).reduce((a, b) => a + b, 0) / period
  const squaredDiffs = values.slice(-period).map(value => Math.pow(value - sma, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const standardDeviation = Math.sqrt(variance)
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  }
}

function calculateMACD(values: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const emaFast = calculateEMA(values, fastPeriod)
  const emaSlow = calculateEMA(values, slowPeriod)
  const macd = emaFast - emaSlow
  
  // Simplified signal line (would need more historical data for proper calculation)
  const signal = macd * 0.9
  
  return {
    macd,
    signal,
    histogram: macd - signal
  }
}

function calculateVolatility(values: number[], period: number): number {
  const returns = []
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1])
  }
  
  const recentReturns = returns.slice(-period)
  const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length
  const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length
  
  return Math.sqrt(variance) * 100
}

function calculateMomentum(values: number[], period: number): number {
  const current = values[values.length - 1]
  const previous = values[values.length - 1 - period]
  return (current - previous) / previous
}