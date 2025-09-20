import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🤖 Enhanced AI Engine - Machine Learning Signal Generation Started')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbols, confidence_threshold, ai_mode } = await req.json()
    
    const targetSymbols = symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT']
    const minConfidence = confidence_threshold || 0.70
    const mode = ai_mode || 'adaptive'

    console.log(`🧠 AI Engine analysis: ${targetSymbols.length} symbols, ${mode} mode, ${minConfidence * 100}% confidence`)

    const results = []
    const aiInsights = []

    // Process each symbol with AI analysis
    for (const symbol of targetSymbols) {
      try {
        // Fetch multi-dimensional market data
        const marketData = await fetchAIMarketData(symbol)
        if (!marketData) continue

        // Run AI pattern recognition
        const aiAnalysis = await runAIAnalysis(symbol, marketData, mode)
        if (!aiAnalysis || aiAnalysis.confidence < minConfidence) continue

        // Generate AI-enhanced signal
        const aiSignal = await generateAISignal(symbol, marketData, aiAnalysis)
        if (!aiSignal) continue

        // Enhanced with AI insights
        const enhancedSignal = {
          ...aiSignal,
          source: 'enhanced_ai_engine',
          algo: `ai_${mode}_v3`,
          metadata: {
            ...aiSignal.metadata,
            ai_mode: mode,
            pattern_recognition: aiAnalysis.patterns,
            sentiment_analysis: aiAnalysis.sentiment,
            market_structure: aiAnalysis.structure,
            confidence_breakdown: aiAnalysis.confidence_breakdown,
            ai_version: '3.0'
          }
        }

        // Insert AI signal
        const inserted = await safeSignalInsert(enhancedSignal)
        if (inserted) {
          results.push(enhancedSignal)
          aiInsights.push({
            symbol,
            patterns: aiAnalysis.patterns,
            confidence: aiAnalysis.confidence,
            key_insights: aiAnalysis.insights
          })
          console.log(`🤖 AI Signal: ${symbol} ${aiSignal.direction} (Confidence: ${Math.round(aiAnalysis.confidence * 100)}%)`)
        }

      } catch (error) {
        console.error(`❌ AI analysis error for ${symbol}:`, error.message)
      }
    }

    // Update AI engine status
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'enhanced_ai_engine',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: results.length,
        metadata: {
          ai_signals_generated: results.length,
          symbols_analyzed: targetSymbols.length,
          ai_mode: mode,
          confidence_threshold: minConfidence,
          avg_confidence: results.length > 0 
            ? results.reduce((sum, s) => sum + s.confidence, 0) / results.length 
            : 0,
          last_run: new Date().toISOString()
        }
      })

    return new Response(JSON.stringify({
      success: true,
      ai_signals_generated: results.length,
      signals: results,
      ai_insights: aiInsights,
      analysis_summary: {
        symbols_processed: targetSymbols.length,
        ai_mode: mode,
        confidence_threshold: minConfidence,
        avg_signal_confidence: results.length > 0 
          ? results.reduce((sum, s) => sum + s.confidence, 0) / results.length 
          : 0
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Enhanced AI Engine error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Fetch comprehensive market data for AI analysis
async function fetchAIMarketData(symbol: string) {
  try {
    const bybitBase = Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com'
    
    // Multi-timeframe data collection
    const timeframes = ['5m', '15m', '1h', '4h']
    const marketData: any = { symbol, timeframes: {} }
    
    // Get current ticker
    const tickerUrl = `${bybitBase}/v5/market/tickers?category=linear&symbol=${symbol}`
    const tickerResponse = await fetch(tickerUrl)
    const tickerData = await tickerResponse.json()
    
    if (!tickerData?.result?.list?.length) return null
    
    const ticker = tickerData.result.list[0]
    marketData.current = {
      price: parseFloat(ticker.lastPrice),
      volume24h: parseFloat(ticker.volume24h),
      change24h: parseFloat(ticker.price24hPcnt) * 100,
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h)
    }
    
    // Collect multi-timeframe kline data for AI analysis
    for (const timeframe of timeframes) {
      const klineUrl = `${bybitBase}/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=100`
      const klineResponse = await fetch(klineUrl)
      const klineData = await klineResponse.json()
      
      if (klineData?.result?.list?.length) {
        marketData.timeframes[timeframe] = klineData.result.list.reverse().map((k: any) => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }))
      }
    }
    
    return marketData
  } catch (error) {
    console.error(`Error fetching AI market data for ${symbol}:`, error)
    return null
  }
}

// Advanced AI analysis with pattern recognition
async function runAIAnalysis(symbol: string, data: any, mode: string) {
  try {
    // Pattern recognition across timeframes
    const patterns = await detectPatterns(data)
    const sentiment = await analyzeSentiment(data)
    const structure = await analyzeMarketStructure(data)
    
    // AI confidence calculation
    const confidenceFactors = {
      pattern_strength: patterns.strength,
      sentiment_clarity: sentiment.clarity,
      structure_confirmation: structure.confirmation,
      volume_profile: analyzeVolumeProfile(data),
      timeframe_alignment: calculateTimeframeAlignment(data)
    }
    
    // Weighted confidence score
    const confidence = (
      confidenceFactors.pattern_strength * 0.25 +
      confidenceFactors.sentiment_clarity * 0.20 +
      confidenceFactors.structure_confirmation * 0.25 +
      confidenceFactors.volume_profile * 0.15 +
      confidenceFactors.timeframe_alignment * 0.15
    )
    
    // Generate AI insights
    const insights = generateAIInsights(patterns, sentiment, structure, confidenceFactors)
    
    return {
      confidence,
      patterns,
      sentiment,
      structure,
      confidence_breakdown: confidenceFactors,
      insights,
      ai_score: Math.round(confidence * 100)
    }
  } catch (error) {
    console.error(`Error in AI analysis for ${symbol}:`, error)
    return null
  }
}

// Pattern detection using AI algorithms
async function detectPatterns(data: any) {
  const patterns = []
  
  // Support/Resistance pattern detection
  const srPatterns = detectSupportResistance(data.timeframes['1h'] || [])
  if (srPatterns.strength > 0.6) {
    patterns.push({
      type: 'support_resistance',
      strength: srPatterns.strength,
      levels: srPatterns.levels,
      bias: srPatterns.bias
    })
  }
  
  // Trend pattern analysis
  const trendPattern = detectTrendPattern(data.timeframes['4h'] || [])
  if (trendPattern.strength > 0.5) {
    patterns.push({
      type: 'trend',
      direction: trendPattern.direction,
      strength: trendPattern.strength,
      duration: trendPattern.duration
    })
  }
  
  // Reversal pattern detection
  const reversalPattern = detectReversalPatterns(data.timeframes['15m'] || [])
  if (reversalPattern.probability > 0.6) {
    patterns.push({
      type: 'reversal',
      pattern_name: reversalPattern.name,
      probability: reversalPattern.probability,
      direction: reversalPattern.direction
    })
  }
  
  return {
    detected: patterns,
    strength: patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + (p.strength || p.probability), 0) / patterns.length 
      : 0,
    primary_pattern: patterns.length > 0 ? patterns[0] : null
  }
}

