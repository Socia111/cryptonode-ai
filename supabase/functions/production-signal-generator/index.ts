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

    console.log('🎯 Production Signal Generator started')
    
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ]
    
    const signals = []
    let marketPairsAnalyzed = 0

    for (const symbol of symbols) {
      try {
        // Fetch comprehensive market data
        const [tickerResponse, candleResponse] = await Promise.all([
          fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`),
          fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1h&limit=100`)
        ])

        const [tickerData, candleData] = await Promise.all([
          tickerResponse.json(),
          candleResponse.json()
        ])

        if (tickerData?.result?.list?.[0] && candleData?.result?.list?.length > 0) {
          const ticker = tickerData.result.list[0]
          const candles = candleData.result.list.reverse()
          
          const signal = await analyzeAndCreateSignal(symbol, ticker, candles, supabaseClient)
          if (signal) {
            signals.push(signal)
          }
          
          marketPairsAnalyzed++
        }
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error)
      }
    }

    console.log(`✅ Generated ${signals.length} production signals from ${marketPairsAnalyzed} pairs`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        market_pairs_analyzed: marketPairsAnalyzed,
        signals: signals.slice(0, 5), // Return first 5 for preview
        algorithm: 'production_grade',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Production signal generator error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function analyzeAndCreateSignal(symbol: string, ticker: any, candles: any[], supabaseClient: any) {
  try {
    const closes = candles.slice(-50).map((c: any) => parseFloat(c[4]))
    const highs = candles.slice(-50).map((c: any) => parseFloat(c[2]))
    const lows = candles.slice(-50).map((c: any) => parseFloat(c[3]))
    const volumes = candles.slice(-50).map((c: any) => parseFloat(c[5]))
    
    if (closes.length < 21) return null
    
    const currentPrice = parseFloat(ticker.lastPrice)
    const volume24h = parseFloat(ticker.volume24h || 0)
    const change24h = parseFloat(ticker.price24hPcnt || 0) * 100
    
    // Advanced technical analysis
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    const rsi = calculateRSI(closes, 14)
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length
    const volumeRatio = volume24h / avgVolume
    
    // Multi-factor scoring system
    let score = 50
    let direction = null
    
    // Trend analysis
    const trendUp = ema21 > ema50 && currentPrice > ema21
    const trendDown = ema21 < ema50 && currentPrice < ema21
    
    if (trendUp) {
      score += 15
      direction = 'LONG'
    } else if (trendDown) {
      score += 15
      direction = 'SHORT'
    }
    
    // RSI momentum
    if (direction === 'LONG' && rsi > 30 && rsi < 70) score += 10
    if (direction === 'SHORT' && rsi > 30 && rsi < 70) score += 10
    
    // Volume confirmation
    if (volumeRatio > 1.2) score += 10
    if (volumeRatio > 1.5) score += 5
    
    // Price momentum
    if (Math.abs(change24h) > 2) score += 5
    if (Math.abs(change24h) > 5) score += 5
    
    // Volatility check
    const volatility = calculateVolatility(closes, 20)
    if (volatility > 0.02 && volatility < 0.08) score += 10
    
    // Only create high-quality signals
    if (!direction || score < 70) return null
    
    const signal = {
      symbol,
      timeframe: '1h',
      direction,
      price: currentPrice,
      entry_price: currentPrice,
      stop_loss: direction === 'LONG' ? currentPrice * 0.97 : currentPrice * 1.03,
      take_profit: direction === 'LONG' ? currentPrice * 1.06 : currentPrice * 0.94,
      score,
      source: 'production_signal_generator',
      algo: 'production_grade',
      is_active: true,
      metadata: {
        ema21: ema21.toFixed(2),
        ema50: ema50.toFixed(2),
        rsi: rsi.toFixed(2),
        volume_ratio: volumeRatio.toFixed(2),
        volatility: volatility.toFixed(4),
        change_24h: change24h.toFixed(2),
        grade: score >= 85 ? 'A' : score >= 75 ? 'B' : 'C'
      }
    }
    
    // Insert signal
    const { error } = await supabaseClient
      .from('signals')
      .insert(signal)
    
    if (error && !error.message.includes('duplicate')) {
      console.error('Error inserting signal:', error)
      return null
    }
    
    return signal
  } catch (error) {
    console.error('Error in signal analysis:', error)
    return null
  }
}

function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
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

function calculateVolatility(values: number[], period: number): number {
  const returns = []
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1])
  }
  
  const recentReturns = returns.slice(-period)
  const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length
  const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length
  
  return Math.sqrt(variance)
}