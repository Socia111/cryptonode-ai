import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// AITRADEX1 (SMA-250) Signal Generator with Multi-Timeframe Support
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h']
const TARGET_VOL = 0.012 // 1.2% target volatility
const V_MIN = 1000000 // Minimum $1M daily volume

interface MarketData {
  symbol: string
  price: number
  volume24h: number
  change24hPercent: number
  high24h: number
  low24h: number
  bid: number
  ask: number
}

interface TechnicalData {
  ema21: number
  ema50: number
  ema200: number
  sma250: number
  atr: number
  rsi: number
  stochK: number
  stochD: number
  adx: number
  plusDI: number
  minusDI: number
}

interface BTCRegime {
  ema50: number
  ema200: number
  sma250: number
  regimeScore: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[AITRADEX1] Starting comprehensive signal generation...')
    
    // Clean old signals first
    const { error: cleanError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    
    if (cleanError) {
      console.error('[AITRADEX1] Clean error:', cleanError)
    } else {
      console.log('[AITRADEX1] Cleaned old signals')
    }

    // Get all USDT symbols from Bybit
    const symbolsResponse = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear')
    const symbolsData = await symbolsResponse.json()
    
    if (symbolsData.retCode !== 0) {
      throw new Error('Failed to fetch Bybit symbols')
    }

    // Filter for active USDT symbols
    const usdtSymbols = symbolsData.result.list
      .filter(inst => 
        inst.quoteCoin === 'USDT' && 
        inst.status === 'Trading' &&
        inst.contractType === 'LinearPerpetual'
      )
      .map(inst => inst.symbol)

    console.log(`[AITRADEX1] Processing ${usdtSymbols.length} USDT symbols`)

    // Get BTC regime data
    const btcRegime = await getBTCRegime()
    console.log(`[AITRADEX1] BTC Regime Score: ${btcRegime.regimeScore.toFixed(3)}`)

    const allSignals = []
    
    // Process symbols in batches to avoid timeout
    const batchSize = 20
    for (let i = 0; i < Math.min(usdtSymbols.length, 100); i += batchSize) {
      const batch = usdtSymbols.slice(i, i + batchSize)
      
      for (const symbol of batch) {
        try {
          // Get market data
          const marketData = await getMarketData(symbol)
          if (!marketData || marketData.volume24h * marketData.price < V_MIN) {
            continue // Skip low liquidity symbols
          }

          // Generate signals for each timeframe
          for (const timeframe of TIMEFRAMES) {
            const technicalData = await getTechnicalData(symbol, timeframe)
            if (!technicalData) continue

            const signal = generateAITRADEX1Signal(
              symbol,
              timeframe,
              marketData,
              technicalData,
              btcRegime
            )

            if (signal) {
              allSignals.push(signal)
              console.log(`✅ Generated ${signal.side} signal: ${symbol} ${timeframe} (Score: ${signal.confidence})`)
            }
          }
        } catch (symbolError) {
          console.error(`Error processing ${symbol}:`, symbolError)
          continue
        }
      }
    }

    // Insert signals into database
    if (allSignals.length > 0) {
      const { data: insertedSignals, error: insertError } = await supabase
        .from('signals')
        .upsert(allSignals, { onConflict: 'symbol,timeframe,side' })
        .select()

      if (insertError) {
        console.error('[AITRADEX1] Failed to insert signals:', insertError)
        throw new Error(`Failed to insert signals: ${insertError.message}`)
      }

      console.log(`[AITRADEX1] ✅ Inserted ${insertedSignals?.length || 0} signals`)
    }

    return new Response(JSON.stringify({
      success: true,
      signals_generated: allSignals.length,
      symbols_processed: Math.min(usdtSymbols.length, 100),
      btc_regime_score: btcRegime.regimeScore,
      source: 'aitradex1_sma250',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[AITRADEX1] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})

async function getMarketData(symbol: string): Promise<MarketData | null> {
  try {
    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
    const data = await response.json()
    
    if (data.retCode !== 0 || !data.result?.list?.[0]) {
      return null
    }

    const ticker = data.result.list[0]
    return {
      symbol,
      price: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume24h),
      change24hPercent: parseFloat(ticker.price24hPcnt) * 100,
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price)
    }
  } catch (error) {
    console.error(`Failed to get market data for ${symbol}:`, error)
    return null
  }
}

async function getTechnicalData(symbol: string, timeframe: string): Promise<TechnicalData | null> {
  try {
    // Get kline data for technical calculations
    const klineResponse = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=300`
    )
    const klineData = await klineResponse.json()
    
    if (klineData.retCode !== 0 || !klineData.result?.list) {
      return null
    }

    const candles = klineData.result.list.reverse() // Bybit returns newest first
    if (candles.length < 250) return null // Need enough data for SMA-250

    const closes = candles.map(c => parseFloat(c[4]))
    const highs = candles.map(c => parseFloat(c[2]))
    const lows = candles.map(c => parseFloat(c[3]))
    const volumes = candles.map(c => parseFloat(c[5]))

    return {
      ema21: calculateEMA(closes, 21),
      ema50: calculateEMA(closes, 50),
      ema200: calculateEMA(closes, 200),
      sma250: calculateSMA(closes, 250),
      atr: calculateATR(highs, lows, closes, 14),
      rsi: calculateRSI(closes, 14),
      stochK: calculateStochastic(highs, lows, closes, 14).k,
      stochD: calculateStochastic(highs, lows, closes, 14).d,
      adx: calculateADX(highs, lows, closes, 14).adx,
      plusDI: calculateADX(highs, lows, closes, 14).plusDI,
      minusDI: calculateADX(highs, lows, closes, 14).minusDI
    }
  } catch (error) {
    console.error(`Failed to get technical data for ${symbol} ${timeframe}:`, error)
    return null
  }
}

async function getBTCRegime(): Promise<BTCRegime> {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=1h&limit=300')
    const data = await response.json()
    
    if (data.retCode !== 0 || !data.result?.list) {
      throw new Error('Failed to get BTC data')
    }

    const candles = data.result.list.reverse()
    const closes = candles.map(c => parseFloat(c[4]))
    
    const ema50 = calculateEMA(closes, 50)
    const ema200 = calculateEMA(closes, 200)
    const sma250 = calculateSMA(closes, 250)
    const currentPrice = closes[closes.length - 1]
    
    // Calculate regime score
    const trendScore = sigma(((ema50 - ema200) / currentPrice) * 500)
    const anchorScore = currentPrice >= sma250 ? 1.0 : 0.7
    const regimeScore = trendScore * anchorScore

    return { ema50, ema200, sma250, regimeScore }
  } catch (error) {
    console.error('Failed to get BTC regime:', error)
    return { ema50: 0, ema200: 0, sma250: 0, regimeScore: 0.5 }
  }
}

function generateAITRADEX1Signal(
  symbol: string,
  timeframe: string,
  market: MarketData,
  tech: TechnicalData,
  btc: BTCRegime
) {
  const price = market.price
  
  // AITRADEX1 Feature Calculation
  
  // 1. Momentum (m) - ROC normalized by volatility
  const atrPercent = tech.atr / price
  const changePercent = market.change24hPercent / 100
  const momentum = clamp(changePercent / atrPercent, -3, 3)
  
  // 2. Breakout (b) - Donchian channel position
  const range = market.high24h - market.low24h
  const breakout = range > 0 ? clamp((price - market.high24h) / range, -1, 1) : 0
  
  // 3. Trend alignment (t) with SMA-250 backbone
  const trendBase = sigma(((tech.ema50 - tech.ema200) / price) * 2000)
  
  // 4. Volatility quality (vq)
  const volQuality = 1 - Math.abs(atrPercent - TARGET_VOL) / TARGET_VOL
  const volQualityScore = clamp(volQuality, 0, 1)
  
  // 5. Liquidity (L)
  const volumeUSD = market.volume24h * price
  const liquidityScore = clamp(Math.log10(volumeUSD) / 9, 0, 1)
  
  // 6. Cost (C) - spread + estimated fees
  const spread = (market.ask - market.bid) / price
  const estimatedFees = 0.0006 // 0.06% taker fee
  const costScore = Math.min(spread + estimatedFees, 0.004)
  
  // Generate signals for both sides
  const signals = []
  
  for (const side of ['Buy', 'Sell']) {
    // SMA-250 gating
    const smaGate = price >= tech.sma250
    const sideMultiplier = side === 'Buy' ? 1 : -1
    const anchorWeight = (side === 'Buy' && smaGate) || (side === 'Sell' && !smaGate) ? 1.0 : 0.7
    
    const trendScore = trendBase * anchorWeight * sideMultiplier
    
    // Risk/Reward calculation
    const stopDistance = Math.max(0.015, atrPercent * 1.5)
    const targetDistance = stopDistance * 2.5
    
    const stopLoss = side === 'Buy' 
      ? price * (1 - stopDistance)
      : price * (1 + stopDistance)
    
    const takeProfit = side === 'Buy'
      ? price * (1 + targetDistance)
      : price * (1 - targetDistance)
    
    const rr = targetDistance / stopDistance
    const rrScore = clamp((rr - 1.5) / 1.5, 0, 1)
    
    // BTC Regime scoring
    const regimeScore = side === 'Buy' ? btc.regimeScore : (1 - btc.regimeScore)
    
    // AITRADEX1 Weights (timeframe specific)
    const weights = getTimeframeWeights(timeframe)
    
    // Calculate composite score
    const score = 
      weights.momentum * sigmoid(momentum * sideMultiplier) +
      weights.breakout * sigmoid(breakout * sideMultiplier) +
      weights.trend * trendScore +
      weights.liquidity * liquidityScore +
      weights.volQuality * volQualityScore +
      weights.riskReward * rrScore +
      weights.regime * regimeScore -
      weights.cost * costScore
    
    const confidence = Math.round(100 * sigma(2.2 * score))
    
    // Grading system
    let grade = 'F'
    if (confidence >= 88 && rr >= 1.8 && liquidityScore >= 0.6 && costScore <= 0.0015) grade = 'A+'
    else if (confidence >= 80 && rr >= 1.6) grade = 'A'
    else if (confidence >= 72 && rr >= 1.4) grade = 'B'
    else if (confidence >= 65 && rr >= 1.2) grade = 'C'
    
    // Only generate signals with grade C or better
    if (confidence >= 65 && rr >= 1.2) {
      signals.push({
        symbol,
        timeframe,
        direction: side.toUpperCase(),
        side,
        entry_price: price,
        price: price,
        stop_loss: Math.round(stopLoss * 100000) / 100000,
        take_profit: Math.round(takeProfit * 100000) / 100000,
        score: confidence,
        confidence: confidence,
        source: 'aitradex1_sma250',
        algo: 'aitradex1_v2',
        exchange: 'bybit',
        signal_type: 'SWING',
        signal_grade: grade,
        metadata: {
          momentum: momentum,
          breakout: breakout,
          trend: trendScore,
          liquidity: liquidityScore,
          vol_quality: volQualityScore,
          rr: rr,
          regime: regimeScore,
          cost: costScore,
          sma250_gate: smaGate,
          btc_regime_score: btc.regimeScore,
          verified_real_data: true,
          data_source: 'bybit_live_aitradex1'
        },
        bar_time: new Date().toISOString(),
        risk: Math.round((2 - confidence / 100) * 100) / 100,
        algorithm_version: 'aitradex1_sma250_v1.0',
        market_conditions: {
          volatility: atrPercent,
          volume_score: liquidityScore,
          momentum: changePercent,
          regime_score: btc.regimeScore
        },
        execution_priority: confidence >= 85 ? 90 : confidence >= 80 ? 70 : 50,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        is_active: true
      })
    }
  }
  
  // Return the best signal if any
  return signals.length > 0 ? signals.sort((a, b) => b.confidence - a.confidence)[0] : null
}

function getTimeframeWeights(timeframe: string) {
  const baseWeights = {
    momentum: 0.22,
    breakout: 0.18,
    trend: 0.18,
    liquidity: 0.12,
    volQuality: 0.10,
    riskReward: 0.12,
    regime: 0.06,
    cost: 0.10
  }
  
  // Adjust weights based on timeframe
  switch (timeframe) {
    case '1m':
    case '5m':
      return {
        ...baseWeights,
        momentum: 0.30,
        breakout: 0.25,
        trend: 0.15,
        regime: 0.02
      }
    case '4h':
      return {
        ...baseWeights,
        trend: 0.25,
        regime: 0.12,
        momentum: 0.15
      }
    default:
      return baseWeights
  }
}

// Mathematical helper functions
function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

function sigmoid(x: number): number {
  return sigma(x)
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0
  const slice = values.slice(-period)
  return slice.reduce((sum, val) => sum + val, 0) / period
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0
  
  const multiplier = 2 / (period + 1)
  let ema = calculateSMA(values.slice(0, period), period)
  
  for (let i = period; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0
  
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

function calculateRSI(values: number[], period: number): number {
  if (values.length < period + 1) return 50
  
  const changes = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }
  
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? -change : 0)
  
  const avgGain = calculateSMA(gains.slice(-period), period)
  const avgLoss = calculateSMA(losses.slice(-period), period)
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number) {
  if (highs.length < period) return { k: 50, d: 50 }
  
  const kValues = []
  for (let i = period - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1))
    const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1))
    const currentClose = closes[i]
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
    kValues.push(k)
  }
  
  const currentK = kValues[kValues.length - 1] || 50
  const currentD = calculateSMA(kValues.slice(-3), 3)
  
  return { k: currentK, d: currentD }
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number) {
  if (highs.length < period + 1) return { adx: 25, plusDI: 25, minusDI: 25 }
  
  const dmPlus = []
  const dmMinus = []
  const tr = []
  
  for (let i = 1; i < highs.length; i++) {
    const moveUp = highs[i] - highs[i - 1]
    const moveDown = lows[i - 1] - lows[i]
    
    dmPlus.push(moveUp > moveDown && moveUp > 0 ? moveUp : 0)
    dmMinus.push(moveDown > moveUp && moveDown > 0 ? moveDown : 0)
    
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }
  
  const avgDMPlus = calculateSMA(dmPlus.slice(-period), period)
  const avgDMMinus = calculateSMA(dmMinus.slice(-period), period)
  const avgTR = calculateSMA(tr.slice(-period), period)
  
  const plusDI = (avgDMPlus / avgTR) * 100
  const minusDI = (avgDMMinus / avgTR) * 100
  
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
  const adx = dx || 25
  
  return { adx, plusDI, minusDI }
}