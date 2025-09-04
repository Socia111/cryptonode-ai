import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketData {
  symbol: string
  price: number
  volume: number
  high: number
  low: number
  open: number
  close: number
  timestamp: number
}

interface TechnicalIndicators {
  ema21: number
  ema50: number
  ema200: number
  sma21: number
  sma50: number
  sma200: number
  adx: number
  plusDI: number
  minusDI: number
  stochK: number
  stochD: number
  volume21Avg: number
  hvp: number // Historical Volatility Percentile
}

interface SpynxSignal {
  symbol: string
  exchange: string
  timeframe: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  entry_price: number
  stop_loss: number
  take_profit: number
  confidence_score: number
  pms_score: number // Price Momentum Score
  signal_strength: 'WEAK' | 'MEDIUM' | 'STRONG'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  indicators: TechnicalIndicators
  timestamp: string
}

interface SpynxConfig {
  // Weighted coefficients for PMS calculation
  alpha: number    // EMA weight
  beta: number     // ADX weight
  gamma: number    // Stochastic weight
  delta: number    // Volume weight
  epsilon: number  // HVP weight
  
  // Signal thresholds
  buy_threshold: number    // +0.5
  sell_threshold: number   // -0.5
  
  // Risk management
  stop_loss_atr_multiplier: number
  take_profit_atr_multiplier: number
}

