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
  priceChange24h: number
  high24h: number
  low24h: number
  marketCap: number
  circulatingSupply: number
}

interface TechnicalIndicators {
  ema21: number
  ema200: number
  sma50: number
  sma200: number
  rsi: number
  macd: number
  macdSignal: number
  macdHistogram: number
  stochK: number
  stochD: number
  adx: number
  plusDI: number
  minusDI: number
  volumeRatio: number
  bollingerUpper: number
  bollingerLower: number
  bollingerMid: number
}

interface STELSAnalysis {
  maxLeverage: number
  recommendedCapital: number
  riskScore: number
  kellyPercent: number
  volatilityAdjustment: number
  liquidityRisk: number
}

interface EnhancedSignal {
  token: string
  direction: 'BUY' | 'SELL'
  signal_type: string
  timeframe: string
  entry_price: number
  exit_target: number
  stop_loss: number
  leverage: number
  confidence_score: number
  pms_score: number
  quantum_probability: number
  stels_analysis: STELSAnalysis
  trend_projection: string
  volume_strength: number
  roi_projection: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  signal_strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG'
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

    // Fetch enhanced market data
    const marketData = await fetchEnhancedMarketData()
    
    const signals: EnhancedSignal[] = []
    
    for (const data of marketData) {
      const indicators = await calculateAdvancedIndicators(data)
      const stelsAnalysis = await performSTELSAnalysis(data, indicators)
      const quantumProbability = await calculateQuantumProbability(data, indicators)
      
      const signal = await generateEnhancedSignal(data, indicators, stelsAnalysis, quantumProbability)
      
      if (signal && signal.confidence_score > 75) {
        signals.push(signal)
      }
    }

    // Store signals with enhanced data
    if (signals.length > 0) {
      const { data: insertedSignals, error } = await supabase
        .from('signals')
        .insert(signals.map(s => ({
          ...s,
          stels_max_leverage: s.stels_analysis.maxLeverage,
          stels_recommended_capital: s.stels_analysis.recommendedCapital,
          stels_risk_score: s.stels_analysis.riskScore,
          quantum_probability: s.quantum_probability,
          risk_level: s.risk_level,
          signal_strength: s.signal_strength
        })))
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true, 
          signals: insertedSignals.length,
          data: insertedSignals,
          average_confidence: signals.reduce((acc, s) => acc + s.confidence_score, 0) / signals.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, signals: 0, message: 'No high-confidence signals generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchEnhancedMarketData(): Promise<MarketData[]> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h'
  )
  
  if (!response.ok) throw new Error('Failed to fetch market data')
  
  const data = await response.json()
  
  return data.map((coin: any) => ({
    symbol: coin.symbol.toUpperCase() + '/USDT',
    price: coin.current_price,
    volume: coin.total_volume,
    priceChange24h: coin.price_change_percentage_24h || 0,
    high24h: coin.high_24h || coin.current_price * 1.05,
    low24h: coin.low_24h || coin.current_price * 0.95,
    marketCap: coin.market_cap || 0,
    circulatingSupply: coin.circulating_supply || 0
  }))
}

async function calculateAdvancedIndicators(data: MarketData): Promise<TechnicalIndicators> {
  const basePrice = data.price
  const volatility = Math.abs(data.priceChange24h) / 100
  const priceRange = data.high24h - data.low24h
  
  // Advanced indicator calculations (simplified for demo)
  const ema21 = basePrice * (1 + (Math.random() - 0.5) * 0.02)
  const ema200 = basePrice * (1 + (Math.random() - 0.5) * 0.05)
  const sma50 = basePrice * (1 + (Math.random() - 0.5) * 0.03)
  const sma200 = basePrice * (1 + (Math.random() - 0.5) * 0.06)
  
  const rsi = 30 + Math.random() * 40
  const macd = (Math.random() - 0.5) * basePrice * 0.01
  const macdSignal = macd * 0.8 + (Math.random() - 0.5) * basePrice * 0.005
  
  const stochK = Math.random() * 100
  const stochD = stochK * 0.8 + Math.random() * 20
  
  const adx = 20 + Math.random() * 60
  const plusDI = Math.random() * 50
  const minusDI = Math.random() * 50
  
  const bollingerMid = basePrice
  const bollingerUpper = basePrice * (1 + volatility * 2)
  const bollingerLower = basePrice * (1 - volatility * 2)
  
  return {
    ema21,
    ema200,
    sma50,
    sma200,
    rsi,
    macd,
    macdSignal,
    macdHistogram: macd - macdSignal,
    stochK,
    stochD,
    adx,
    plusDI,
    minusDI,
    volumeRatio: 0.5 + Math.random() * 2,
    bollingerUpper,
    bollingerLower,
    bollingerMid
  }
}