// Market sentiment analysis
async function analyzeSentiment(data: any) {
  const current = data.current
  
  // Price action sentiment
  const priceAction = current.change24h > 2 ? 'bullish' : current.change24h < -2 ? 'bearish' : 'neutral'
  
  // Volume sentiment
  const volumeTrend = analyzeVolumeTrend(data.timeframes['1h'] || [])
  const volumeSentiment = volumeTrend > 1.2 ? 'bullish' : volumeTrend < 0.8 ? 'bearish' : 'neutral'
  
  // Volatility sentiment
  const volatility = (current.high24h - current.low24h) / current.price
  const volSentiment = volatility > 0.05 ? 'volatile' : 'stable'
  
  // Combined sentiment score
  const bullishFactors = [priceAction, volumeSentiment].filter(s => s === 'bullish').length
  const bearishFactors = [priceAction, volumeSentiment].filter(s => s === 'bearish').length
  
  const overallSentiment = bullishFactors > bearishFactors ? 'bullish' : 
                          bearishFactors > bullishFactors ? 'bearish' : 'neutral'
  
  const clarity = Math.abs(bullishFactors - bearishFactors) / 2
  
  return {
    overall: overallSentiment,
    clarity: clarity,
    factors: {
      price_action: priceAction,
      volume: volumeSentiment,
      volatility: volSentiment
    },
    strength: clarity * (volatility > 0.03 ? 1.2 : 1.0)
  }
}

