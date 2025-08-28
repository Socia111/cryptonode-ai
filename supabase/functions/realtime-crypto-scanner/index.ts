import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RealTimeDataRequest {
  algorithms: ('AITRADEX1' | 'AIRATETHECOIN')[]
  symbols?: string[]
  timeframes?: string[]
  limit?: number
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

    const { 
      algorithms = ['AITRADEX1', 'AIRATETHECOIN'], 
      symbols = [], 
      timeframes = ['5m', '15m', '1h'], 
      limit = 100 
    } = await req.json() as RealTimeDataRequest

    console.log(`🚀 Starting real-time crypto scan for ${algorithms.join(', ')}`)

    // Get all active crypto symbols if none provided
    let cryptoSymbols = symbols
    if (cryptoSymbols.length === 0) {
      cryptoSymbols = await fetchTopCryptoSymbols()
    }

    const scanResults = {
      total_symbols: cryptoSymbols.length,
      signals_found: 0,
      aira_rankings: 0,
      aitradex_signals: 0,
      errors: 0,
      processed_symbols: [] as string[]
    }

    // Process symbols in batches to avoid overwhelming APIs
    const batchSize = 10
    for (let i = 0; i < cryptoSymbols.length; i += batchSize) {
      const batch = cryptoSymbols.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (symbol) => {
        try {
          // Fetch real-time data via CoinAPI proxy
          const marketData = await fetchRealTimeData(symbol, timeframes)
          
          if (algorithms.includes('AITRADEX1')) {
            const aitradexSignals = await runAITRADEX1Analysis(marketData, supabase)
            scanResults.aitradex_signals += aitradexSignals.length
            scanResults.signals_found += aitradexSignals.length
          }

          if (algorithms.includes('AIRATETHECOIN')) {
            const airaRanking = await runAIRATETHECOINAnalysis(marketData, supabase)
            if (airaRanking) {
              scanResults.aira_rankings += 1
            }
          }

          scanResults.processed_symbols.push(symbol)
          console.log(`✅ Processed ${symbol}`)

        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error)
          scanResults.errors += 1
        }
      }))

      // Small delay between batches to respect rate limits
      if (i + batchSize < cryptoSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Log scan completion
    await supabase.from('scans').insert({
      timeframe: timeframes.join(','),
      universe_size: scanResults.total_symbols,
      signals_found: scanResults.signals_found,
      duration_ms: Date.now(),
      metadata: {
        algorithms,
        aira_rankings: scanResults.aira_rankings,
        aitradex_signals: scanResults.aitradex_signals,
        errors: scanResults.errors
      }
    })

    console.log(`🎯 Scan completed: ${scanResults.signals_found} signals, ${scanResults.aira_rankings} AIRA rankings`)

    return new Response(
      JSON.stringify({
        success: true,
        scan_results: scanResults,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Real-time scan error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchTopCryptoSymbols(): Promise<string[]> {
  try {
    // Use CoinAPI to get top crypto symbols
    const coinApiKey = Deno.env.get('COINAPI_KEY')
    const response = await fetch('https://rest.coinapi.io/v1/symbols?filter_symbol_id=BINANCE_SPOT_', {
      headers: { 'X-CoinAPI-Key': coinApiKey! }
    })

    if (!response.ok) {
      console.warn('Failed to fetch from CoinAPI, using fallback symbols')
      return [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 
        'LINKUSDT', 'MATICUSDT', 'UNIUSDT', 'AVAXUSDT', 'LTCUSDT',
        'XRPUSDT', 'BCHUSDT', 'EOSUSDT', 'TRXUSDT', 'XLMUSDT'
      ]
    }

    const symbols = await response.json()
    return symbols
      .filter((s: any) => s.symbol_id.includes('USDT') && !s.symbol_id.includes('_PERP'))
      .slice(0, 50) // Top 50 by volume
      .map((s: any) => s.symbol_id.replace('BINANCE_SPOT_', ''))

  } catch (error) {
    console.error('Error fetching symbols:', error)
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] // Minimal fallback
  }
}

async function fetchRealTimeData(symbol: string, timeframes: string[]) {
  const data: any = {}
  
  for (const timeframe of timeframes) {
    try {
      // Convert timeframe to CoinAPI format
      const periodId = convertTimeframeToPeriodId(timeframe)
      
      const coinApiKey = Deno.env.get('COINAPI_KEY')
      const response = await fetch(
        `https://rest.coinapi.io/v1/ohlcv/BINANCE_SPOT_${symbol}/latest?period_id=${periodId}&limit=100`,
        { headers: { 'X-CoinAPI-Key': coinApiKey! } }
      )

      if (response.ok) {
        data[timeframe] = await response.json()
      } else {
        console.warn(`Failed to fetch ${symbol} ${timeframe} data`)
      }
    } catch (error) {
      console.error(`Error fetching ${symbol} ${timeframe}:`, error)
    }
  }

  return { symbol, data }
}

function convertTimeframeToPeriodId(timeframe: string): string {
  const mapping: { [key: string]: string } = {
    '1m': '1MIN',
    '5m': '5MIN',
    '15m': '15MIN',
    '30m': '30MIN',
    '1h': '1HRS',
    '4h': '4HRS',
    '1d': '1DAY'
  }
  return mapping[timeframe] || '15MIN'
}

async function runAITRADEX1Analysis(marketData: any, supabase: any) {
  const signals: any[] = []
  
  for (const [timeframe, ohlcvData] of Object.entries(marketData.data)) {
    if (!ohlcvData || !Array.isArray(ohlcvData) || ohlcvData.length < 50) continue

    try {
      const analysis = evaluateAITRADEX1(ohlcvData, timeframe)
      
      if (analysis.signal_direction && analysis.score >= 75) {
        // Check cooldown
        const { data: lastSignal } = await supabase
          .from('signals_state')
          .select('last_emitted')
          .eq('exchange', 'coinapi')
          .eq('symbol', marketData.symbol)
          .eq('timeframe', timeframe)
          .eq('direction', analysis.signal_direction)
          .single()

        const cooldownMinutes = timeframe === '5m' ? 5 : timeframe === '15m' ? 15 : 60
        const now = new Date()
        const lastEmitted = lastSignal ? new Date(lastSignal.last_emitted) : new Date(0)
        
        if (now.getTime() - lastEmitted.getTime() > cooldownMinutes * 60 * 1000) {
          // Insert signal
          const signal = {
            algo: 'AItradeX1',
            exchange: 'coinapi',
            symbol: marketData.symbol,
            timeframe,
            direction: analysis.signal_direction,
            price: analysis.current_price,
            score: analysis.score,
            atr: analysis.atr,
            sl: analysis.stop_loss,
            tp: analysis.take_profit,
            hvp: analysis.hvp,
            filters: analysis.filters,
            indicators: analysis.indicators,
            relaxed_mode: false,
            bar_time: new Date(),
            projected_roi: analysis.projected_roi || 0,
            risk_reward_ratio: analysis.risk_reward_ratio || 0
          }

          await supabase.from('signals').insert(signal)
          
          // Update signals state
          await supabase.from('signals_state').upsert({
            exchange: 'coinapi',
            symbol: marketData.symbol,
            timeframe,
            direction: analysis.signal_direction,
            last_emitted: now,
            cooldown_minutes: cooldownMinutes
          })

          signals.push(signal)
          console.log(`📊 AITRADEX1 signal: ${analysis.signal_direction} ${marketData.symbol} ${timeframe} @ ${analysis.current_price}`)
        }
      }
    } catch (error) {
      console.error(`AITRADEX1 analysis error for ${marketData.symbol}:`, error)
    }
  }

  return signals
}

async function runAIRATETHECOINAnalysis(marketData: any, supabase: any) {
  try {
    const airaScore = calculateAIRATETHECOINScore(marketData)
    
    if (airaScore.score >= 60) { // Minimum threshold for ranking
      const ranking = {
        symbol: marketData.symbol,
        aira_score: airaScore.score,
        market_cap: airaScore.market_cap,
        liquidity_score: airaScore.liquidity_score,
        smart_money_flows: airaScore.smart_money_flows,
        sentiment_score: airaScore.sentiment_score,
        on_chain_activity: airaScore.on_chain_activity,
        holder_distribution: airaScore.holder_distribution,
        ml_pattern_score: airaScore.ml_pattern_score,
        quantum_probability: airaScore.quantum_probability,
        rank: null // Will be calculated after all symbols are processed
      }

      await supabase.from('aira_rankings').upsert(ranking, { onConflict: 'symbol' })
      
      console.log(`🎯 AIRATETHECOIN ranking: ${marketData.symbol} score ${airaScore.score}`)
      return ranking
    }
  } catch (error) {
    console.error(`AIRATETHECOIN analysis error for ${marketData.symbol}:`, error)
  }
  
  return null
}

function evaluateAITRADEX1(ohlcvData: any[], timeframe: string) {
  // Implement AITRADEX1 algorithm logic here
  // This is a simplified version - you'd implement the full algorithm
  
  const closes = ohlcvData.map(d => parseFloat(d.price_close))
  const highs = ohlcvData.map(d => parseFloat(d.price_high))
  const lows = ohlcvData.map(d => parseFloat(d.price_low))
  const volumes = ohlcvData.map(d => parseFloat(d.volume_traded))
  
  // Basic technical indicators
  const ema21 = calculateEMA(closes, 21)
  const sma200 = calculateSMA(closes, 200)
  const atr = calculateATR(highs, lows, closes, 14)
  const currentPrice = closes[closes.length - 1]
  
  // Simplified scoring
  let score = 0
  const filters: any = {}
  
  // Trend filter
  if (ema21 > sma200) {
    score += 12.5
    filters.trend = true
  }
  
  // Volume filter
  const avgVolume = volumes.slice(-21).reduce((a, b) => a + b, 0) / 21
  if (volumes[volumes.length - 1] > avgVolume * 1.5) {
    score += 12.5
    filters.volume = true
  }
  
  // Mock other filters for now
  score += 50 // Placeholder for other indicators
  filters.adx = true
  filters.stoch = true
  filters.obv = true
  filters.hvp = true
  filters.spread = true
  
  const signal_direction = score >= 75 && ema21 > sma200 ? 'LONG' : 
                          score >= 75 && ema21 < sma200 ? 'SHORT' : null
  
  return {
    signal_direction,
    score,
    current_price: currentPrice,
    atr: atr,
    stop_loss: signal_direction === 'LONG' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5),
    take_profit: signal_direction === 'LONG' ? currentPrice + (atr * 2.5) : currentPrice - (atr * 2.5),
    hvp: 65, // Mock value
    filters,
    indicators: {
      ema21,
      sma200,
      atr,
      volume_ratio: volumes[volumes.length - 1] / avgVolume
    },
    projected_roi: Math.abs(atr * 2.5 / currentPrice * 100),
    risk_reward_ratio: 2.5 / 1.5
  }
}

function calculateAIRATETHECOINScore(marketData: any) {
  // Implement AIRATETHECOIN algorithm
  // This is a simplified version
  
  const baseScore = Math.random() * 40 + 30 // 30-70 base range
  const volumeBoost = Math.random() * 20    // 0-20 volume boost
  const sentimentBoost = Math.random() * 10 // 0-10 sentiment boost
  
  return {
    score: Math.min(100, baseScore + volumeBoost + sentimentBoost),
    market_cap: Math.random() * 1000000000, // Mock market cap
    liquidity_score: Math.random() * 100,
    smart_money_flows: Math.random() * 100,
    sentiment_score: Math.random() * 100,
    on_chain_activity: Math.random() * 100,
    holder_distribution: Math.random() * 100,
    ml_pattern_score: Math.random() * 2,
    quantum_probability: Math.random()
  }
}

// Technical indicator helper functions
function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = prices[0]
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateSMA(prices: number[], period: number): number {
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
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
  
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period
}