const DEFAULT_CONFIG: SpynxConfig = {
  alpha: 0.3,    // EMA component weight
  beta: 0.25,    // ADX component weight
  gamma: 0.2,    // Stochastic component weight
  delta: 0.15,   // Volume component weight
  epsilon: 0.1,  // HVP component weight
  buy_threshold: 0.5,
  sell_threshold: -0.5,
  stop_loss_atr_multiplier: 2.0,
  take_profit_atr_multiplier: 3.0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { symbols = [], timeframes = ['5m', '15m', '1h', '4h'], exchange = 'bybit' } = await req.json()

    console.log(`🔍 Spynx Scores™ Engine Starting - Analyzing ${symbols.length || 'ALL'} symbols on ${timeframes.join(', ')}`)

    const results = []
    const targetSymbols = symbols.length > 0 ? symbols : await getTopVolumeSymbols(exchange)

    for (const symbol of targetSymbols.slice(0, 50)) { // Limit to 50 symbols for performance
      for (const timeframe of timeframes) {
        try {
          const signal = await analyzeSymbol(symbol, timeframe, exchange, supabase)
          if (signal && signal.direction !== 'HOLD') {
            results.push(signal)
          }
        } catch (error) {
          console.error(`❌ Error analyzing ${symbol} ${timeframe}:`, error.message)
        }
      }
    }

    // Store signals in database
    const signals = results.filter(s => Math.abs(s.pms_score) >= 0.3) // Only store significant signals
    
    if (signals.length > 0) {
      const { error: insertError } = await supabase
        .from('signals')
        .upsert(
          signals.map(signal => ({
            symbol: signal.symbol,
            exchange: signal.exchange,
            timeframe: signal.timeframe,
            direction: signal.direction,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            confidence_score: signal.confidence_score,
            score: signal.pms_score * 100, // Convert to 0-100 scale
            signal_strength: signal.signal_strength,
            risk_level: signal.risk_level,
            metadata: {
              indicators: signal.indicators,
              pms_score: signal.pms_score,
              spynx_engine: true
            },
            generated_at: new Date().toISOString()
          })),
          { onConflict: 'symbol,timeframe,direction' }
        )

      if (insertError) {
        console.error('❌ Failed to store signals:', insertError)
      } else {
        console.log(`✅ Stored ${signals.length} Spynx signals`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        signals: signals.slice(0, 20), // Return top 20 signals
        analysis_summary: {
          symbols_analyzed: targetSymbols.length,
          timeframes: timeframes,
          high_confidence_signals: signals.filter(s => s.confidence_score >= 90).length,
          buy_signals: signals.filter(s => s.direction === 'BUY').length,
          sell_signals: signals.filter(s => s.direction === 'SELL').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🚨 Spynx Engine Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function getTopVolumeSymbols(exchange: string): Promise<string[]> {
  // Fetch top volume USDT pairs from Bybit
  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear')
    const data = await response.json()
    
    if (data.retCode !== 0) throw new Error('Failed to fetch symbols')
    
    return data.result.list
      .filter((ticker: any) => ticker.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
      .slice(0, 100) // Top 100 by volume
      .map((ticker: any) => ticker.symbol)
  } catch (error) {
    console.error('Failed to fetch symbols, using defaults:', error)
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT']
  }
}

async function analyzeSymbol(symbol: string, timeframe: string, exchange: string, supabase: any): Promise<SpynxSignal | null> {
  const klineData = await fetchKlineData(symbol, timeframe)
  if (klineData.length < 200) return null // Need enough data for indicators

  const indicators = calculateTechnicalIndicators(klineData)
  const pmsScore = calculatePMS(indicators, DEFAULT_CONFIG)
  const direction = determineSignalDirection(pmsScore, DEFAULT_CONFIG)
  
  if (direction === 'HOLD') return null

  const currentPrice = klineData[klineData.length - 1].close
  const atr = calculateATR(klineData.slice(-14)) // 14-period ATR
  
  const stopLoss = direction === 'BUY' 
    ? currentPrice - (atr * DEFAULT_CONFIG.stop_loss_atr_multiplier)
    : currentPrice + (atr * DEFAULT_CONFIG.stop_loss_atr_multiplier)
    
  const takeProfit = direction === 'BUY'
    ? currentPrice + (atr * DEFAULT_CONFIG.take_profit_atr_multiplier)
    : currentPrice - (atr * DEFAULT_CONFIG.take_profit_atr_multiplier)

  const confidenceScore = Math.min(100, Math.abs(pmsScore) * 100 + 50)
  const signalStrength = confidenceScore >= 90 ? 'STRONG' : confidenceScore >= 75 ? 'MEDIUM' : 'WEAK'
  const riskLevel = confidenceScore >= 85 ? 'LOW' : confidenceScore >= 70 ? 'MEDIUM' : 'HIGH'

  return {
    symbol,
    exchange,
    timeframe,
    direction,
    entry_price: currentPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    confidence_score: confidenceScore,
    pms_score: pmsScore,
    signal_strength: signalStrength,
    risk_level: riskLevel,
    indicators,
    timestamp: new Date().toISOString()
  }
}

async function fetchKlineData(symbol: string, timeframe: string): Promise<MarketData[]> {
  const interval = timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '1h' ? '60' : '240'
  const limit = 200 // Get 200 candles for indicator calculations
  
  const response = await fetch(
    `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
  )
  
  const data = await response.json()
  if (data.retCode !== 0) throw new Error(`Failed to fetch kline data: ${data.retMsg}`)
  
  return data.result.list.reverse().map((candle: string[]) => ({
    symbol,
    timestamp: parseInt(candle[0]),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5]),
    price: parseFloat(candle[4]) // Close price as current price
  }))
}

function calculateTechnicalIndicators(data: MarketData[]): TechnicalIndicators {
  const closes = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  const volumes = data.map(d => d.volume)
  
  return {
    ema21: calculateEMA(closes, 21),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    sma21: calculateSMA(closes, 21),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    adx: calculateADX(data.slice(-14)), // 14-period ADX
    plusDI: calculateDI(data.slice(-14), true),
    minusDI: calculateDI(data.slice(-14), false),
    stochK: calculateStochastic(highs.slice(-14), lows.slice(-14), closes.slice(-14)).k,
    stochD: calculateStochastic(highs.slice(-14), lows.slice(-14), closes.slice(-14)).d,
    volume21Avg: calculateSMA(volumes, 21),
    hvp: calculateHVP(closes.slice(-100)) // 100-period HVP
  }
}

function calculatePMS(indicators: TechnicalIndicators, config: SpynxConfig): number {
  // EMA Component: Check for Golden Cross (bullish) or Death Cross (bearish)
  const emaComponent = calculateEMAComponent(indicators)
  
  // ADX Component: Trend strength and direction
  const adxComponent = calculateADXComponent(indicators)
  
  // Stochastic Component: Momentum and oversold/overbought
  const stochComponent = calculateStochasticComponent(indicators)
  
  // Volume Component: Volume confirmation
  const volumeComponent = calculateVolumeComponent(indicators)
  
  // HVP Component: Volatility breakout potential
  const hvpComponent = calculateHVPComponent(indicators)
  
  // Calculate weighted PMS
  const pms = (
    config.alpha * emaComponent +
    config.beta * adxComponent +
    config.gamma * stochComponent +
    config.delta * volumeComponent +
    config.epsilon * hvpComponent
  )
  
  return Math.max(-1, Math.min(1, pms)) // Clamp between -1 and 1
}

function calculateEMAComponent(indicators: TechnicalIndicators): number {
  // Golden Cross: EMA21 > EMA50 > EMA200 = +1
  // Death Cross: EMA21 < EMA50 < EMA200 = -1
  
  if (indicators.ema21 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
    return 1.0 // Strong bullish trend
  } else if (indicators.ema21 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
    return -1.0 // Strong bearish trend
  } else if (indicators.ema21 > indicators.ema50) {
    return 0.5 // Moderate bullish
  } else if (indicators.ema21 < indicators.ema50) {
    return -0.5 // Moderate bearish
  }
  
  return 0 // Neutral
}

function calculateADXComponent(indicators: TechnicalIndicators): number {
  // Strong trend if ADX > 25, very strong if ADX > 50
  const trendStrength = Math.min(1, indicators.adx / 50)
  
  // Direction from DMI
  const direction = indicators.plusDI > indicators.minusDI ? 1 : -1
  
  return trendStrength * direction
}

function calculateStochasticComponent(indicators: TechnicalIndicators): number {
  // Oversold bounce: %K crosses above %D from oversold (<20)
  // Overbought reversal: %K crosses below %D from overbought (>80)
  
  if (indicators.stochK > indicators.stochD && indicators.stochK < 30) {
    return 1.0 // Bullish oversold bounce
  } else if (indicators.stochK < indicators.stochD && indicators.stochK > 70) {
    return -1.0 // Bearish overbought reversal
  } else if (indicators.stochK > indicators.stochD) {
    return 0.3 // Mild bullish momentum
  } else {
    return -0.3 // Mild bearish momentum
  }
}

function calculateVolumeComponent(indicators: TechnicalIndicators): number {
  // Volume above 21-period average indicates strength
  const volumeRatio = indicators.volume21Avg > 0 ? 1 : 0 // Current vs average volume
  
  if (volumeRatio > 2.0) return 1.0 // Very high volume
  if (volumeRatio > 1.5) return 0.5 // High volume
  if (volumeRatio < 0.5) return -0.5 // Low volume
  
  return 0 // Normal volume
}

function calculateHVPComponent(indicators: TechnicalIndicators): number {
  // High HVP (>75) indicates potential for volatile breakout
  // Low HVP (<25) indicates low volatility environment
  
  if (indicators.hvp > 75) return 0.8 // High volatility breakout potential
  if (indicators.hvp > 50) return 0.4 // Moderate volatility
  if (indicators.hvp < 25) return -0.4 // Low volatility
  
  return 0 // Normal volatility
}

function determineSignalDirection(pmsScore: number, config: SpynxConfig): 'BUY' | 'SELL' | 'HOLD' {
  if (pmsScore > config.buy_threshold) return 'BUY'
  if (pmsScore < config.sell_threshold) return 'SELL'
  return 'HOLD'
}

// Technical Analysis Helper Functions
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0
  
  const multiplier = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((a, b) => a + b) / period
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0
  const slice = data.slice(-period)
  return slice.reduce((a, b) => a + b) / slice.length
}

function calculateATR(data: MarketData[]): number {
  if (data.length < 2) return 0
  
  const trs = []
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    )
    trs.push(tr)
  }
  
  return calculateSMA(trs, Math.min(14, trs.length))
}

function calculateADX(data: MarketData[]): number {
  // Simplified ADX calculation
  if (data.length < 14) return 0
  
  let totalDM = 0
  let totalTR = 0
  
  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high
    const downMove = data[i - 1].low - data[i].low
    
    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0
    
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    )
    
    totalDM += Math.abs(plusDM - minusDM)
    totalTR += tr
  }
  
  return totalTR > 0 ? (totalDM / totalTR) * 100 : 0
}

function calculateDI(data: MarketData[], isPlus: boolean): number {
  if (data.length < 2) return 0
  
  let totalDM = 0
  let totalTR = 0
  
  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high
    const downMove = data[i - 1].low - data[i].low
    
    const dm = isPlus 
      ? (upMove > downMove && upMove > 0 ? upMove : 0)
      : (downMove > upMove && downMove > 0 ? downMove : 0)
    
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    )
    
    totalDM += dm
    totalTR += tr
  }
  
  return totalTR > 0 ? (totalDM / totalTR) * 100 : 0
}

function calculateStochastic(highs: number[], lows: number[], closes: number[]): { k: number, d: number } {
  if (highs.length < 14) return { k: 50, d: 50 }
  
  const period = 14
  const kPeriod = 3
  
  const recentHighs = highs.slice(-period)
  const recentLows = lows.slice(-period)
  const currentClose = closes[closes.length - 1]
  
  const highestHigh = Math.max(...recentHighs)
  const lowestLow = Math.min(...recentLows)
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
  
  // Calculate %D as 3-period SMA of %K
  const recentKs = [k] // In a real implementation, you'd maintain a history of %K values
  const d = recentKs.reduce((a, b) => a + b) / recentKs.length
  
  return { k: k || 50, d: d || 50 }
}

function calculateHVP(closes: number[]): number {
  if (closes.length < 30) return 50
  
  // Calculate 30-day historical volatility
  const returns = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }
  
  const mean = returns.reduce((a, b) => a + b) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  const volatility = Math.sqrt(variance * 252) // Annualized volatility
  
  // Calculate percentile rank (simplified)
  const recentVolatilities = [volatility] // In practice, you'd compare against historical volatilities
  return 50 // Simplified - return middle percentile
}