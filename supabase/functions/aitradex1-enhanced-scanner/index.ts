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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { timeframe = '1h', enhanced_analysis = true, quality_threshold = 75 } = await req.json()
    
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ]

    let signalsGenerated = 0
    let symbolsAnalyzed = 0

    for (const symbol of symbols) {
      try {
        // Fetch comprehensive market data
        const [candleResponse, tickerResponse] = await Promise.all([
          fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=200`),
          fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`)
        ])

        const [candleData, tickerData] = await Promise.all([
          candleResponse.json(),
          tickerResponse.json()
        ])

        if (candleData?.result?.list?.length > 0 && tickerData?.result?.list?.[0]) {
          const candles = candleData.result.list.reverse()
          const ticker = tickerData.result.list[0]
          
          const signal = await enhancedAnalysis(symbol, timeframe, candles, ticker, quality_threshold, supabaseClient)
          
          if (signal) {
            signalsGenerated++
          }
          symbolsAnalyzed++
        }
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signalsGenerated,
        symbols_analyzed: symbolsAnalyzed,
        timeframe,
        quality_threshold,
        enhanced_analysis,
        algorithm: 'aitradex1_enhanced',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AItradeX1 enhanced scanner error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function enhancedAnalysis(symbol: string, timeframe: string, candles: any[], ticker: any, threshold: number, supabaseClient: any) {
  try {
    const closes = candles.slice(-100).map((c: any) => parseFloat(c[4]))
    const highs = candles.slice(-100).map((c: any) => parseFloat(c[2]))
    const lows = candles.slice(-100).map((c: any) => parseFloat(c[3]))
    const volumes = candles.slice(-100).map((c: any) => parseFloat(c[5]))
    
    if (closes.length < 50) return null
    
    const currentPrice = parseFloat(ticker.lastPrice)
    
    // Enhanced technical indicators
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    const sma200 = calculateSMA(closes, Math.min(200, closes.length))
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    const bbands = calculateBollingerBands(closes, 20, 2)
    const stochRSI = calculateStochRSI(closes, 14)
    
    // Volume analysis
    const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20
    const currentVolume = parseFloat(ticker.volume24h || 0)
    const volumeRatio = currentVolume / avgVolume
    
    // Multi-factor scoring
    let score = 40 // Base score
    let direction = null
    
    // Primary trend analysis
    if (ema21 > ema50 && ema50 > sma200 && currentPrice > ema21) {
      direction = 'LONG'
      score += 20
    } else if (ema21 < ema50 && ema50 < sma200 && currentPrice < ema21) {
      direction = 'SHORT'
      score += 20
    }
    
    // RSI momentum
    if (direction === 'LONG' && rsi > 35 && rsi < 65) score += 10
    if (direction === 'SHORT' && rsi > 35 && rsi < 65) score += 10
    
    // MACD confirmation
    if (direction === 'LONG' && macd.macd > macd.signal) score += 8
    if (direction === 'SHORT' && macd.macd < macd.signal) score += 8
    
    // Bollinger Bands position
    const bbPosition = (currentPrice - bbands.lower) / (bbands.upper - bbands.lower)
    if (direction === 'LONG' && bbPosition > 0.2 && bbPosition < 0.8) score += 7
    if (direction === 'SHORT' && bbPosition > 0.2 && bbPosition < 0.8) score += 7
    
    // Volume confirmation
    if (volumeRatio > 1.2) score += 10
    if (volumeRatio > 1.5) score += 5
    
    // StochRSI momentum
    if (direction === 'LONG' && stochRSI > 20 && stochRSI < 80) score += 5
    if (direction === 'SHORT' && stochRSI > 20 && stochRSI < 80) score += 5
    
    // Only create high-quality signals
    if (!direction || score < threshold) return null
    
    const signal = {
      symbol,
      timeframe,
      direction,
      price: currentPrice,
      entry_price: currentPrice,
      stop_loss: direction === 'LONG' ? currentPrice * 0.97 : currentPrice * 1.03,
      take_profit: direction === 'LONG' ? currentPrice * 1.06 : currentPrice * 0.94,
      score,
      source: 'aitradex1_enhanced_scanner',
      algo: 'aitradex1_enhanced',
      is_active: true,
      metadata: {
        ema21: ema21.toFixed(2),
        ema50: ema50.toFixed(2),
        sma200: sma200.toFixed(2),
        rsi: rsi.toFixed(2),
        macd_histogram: macd.histogram.toFixed(4),
        bb_position: bbPosition.toFixed(3),
        volume_ratio: volumeRatio.toFixed(2),
        stoch_rsi: stochRSI.toFixed(2),
        grade: score >= 85 ? 'A' : score >= 75 ? 'B' : 'C'
      }
    }
    
    // Insert signal
    const { error } = await supabaseClient
      .from('signals')
      .insert(signal)
    
    if (error && !error.message.includes('duplicate')) {
      console.error('Error inserting enhanced signal:', error)
      return null
    }
    
    return signal
  } catch (error) {
    console.error('Error in enhanced analysis:', error)
    return null
  }
}

// Technical indicator functions
function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateSMA(values: number[], period: number): number {
  const slice = values.slice(-period)
  return slice.reduce((sum, val) => sum + val, 0) / slice.length
}

function calculateRSI(values: number[], period: number): number {
  const deltas = []
  for (let i = 1; i < values.length; i++) {
    deltas.push(values[i] - values[i - 1])
  }
  
  const gains = deltas.map(d => d > 0 ? d : 0)
  const losses = deltas.map(d => d < 0 ? Math.abs(d) : 0)
  
  const avgGain = gains.slice(-period).reduce((sum, g) => sum + g, 0) / period
  const avgLoss = losses.slice(-period).reduce((sum, l) => sum + l, 0) / period
  
  if (avgLoss === 0) return 100
  
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(values: number[]) {
  const ema12 = calculateEMA(values, 12)
  const ema26 = calculateEMA(values, 26)
  const macd = ema12 - ema26
  const signal = calculateEMA([macd], 9)
  const histogram = macd - signal
  
  return { macd, signal, histogram }
}

function calculateBollingerBands(values: number[], period: number, deviation: number) {
  const sma = calculateSMA(values, period)
  const slice = values.slice(-period)
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
  const stdDev = Math.sqrt(variance)
  
  return {
    upper: sma + (stdDev * deviation),
    middle: sma,
    lower: sma - (stdDev * deviation)
  }
}

function calculateStochRSI(values: number[], period: number): number {
  const rsiValues = []
  for (let i = period; i < values.length; i++) {
    const slice = values.slice(i - period, i)
    rsiValues.push(calculateRSI(slice, Math.min(14, slice.length)))
  }
  
  if (rsiValues.length === 0) return 50
  
  const rsiPeriod = Math.min(14, rsiValues.length)
  const recentRSI = rsiValues.slice(-rsiPeriod)
  const minRSI = Math.min(...recentRSI)
  const maxRSI = Math.max(...recentRSI)
  const currentRSI = recentRSI[recentRSI.length - 1]
  
  if (maxRSI === minRSI) return 50
  
  return ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100
}