async function performSTELSAnalysis(data: MarketData, indicators: TechnicalIndicators): Promise<STELSAnalysis> {
  // STELS (Secure Token Exchange Leverage System) Analysis
  const volatility = Math.abs(data.priceChange24h) / 100
  const liquidityScore = Math.min(1, data.volume / Math.max(data.marketCap, 1))
  
  // Kelly Criterion calculation
  const winRate = Math.min(0.8, 0.5 + (indicators.rsi < 30 ? 0.2 : indicators.rsi > 70 ? -0.2 : 0))
  const avgWin = 0.15 // 15% average win
  const avgLoss = 0.07 // 7% average loss
  const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
  
  // Risk-adjusted leverage calculation
  const baseMaxLeverage = volatility < 0.05 ? 25 : volatility < 0.1 ? 15 : volatility < 0.2 ? 10 : 5
  const liquidityAdjustment = Math.min(1, liquidityScore * 2)
  const maxLeverage = Math.floor(baseMaxLeverage * liquidityAdjustment)
  
  // Recommended capital allocation
  const riskScore = volatility * 100 + (1 - liquidityScore) * 50
  const recommendedCapital = Math.max(0.05, Math.min(0.25, kellyPercent * 0.5)) // 5-25% of portfolio
  
  return {
    maxLeverage: Math.max(1, maxLeverage),
    recommendedCapital,
    riskScore,
    kellyPercent,
    volatilityAdjustment: 1 - volatility,
    liquidityRisk: 1 - liquidityScore
  }
}

async function calculateQuantumProbability(data: MarketData, indicators: TechnicalIndicators): Promise<number> {
  // Simplified quantum Monte Carlo simulation
  const simulations = 1000
  let upMoves = 0
  
  for (let i = 0; i < simulations; i++) {
    const randomWalk = Math.random() - 0.5
    const trendBias = indicators.ema21 > indicators.ema200 ? 0.1 : -0.1
    const volumeBias = indicators.volumeRatio > 1.5 ? 0.05 : -0.05
    const rsiBias = indicators.rsi < 30 ? 0.1 : indicators.rsi > 70 ? -0.1 : 0
    
    const totalBias = trendBias + volumeBias + rsiBias
    const finalMove = randomWalk + totalBias
    
    if (finalMove > 0) upMoves++
  }
  
  return upMoves / simulations
}