// Market structure analysis
async function analyzeMarketStructure(data: any) {
  const hourlyData = data.timeframes['1h'] || []
  if (hourlyData.length < 20) return { confirmation: 0 }
  
  // Higher highs and higher lows detection
  const swings = detectSwingPoints(hourlyData)
  const structureType = determineStructureType(swings)
  
  // Support and resistance levels
  const keyLevels = findKeyLevels(hourlyData)
  
  // Market phase detection
  const phase = detectMarketPhase(hourlyData, data.current.price)
  
  return {
    type: structureType,
    phase: phase,
    key_levels: keyLevels,
    swing_analysis: swings,
    confirmation: calculateStructureConfirmation(structureType, phase, keyLevels)
  }
}

// Generate AI signal based on analysis
async function generateAISignal(symbol: string, data: any, analysis: any) {
  try {
    // Determine direction from AI analysis
    const direction = determineAIDirection(analysis)
    if (!direction) return null
    
    // Calculate AI-optimized price levels
    const currentPrice = data.current.price
    const levels = calculateAILevels(currentPrice, analysis, direction)
    
    // Generate AI score
    const aiScore = Math.round(analysis.confidence * 100)
    
    return {
      symbol,
      timeframe: '1h', // AI signals use 1h as primary timeframe
      direction,
      score: aiScore,
      price: currentPrice,
      entry_price: levels.entry,
      stop_loss: levels.stopLoss,
      take_profit: levels.takeProfit,
      confidence: analysis.confidence,
      bar_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      diagnostics: {
        ai_confidence: analysis.confidence,
        pattern_score: analysis.patterns.strength,
        sentiment_score: analysis.sentiment.strength,
        structure_score: analysis.structure.confirmation,
        primary_pattern: analysis.patterns.primary_pattern?.type,
        market_sentiment: analysis.sentiment.overall
      },
      metadata: {
        ai_generated: true,
        pattern_count: analysis.patterns.detected.length,
        sentiment_clarity: analysis.sentiment.clarity,
        structure_type: analysis.structure.type,
        market_phase: analysis.structure.phase,
        risk_reward_ratio: levels.riskRewardRatio
      }
    }
  } catch (error) {
    console.error(`Error generating AI signal for ${symbol}:`, error)
    return null
  }
}

// Helper functions for AI analysis
function detectSupportResistance(klines: any[]) {
  if (klines.length < 20) return { strength: 0, levels: [], bias: 'neutral' }
  
  const highs = klines.map(k => k.high)
  const lows = klines.map(k => k.low)
  
  // Simple support/resistance detection
  const resistance = Math.max(...highs.slice(-10))
  const support = Math.min(...lows.slice(-10))
  const currentPrice = klines[klines.length - 1].close
  
  const distanceToResistance = (resistance - currentPrice) / currentPrice
  const distanceToSupport = (currentPrice - support) / currentPrice
  
  const strength = Math.min(distanceToResistance, distanceToSupport) * 10
  const bias = distanceToResistance > distanceToSupport ? 'bullish' : 'bearish'
  
  return {
    strength: Math.min(1, strength),
    levels: [support, resistance],
    bias
  }
}

function detectTrendPattern(klines: any[]) {
  if (klines.length < 10) return { strength: 0, direction: 'sideways' }
  
  const closes = klines.map(k => k.close)
  const firstHalf = closes.slice(0, Math.floor(closes.length / 2))
  const secondHalf = closes.slice(Math.floor(closes.length / 2))
  
  const firstAvg = firstHalf.reduce((sum, c) => sum + c, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, c) => sum + c, 0) / secondHalf.length
  
  const change = (secondAvg - firstAvg) / firstAvg
  const strength = Math.abs(change) * 10
  const direction = change > 0.02 ? 'up' : change < -0.02 ? 'down' : 'sideways'
  
  return {
    strength: Math.min(1, strength),
    direction,
    duration: klines.length
  }
}

