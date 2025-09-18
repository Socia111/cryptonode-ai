import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[AItradeX1-Enhanced] Starting enhanced scanner...')

    const body = await req.json().catch(() => ({}))
    const symbols = body.symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT']
    
    console.log(`[AItradeX1-Enhanced] Scanning ${symbols.length} symbols...`)

    const signals = []
    const timeframes = ['15m', '30m', '1h']

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          // Fetch real market data from Bybit
          const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
          const data = await response.json()
          
          if (data.result?.list?.[0]) {
            const ticker = data.result.list[0]
            const price = parseFloat(ticker.lastPrice)
            const change24h = parseFloat(ticker.price24hPcnt) * 100
            const volume = parseFloat(ticker.volume24h)
            
            // Enhanced signal generation logic
            const signal = await generateEnhancedSignal(symbol, price, change24h, volume, timeframe)
            
            if (signal && signal.score >= 75) {
              signals.push(signal)
              console.log(`✅ Generated signal: ${symbol} ${signal.direction} (${signal.score}%)`)
            }
          }
        } catch (err) {
          console.error(`Error processing ${symbol}:`, err.message)
        }
      }
    }

    // Store signals in database
    if (signals.length > 0) {
      const { data: insertedSignals, error } = await supabase
        .from('signals')
        .insert(signals)
        .select()

      if (error) {
        console.error('[AItradeX1-Enhanced] Insert error:', error)
        throw error
      }

      console.log(`[AItradeX1-Enhanced] Successfully inserted ${insertedSignals.length} signals`)
    }

    // Update exchange feed status
    await supabase
      .from('exchange_feed_status')
      .upsert({
        exchange: 'bybit',
        status: 'active',
        last_update: new Date().toISOString(),
        symbols_tracked: symbols.length,
        error_count: 0
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `AItradeX1 Enhanced Scanner completed`,
        symbols_scanned: symbols.length,
        timeframes_scanned: timeframes.length,
        signals_generated: signals.length,
        signals: signals.slice(0, 10) // Return first 10 for preview
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[AItradeX1-Enhanced] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateEnhancedSignal(symbol: string, price: number, change24h: number, volume: number, timeframe: string) {
  // Enhanced technical analysis
  const volatility = Math.abs(change24h)
  const momentum = change24h > 0 ? 1 : -1
  
  // Volume analysis
  const volumeScore = Math.min(100, Math.log10(volume) * 10)
  
  // Price action analysis
  const trendStrength = Math.min(100, volatility * 5)
  
  // RSI simulation (simplified)
  const rsi = 50 + change24h * 2 + (Math.random() - 0.5) * 20
  
  // MACD simulation 
  const macd = change24h * 0.1 + (Math.random() - 0.5) * 0.5
  
  // Combine factors for signal strength
  const technicalScore = (
    (rsi < 30 ? 20 : rsi > 70 ? -20 : 0) + // RSI contribution
    (macd > 0 ? 15 : -15) + // MACD contribution
    (volumeScore > 50 ? 10 : -5) + // Volume contribution
    (Math.abs(change24h) > 2 ? 15 : 5) // Momentum contribution
  )
  
  const baseScore = 50 + technicalScore + (Math.random() * 20 - 10) // Add some randomness
  const finalScore = Math.max(0, Math.min(100, baseScore))
  
  // Only generate signals with decent scores
  if (finalScore < 75) return null
  
  // Determine direction
  const direction = momentum > 0 && rsi < 70 ? 'LONG' : momentum < 0 && rsi > 30 ? 'SHORT' : null
  if (!direction) return null
  
  // Calculate targets
  const entryPrice = price
  const stopLossPercent = Math.max(2, Math.min(8, 10 - finalScore / 12.5)) // 2-8% based on confidence
  const takeProfitPercent = Math.max(5, Math.min(20, finalScore / 5)) // 5-20% based on confidence
  
  const stopLoss = direction === 'LONG' 
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100)
    
  const takeProfit = direction === 'LONG'
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100)

  return {
    symbol,
    timeframe,
    direction,
    price: entryPrice,
    entry_price: entryPrice,
    take_profit: takeProfit,
    stop_loss: stopLoss,
    score: Math.round(finalScore),
    confidence: finalScore / 100,
    source: 'aitradex1_enhanced',
    algo: 'aitradex1_enhanced_v2',
    exchange: 'bybit',
    side: direction === 'LONG' ? 'BUY' : 'SELL',
    signal_type: 'technical_analysis',
    signal_grade: finalScore > 90 ? 'A+' : finalScore > 85 ? 'A' : finalScore > 80 ? 'B+' : 'B',
    is_active: true,
    metadata: {
      change_24h: change24h,
      volume_24h: volume,
      rsi_simulated: rsi,
      macd_simulated: macd,
      volume_score: volumeScore,
      trend_strength: trendStrength,
      volatility: volatility,
      technical_score: technicalScore,
      stop_loss_percent: stopLossPercent,
      take_profit_percent: takeProfitPercent,
      scanner_version: 'enhanced_v2'
    },
    bar_time: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}