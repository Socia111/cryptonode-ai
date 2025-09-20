import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('📊 SMA/EMA Signal Engine - Moving Average Crossover Analysis Started')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbols, timeframes, sma_periods, ema_periods } = await req.json()
    
    const targetSymbols = symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT']
    const targetTimeframes = timeframes || ['15m', '1h', '4h']
    const smaPeriods = sma_periods || [20, 50, 200]
    const emaPeriods = ema_periods || [12, 26, 50]

    console.log(`📈 SMA/EMA Analysis: ${targetSymbols.length} symbols, ${targetTimeframes.length} timeframes`)

    const results = []
    const crossoverSignals = []

    // Analyze each symbol across timeframes
    for (const symbol of targetSymbols) {
      for (const timeframe of targetTimeframes) {
        try {
          // Fetch kline data for moving average calculation
          const klineData = await fetchKlineData(symbol, timeframe, 250) // Enough for 200 SMA
          if (!klineData || klineData.length < 200) continue

          // Calculate moving averages
          const movingAverages = calculateMovingAverages(klineData, smaPeriods, emaPeriods)
          
          // Detect crossover signals
          const crossovers = detectCrossovers(klineData, movingAverages, symbol, timeframe)
          
          // Generate signals from crossovers
          for (const crossover of crossovers) {
            if (crossover.strength >= 60) { // Minimum strength threshold
              const signal = await generateCrossoverSignal(symbol, timeframe, klineData, crossover)
              if (signal) {
                const inserted = await safeSignalInsert(signal)
                if (inserted) {
                  results.push(signal)
                  crossoverSignals.push(crossover)
                  console.log(`📊 Crossover Signal: ${symbol} ${timeframe} ${signal.direction} (${crossover.type})`)
                }
              }
            }
          }

        } catch (error) {
          console.error(`❌ Error analyzing ${symbol} ${timeframe}:`, error.message)
        }
      }
    }

    // Update system status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'sma_ema_engine',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: results.length,
        metadata: {
          signals_generated: results.length,
          symbols_analyzed: targetSymbols.length,
          timeframes_analyzed: targetTimeframes.length,
          crossovers_detected: crossoverSignals.length,
          sma_periods: smaPeriods,
          ema_periods: emaPeriods,
          last_run: new Date().toISOString()
        }
      })

    return new Response(JSON.stringify({
      success: true,
      signals_generated: results.length,
      signals: results,
      crossover_analysis: {
        total_crossovers: crossoverSignals.length,
        by_type: countCrossoverTypes(crossoverSignals),
        strongest_signals: crossoverSignals
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 5)
      },
      analysis_summary: {
        symbols_processed: targetSymbols.length,
        timeframes_processed: targetTimeframes.length,
        sma_periods_used: smaPeriods,
        ema_periods_used: emaPeriods
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ SMA/EMA Engine error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Fetch kline data for moving average calculations
async function fetchKlineData(symbol: string, timeframe: string, limit: number) {
  try {
    const bybitBase = Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com'
    const url = `${bybitBase}/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=${limit}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data?.result?.list?.length) {
      return data.result.list.reverse().map((k: any) => ({
        timestamp: parseInt(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }))
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching kline data for ${symbol}:`, error)
    return null
  }
}

// Calculate all moving averages
function calculateMovingAverages(klines: any[], smaPeriods: number[], emaPeriods: number[]) {
  const mas = {
    sma: {} as Record<number, number[]>,
    ema: {} as Record<number, number[]>
  }
  
  // Calculate SMAs
  for (const period of smaPeriods) {
    mas.sma[period] = calculateSMA(klines, period)
  }
  
  // Calculate EMAs
  for (const period of emaPeriods) {
    mas.ema[period] = calculateEMA(klines, period)
  }
  
  return mas
}

// Calculate Simple Moving Average
function calculateSMA(klines: any[], period: number): number[] {
  const sma = []
  const closes = klines.map(k => k.close)
  
  for (let i = period - 1; i < closes.length; i++) {
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  
  return sma
}

// Calculate Exponential Moving Average
function calculateEMA(klines: any[], period: number): number[] {
  const ema = []
  const closes = klines.map(k => k.close)
  const multiplier = 2 / (period + 1)
  
  // Start with SMA for first value
  let previousEMA = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  ema.push(previousEMA)
  
  for (let i = period; i < closes.length; i++) {
    const currentEMA = (closes[i] * multiplier) + (previousEMA * (1 - multiplier))
    ema.push(currentEMA)
    previousEMA = currentEMA
  }
  
  return ema
}

// Detect crossover signals
function detectCrossovers(klines: any[], mas: any, symbol: string, timeframe: string) {
  const crossovers = []
  const currentPrice = klines[klines.length - 1].close
  
  // Golden Cross (50 SMA crosses above 200 SMA)
  if (mas.sma[50] && mas.sma[200]) {
    const goldenCross = detectGoldenDeathCross(mas.sma[50], mas.sma[200], 'golden')
    if (goldenCross) {
      crossovers.push({
        type: 'golden_cross',
        direction: 'LONG',
        strength: goldenCross.strength,
        description: '50 SMA crossed above 200 SMA',
        timeframe,
        ma1: 50,
        ma2: 200,
        ma_type: 'SMA'
      })
    }
  }
  
  // Death Cross (50 SMA crosses below 200 SMA)
  if (mas.sma[50] && mas.sma[200]) {
    const deathCross = detectGoldenDeathCross(mas.sma[50], mas.sma[200], 'death')
    if (deathCross) {
      crossovers.push({
        type: 'death_cross',
        direction: 'SHORT',
        strength: deathCross.strength,
        description: '50 SMA crossed below 200 SMA',
        timeframe,
        ma1: 50,
        ma2: 200,
        ma_type: 'SMA'
      })
    }
  }
  
  // EMA Crossovers (12 EMA vs 26 EMA)
  if (mas.ema[12] && mas.ema[26]) {
    const emaCrossover = detectEMACrossover(mas.ema[12], mas.ema[26])
    if (emaCrossover) {
      crossovers.push({
        type: emaCrossover.type,
        direction: emaCrossover.direction,
        strength: emaCrossover.strength,
        description: `12 EMA crossed ${emaCrossover.direction === 'LONG' ? 'above' : 'below'} 26 EMA`,
        timeframe,
        ma1: 12,
        ma2: 26,
        ma_type: 'EMA'
      })
    }
  }
  
  // Price vs SMA crossovers
  if (mas.sma[20]) {
    const priceSMACross = detectPriceMACrossover(klines, mas.sma[20], 20, 'SMA')
    if (priceSMACross) {
      crossovers.push({
        type: 'price_sma_cross',
        direction: priceSMACross.direction,
        strength: priceSMACross.strength,
        description: `Price crossed ${priceSMACross.direction === 'LONG' ? 'above' : 'below'} 20 SMA`,
        timeframe,
        ma1: 'price',
        ma2: 20,
        ma_type: 'SMA'
      })
    }
  }
  
  // Price vs EMA crossovers
  if (mas.ema[50]) {
    const priceEMACross = detectPriceMACrossover(klines, mas.ema[50], 50, 'EMA')
    if (priceEMACross) {
      crossovers.push({
        type: 'price_ema_cross',
        direction: priceEMACross.direction,
        strength: priceEMACross.strength,
        description: `Price crossed ${priceEMACross.direction === 'LONG' ? 'above' : 'below'} 50 EMA`,
        timeframe,
        ma1: 'price',
        ma2: 50,
        ma_type: 'EMA'
      })
    }
  }
  
  return crossovers
}

// Detect Golden Cross / Death Cross
function detectGoldenDeathCross(fastMA: number[], slowMA: number[], type: 'golden' | 'death') {
  if (fastMA.length < 2 || slowMA.length < 2) return null
  
  const currentFast = fastMA[fastMA.length - 1]
  const currentSlow = slowMA[slowMA.length - 1]
  const previousFast = fastMA[fastMA.length - 2]
  const previousSlow = slowMA[slowMA.length - 2]
  
  // Check for crossover
  const wasBelowAbove = type === 'golden' 
    ? (previousFast <= previousSlow && currentFast > currentSlow)
    : (previousFast >= previousSlow && currentFast < currentSlow)
  
  if (wasBelowAbove) {
    // Calculate strength based on angle and distance
    const angle = Math.abs(currentFast - currentSlow) / currentSlow
    const momentum = Math.abs((currentFast / previousFast - 1) - (currentSlow / previousSlow - 1))
    
    const strength = Math.min(100, (angle * 100) + (momentum * 500))
    
    return {
      strength: Math.round(strength),
      angle,
      momentum
    }
  }
  
  return null
}

// Detect EMA crossovers
function detectEMACrossover(ema12: number[], ema26: number[]) {
  if (ema12.length < 2 || ema26.length < 2) return null
  
  const current12 = ema12[ema12.length - 1]
  const current26 = ema26[ema26.length - 1]
  const previous12 = ema12[ema12.length - 2]
  const previous26 = ema26[ema26.length - 2]
  
  // Bullish crossover (12 EMA crosses above 26 EMA)
  if (previous12 <= previous26 && current12 > current26) {
    const strength = calculateCrossoverStrength(current12, current26, previous12, previous26)
    return {
      type: 'ema_bullish_cross',
      direction: 'LONG',
      strength
    }
  }
  
  // Bearish crossover (12 EMA crosses below 26 EMA)
  if (previous12 >= previous26 && current12 < current26) {
    const strength = calculateCrossoverStrength(current12, current26, previous12, previous26)
    return {
      type: 'ema_bearish_cross',
      direction: 'SHORT',
      strength
    }
  }
  
  return null
}

// Detect Price vs MA crossovers
function detectPriceMACrossover(klines: any[], ma: number[], period: number, maType: string) {
  if (klines.length < 2 || ma.length < 2) return null
  
  const currentPrice = klines[klines.length - 1].close
  const previousPrice = klines[klines.length - 2].close
  const currentMA = ma[ma.length - 1]
  const previousMA = ma[ma.length - 2]
  
  // Bullish crossover (Price crosses above MA)
  if (previousPrice <= previousMA && currentPrice > currentMA) {
    const strength = calculatePriceMACrossoverStrength(currentPrice, currentMA, previousPrice, previousMA)
    return {
      direction: 'LONG',
      strength
    }
  }
  
  // Bearish crossover (Price crosses below MA)
  if (previousPrice >= previousMA && currentPrice < currentMA) {
    const strength = calculatePriceMACrossoverStrength(currentPrice, currentMA, previousPrice, previousMA)
    return {
      direction: 'SHORT',
      strength
    }
  }
  
  return null
}

// Calculate crossover strength
function calculateCrossoverStrength(current1: number, current2: number, previous1: number, previous2: number): number {
  const currentDistance = Math.abs(current1 - current2) / Math.max(current1, current2)
  const previousDistance = Math.abs(previous1 - previous2) / Math.max(previous1, previous2)
  const distanceChange = currentDistance + previousDistance
  
  const momentum1 = (current1 / previous1 - 1) * 100
  const momentum2 = (current2 / previous2 - 1) * 100
  const momentumDifference = Math.abs(momentum1 - momentum2)
  
  const strength = (distanceChange * 100) + (momentumDifference * 2)
  return Math.min(100, Math.round(strength))
}

// Calculate price vs MA crossover strength
function calculatePriceMACrossoverStrength(currentPrice: number, currentMA: number, previousPrice: number, previousMA: number): number {
  const priceChange = (currentPrice / previousPrice - 1) * 100
  const maChange = (currentMA / previousMA - 1) * 100
  const distance = Math.abs(currentPrice - currentMA) / currentMA
  
  const strength = Math.abs(priceChange - maChange) + (distance * 100)
  return Math.min(100, Math.round(strength))
}

// Generate signal from crossover
async function generateCrossoverSignal(symbol: string, timeframe: string, klines: any[], crossover: any) {
  try {
    const currentPrice = klines[klines.length - 1].close
    const atr = calculateATR(klines, 14)
    
    // Calculate risk/reward levels based on ATR
    const atrMultiplier = timeframe === '4h' ? 2.0 : timeframe === '1h' ? 1.5 : 1.0
    const stopDistance = atr * atrMultiplier
    const profitDistance = stopDistance * 2.5 // 2.5:1 RR ratio
    
    const stopLoss = crossover.direction === 'LONG' 
      ? currentPrice - stopDistance 
      : currentPrice + stopDistance
    
    const takeProfit = crossover.direction === 'LONG' 
      ? currentPrice + profitDistance 
      : currentPrice - profitDistance
    
    return {
      symbol,
      timeframe,
      direction: crossover.direction,
      score: crossover.strength,
      price: currentPrice,
      entry_price: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      confidence: crossover.strength / 100,
      source: 'sma_ema_signal_engine',
      algo: 'moving_average_crossover_v1',
      bar_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      diagnostics: {
        crossover_type: crossover.type,
        crossover_strength: crossover.strength,
        ma1: crossover.ma1,
        ma2: crossover.ma2,
        ma_type: crossover.ma_type,
        atr: atr,
        stop_distance: stopDistance,
        profit_distance: profitDistance
      },
      metadata: {
        engine: 'sma_ema_crossover',
        crossover_description: crossover.description,
        ma_combination: `${crossover.ma1}_${crossover.ma2}_${crossover.ma_type}`,
        timeframe_analyzed: timeframe,
        risk_reward_ratio: profitDistance / stopDistance
      }
    }
  } catch (error) {
    console.error(`Error generating crossover signal for ${symbol}:`, error)
    return null
  }
}

// Calculate Average True Range
function calculateATR(klines: any[], period: number): number {
  const trs = []
  
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high
    const low = klines[i].low
    const prevClose = klines[i - 1].close
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    
    trs.push(tr)
  }
  
  const atrValues = trs.slice(-period)
  return atrValues.reduce((sum, tr) => sum + tr, 0) / atrValues.length
}

// Count crossover types for analysis
function countCrossoverTypes(crossovers: any[]) {
  const counts: Record<string, number> = {}
  
  for (const crossover of crossovers) {
    counts[crossover.type] = (counts[crossover.type] || 0) + 1
  }
  
  return counts
}

// Safe signal insertion
async function safeSignalInsert(signal: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('signals')
      .insert(signal)

    if (error) {
      if (error.code === '23505') return false // Cooldown active
      throw error
    }
    
    return true
  } catch (error) {
    console.error(`Failed to insert crossover signal:`, error)
    return false
  }
}