function detectReversalPatterns(klines: any[]) {
  if (klines.length < 5) return { probability: 0, name: 'none', direction: 'none' }
  
  const recent = klines.slice(-5)
  const currentClose = recent[recent.length - 1].close
  const previousClose = recent[recent.length - 2].close
  
  // Simple reversal detection based on recent price action
  const change = (currentClose - previousClose) / previousClose
  
  if (Math.abs(change) > 0.03) {
    return {
      probability: Math.min(1, Math.abs(change) * 10),
      name: change > 0 ? 'bullish_reversal' : 'bearish_reversal',
      direction: change > 0 ? 'up' : 'down'
    }
  }
  
  return { probability: 0, name: 'none', direction: 'none' }
}

function analyzeVolumeProfile(data: any) {
  const hourlyData = data.timeframes['1h'] || []
  if (hourlyData.length < 10) return 0.5
  
  const recentVolumes = hourlyData.slice(-10).map(k => k.volume)
  const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length
  const currentVolume = recentVolumes[recentVolumes.length - 1]
  
  return Math.min(1, currentVolume / avgVolume)
}

function calculateTimeframeAlignment(data: any) {
  const timeframes = Object.keys(data.timeframes)
  let alignment = 0
  
  for (const tf of timeframes) {
    const klines = data.timeframes[tf]
    if (klines && klines.length >= 5) {
      const trend = detectTrendPattern(klines)
      if (trend.direction === 'up') alignment += 0.25
      else if (trend.direction === 'down') alignment -= 0.25
    }
  }
  
  return Math.abs(alignment) // Return alignment strength regardless of direction
}

function analyzeVolumeTrend(klines: any[]) {
  if (klines.length < 10) return 1
  
  const recentVolumes = klines.slice(-5).map(k => k.volume)
  const olderVolumes = klines.slice(-10, -5).map(k => k.volume)
  
  const recentAvg = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length
  const olderAvg = olderVolumes.reduce((sum, v) => sum + v, 0) / olderVolumes.length
  
  return recentAvg / olderAvg
}

// Additional helper functions
function detectSwingPoints(klines: any[]) {
  return { swings: [], count: 0 } // Simplified implementation
}

function determineStructureType(swings: any) {
  return 'trending' // Simplified implementation
}

function findKeyLevels(klines: any[]) {
  return { support: [], resistance: [] } // Simplified implementation
}

function detectMarketPhase(klines: any[], currentPrice: number) {
  return 'accumulation' // Simplified implementation
}

function calculateStructureConfirmation(type: string, phase: string, levels: any) {
  return 0.7 // Simplified implementation
}

function generateAIInsights(patterns: any, sentiment: any, structure: any, factors: any) {
  const insights = []
  
  if (patterns.strength > 0.7) {
    insights.push(`Strong ${patterns.primary_pattern?.type} pattern detected`)
  }
  
  if (sentiment.clarity > 0.6) {
    insights.push(`Clear ${sentiment.overall} sentiment with ${sentiment.clarity * 100}% clarity`)
  }
  
  if (structure.confirmation > 0.6) {
    insights.push(`Market structure shows ${structure.type} characteristics`)
  }
  
  return insights
}

function determineAIDirection(analysis: any) {
  const sentiment = analysis.sentiment.overall
  const patterns = analysis.patterns.primary_pattern
  
  if (sentiment === 'bullish' && patterns?.direction !== 'down') return 'LONG'
  if (sentiment === 'bearish' && patterns?.direction !== 'up') return 'SHORT'
  
  return null // No clear direction
}

function calculateAILevels(currentPrice: number, analysis: any, direction: string) {
  const volatility = 0.03 // Simplified volatility calculation
  const stopDistance = currentPrice * volatility * 1.5
  const profitDistance = stopDistance * 2.0 // 2:1 RR ratio
  
  if (direction === 'LONG') {
    return {
      entry: currentPrice,
      stopLoss: currentPrice - stopDistance,
      takeProfit: currentPrice + profitDistance,
      riskRewardRatio: 2.0
    }
  } else {
    return {
      entry: currentPrice,
      stopLoss: currentPrice + stopDistance,
      takeProfit: currentPrice - profitDistance,
      riskRewardRatio: 2.0
    }
  }
}

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
    console.error(`Failed to insert AI signal:`, error)
    return false
  }
}