async function generateEnhancedSignal(
  data: MarketData, 
  indicators: TechnicalIndicators, 
  stels: STELSAnalysis, 
  quantumProb: number
): Promise<EnhancedSignal | null> {
  
  // Enhanced signal logic combining multiple factors
  const isGoldenCross = indicators.ema21 > indicators.ema200
  const isDeathCross = indicators.ema21 < indicators.ema200
  const isMACDBullish = indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0
  const isMACDBearish = indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0
  const isADXStrong = indicators.adx > 25
  const isDMIBullish = indicators.plusDI > indicators.minusDI
  const isVolumeStrong = indicators.volumeRatio > 1.5
  const isRSIOversold = indicators.rsi < 30
  const isRSIOverbought = indicators.rsi > 70
  const isStochBullish = indicators.stochK > indicators.stochD && indicators.stochK < 80
  const isStochBearish = indicators.stochK < indicators.stochD && indicators.stochK > 20
  const isBollingerSqueeze = (indicators.bollingerUpper - indicators.bollingerLower) / indicators.bollingerMid < 0.1
  
  // Calculate composite scores
  const bullishFactors = [
    isGoldenCross, isMACDBullish, isDMIBullish, isVolumeStrong, 
    isRSIOversold, isStochBullish, quantumProb > 0.6
  ].filter(Boolean).length
  
  const bearishFactors = [
    isDeathCross, isMACDBearish, !isDMIBullish, isRSIOverbought, 
    isStochBearish, quantumProb < 0.4
  ].filter(Boolean).length
  
  // Enhanced PMS calculation
  const pmsScore = (
    0.25 * (isGoldenCross ? 1 : isDeathCross ? -1 : 0) +
    0.20 * (isMACDBullish ? 1 : isMACDBearish ? -1 : 0) +
    0.15 * (isDMIBullish && isADXStrong ? 1 : -1) +
    0.15 * (indicators.volumeRatio - 1) +
    0.10 * (isStochBullish ? 1 : isStochBearish ? -1 : 0) +
    0.10 * (data.priceChange24h / 10) +
    0.05 * (quantumProb - 0.5) * 2
  )
  
  const confidenceScore = Math.min(98, 50 + Math.abs(pmsScore) * 20 + bullishFactors * 5)
  
  // Determine signal strength
  let signalStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK'
  if (confidenceScore > 90) signalStrength = 'VERY_STRONG'
  else if (confidenceScore > 85) signalStrength = 'STRONG'
  else if (confidenceScore > 80) signalStrength = 'MODERATE'
  
  // Risk level assessment
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
  if (stels.riskScore < 30) riskLevel = 'LOW'
  else if (stels.riskScore < 60) riskLevel = 'MEDIUM'
  
  let signal: EnhancedSignal | null = null
  
  // BUY Signal Logic (Enhanced)
  if (bullishFactors >= 4 && pmsScore > 1.5 && quantumProb > 0.6) {
    const roiTarget = Math.min(25, 10 + bullishFactors * 2)
    const stopLossPercent = Math.max(5, 10 - confidenceScore / 10)
    
    signal = {
      token: data.symbol,
      direction: 'BUY',
      signal_type: `Enhanced Multi-Factor Bull Signal (${bullishFactors}/7 factors)`,
      timeframe: '15m',
      entry_price: data.price,
      exit_target: data.price * (1 + roiTarget / 100),
      stop_loss: data.price * (1 - stopLossPercent / 100),
      leverage: stels.maxLeverage,
      confidence_score: confidenceScore,
      pms_score: pmsScore,
      quantum_probability: quantumProb,
      stels_analysis: stels,
      trend_projection: '⬆️',
      volume_strength: indicators.volumeRatio,
      roi_projection: roiTarget,
      risk_level: riskLevel,
      signal_strength: signalStrength
    }
  }
  
  // SELL Signal Logic (Enhanced)
  else if (bearishFactors >= 4 && pmsScore < -1.5 && quantumProb < 0.4) {
    const roiTarget = Math.min(20, 8 + bearishFactors * 2)
    const stopLossPercent = Math.max(5, 10 - confidenceScore / 10)
    
    signal = {
      token: data.symbol,
      direction: 'SELL',
      signal_type: `Enhanced Multi-Factor Bear Signal (${bearishFactors}/6 factors)`,
      timeframe: '15m',
      entry_price: data.price,
      exit_target: data.price * (1 - roiTarget / 100),
      stop_loss: data.price * (1 + stopLossPercent / 100),
      leverage: Math.min(stels.maxLeverage, 15), // Lower leverage for shorts
      confidence_score: confidenceScore,
      pms_score: pmsScore,
      quantum_probability: quantumProb,
      stels_analysis: stels,
      trend_projection: '⬇️',
      volume_strength: indicators.volumeRatio,
      roi_projection: roiTarget,
      risk_level: riskLevel,
      signal_strength: signalStrength
    }
  }
  
  return signal
}