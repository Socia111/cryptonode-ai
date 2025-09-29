import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🧠 AItradeX1 Comprehensive Engine - EMA21/SMA200 + StochRSI + ADX + Volatility')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎯 Starting comprehensive strategy-based signal analysis...')

    const results = []
    const errors = []

    // Target symbols and timeframes
    const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT']
    const scoreThreshold = 65

    // Clean up old signals
    const { error: cleanupError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    
    if (!cleanupError) {
      console.log('🧹 Cleaned up old signals')
    }

    // Analyze each symbol with the proper strategy
    for (const symbol of targetSymbols) {
      try {
        // Fetch candle data
        const candles = await fetchCandleData(symbol)
        if (!candles || candles.length < 200) continue

        // Apply strategy rules
        const signal = await applyStrategyRules(symbol, candles)
        if (!signal || signal.score < scoreThreshold) continue

        // Enhanced signal with proper metadata
        const enhancedSignal = {
          ...signal,
          source: 'aitradex1_comprehensive_engine',
          algo: 'ema21_sma200_stochrsi_adx_vol',
          metadata: {
            ...signal.metadata,
            strategy: 'rule_based_comprehensive',
            indicators: 'ema21_sma200_stochrsi_adx_volatility',
            timeframe: '1h'
          }
        }

        // Insert signal
        const inserted = await safeSignalInsert(enhancedSignal)
        if (inserted) {
          results.push(enhancedSignal)
          console.log(`✅ Comprehensive signal: ${symbol} ${signal.direction} (Grade: ${signal.metadata?.grade}, Score: ${signal.score})`)
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error analyzing ${symbol}:`, errorMessage)
        errors.push({ symbol, error: errorMessage })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      signals_generated: results.length,
      signals: results,
      analysis_summary: {
        symbols_processed: targetSymbols.length,
        score_threshold: scoreThreshold,
        strategy: 'ema21_sma200_stochrsi_adx_volatility_comprehensive'
      },
      errors,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Comprehensive Engine error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function fetchCandleData(symbol: string) {
  try {
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=200`
    )
    const data = await response.json()
    
    if (!data.result?.list) return null
    
    return data.result.list
      .map((candle: string[]) => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }))
      .reverse()
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error)
    return null
  }
}

async function applyStrategyRules(symbol: string, candles: any[]) {
  const currentCandle = candles[candles.length - 1]
  const closes = candles.map(c => c.close)
  
  // Calculate indicators
  const ema21 = calculateEMA(closes, 21)
  const sma200 = calculateSMA(closes, 200)
  const stochRSI = calculateStochRSI(candles, 14)
  const adx = calculateADX(candles, 14)
  const volExpansion = calculateVolatilityExpansion(candles, 30)
  const atr14 = calculateATR(candles, 14)
  
  let signal = null
  let score = 60
  let grade = 'C'
  
  // Strategy Rules: EMA21 vs SMA200 + Volatility Expansion + StochRSI + ADX
  if (
    ema21 > sma200 &&          // Bullish trend
    volExpansion > 1.2 &&      // Volatility expansion  
    stochRSI < 0.20 &&         // Oversold
    adx > 25                   // Trend strength
  ) {
    signal = 'LONG'
    score = adx > 30 ? 85 : 75
    grade = adx > 30 ? 'A' : 'B'
  } else if (
    ema21 < sma200 &&          // Bearish trend
    volExpansion > 1.2 &&      // Volatility expansion
    stochRSI > 0.80 &&         // Overbought  
    adx > 25                   // Trend strength
  ) {
    signal = 'SHORT'
    score = adx > 30 ? 85 : 75
    grade = adx > 30 ? 'A' : 'B'
  }
  
  if (!signal) return null
  
  const currentPrice = currentCandle.close
  const stopDistance = Math.max(atr14 * 1.5, currentPrice * 0.003)
  
  const stopLoss = signal === 'LONG' ? 
    currentPrice - stopDistance : 
    currentPrice + stopDistance
    
  const takeProfit = signal === 'LONG' ? 
    currentPrice + (stopDistance * 2.0) : 
    currentPrice - (stopDistance * 2.0)
  
  return {
    symbol,
    direction: signal,
    timeframe: '1h',
    price: currentPrice,
    entry_price: currentPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score,
    confidence: score / 100,
    bar_time: new Date(currentCandle.timestamp).toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    diagnostics: {
      ema21,
      sma200,
      stoch_rsi: stochRSI,
      adx,
      volatility_expansion: volExpansion,
      atr14
    },
    metadata: {
      grade,
      algorithm_version: 'v2.0_comprehensive',
      trend: ema21 > sma200 ? 'bullish' : 'bearish',
      volatility_expanded: volExpansion > 1.2,
      momentum: signal === 'LONG' ? 'oversold_recovery' : 'overbought_decline',
      trend_strength: adx
    },
    is_active: true
  }
}

// Technical Indicator Functions
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

function calculateStochRSI(candles: any[], period = 14): number {
  // Calculate RSI first
  const changes = []
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close)
  }
  
  const recentChanges = changes.slice(-period)
  const gains = recentChanges.filter(c => c > 0)
  const losses = recentChanges.filter(c => c < 0).map(Math.abs)
  
  const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0
  const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0
  
  if (avgLoss === 0) return 1.0
  
  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  
  // Convert RSI to StochRSI (0-1 range)
  return rsi / 100
}

function calculateADX(candles: any[], period = 14): number {
  const trs = []
  const plusDMs = []
  const minusDMs = []
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevHigh = candles[i - 1].high
    const prevLow = candles[i - 1].low
    const prevClose = candles[i - 1].close
    
    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trs.push(tr)
    
    // Directional Movement
    const upMove = high - prevHigh
    const downMove = prevLow - low
    
    const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0
    const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0
    
    plusDMs.push(plusDM)
    minusDMs.push(minusDM)
  }
  
  // Calculate averages
  const avgTR = trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
  const avgPlusDM = plusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period
  const avgMinusDM = minusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period
  
  const plusDI = (avgPlusDM / avgTR) * 100
  const minusDI = (avgMinusDM / avgTR) * 100
  
  if ((plusDI + minusDI) === 0) return 0
  
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
  return dx
}

function calculateVolatilityExpansion(candles: any[], period = 30): number {
  const returns = []
  for (let i = 1; i < candles.length; i++) {
    const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close
    returns.push(ret)
  }
  
  if (returns.length < period + 1) return 1.0
  
  const currentPeriod = returns.slice(-period)
  const previousPeriod = returns.slice(-(period + 1), -1)
  
  const currentVol = Math.sqrt(currentPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period)
  const previousVol = Math.sqrt(previousPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period)
  
  return previousVol === 0 ? 1.0 : currentVol / previousVol
}

function calculateATR(candles: any[], period = 14): number {
  const trs = []
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    
    trs.push(tr)
  }
  
  return trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
}

async function safeSignalInsert(signal: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('signals')
      .insert(signal)

    if (error) {
      if (error.code === '23505') return false // Duplicate/Cooldown
      throw error
    }
    
    return true
  } catch (error) {
    console.error(`Failed to insert signal:`, error)
    return false
  }
}