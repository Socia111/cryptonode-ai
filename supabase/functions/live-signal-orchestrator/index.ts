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

    console.log('🚀 Starting live signal orchestrator...')

    // Clear any mock/demo data first
    const { error: clearError } = await supabase
      .from('signals')
      .delete()
      .in('source', ['demo', 'mock', 'ccxt'])
      .not('metadata', 'is', null)
      .filter('metadata->demo', 'eq', 'true')

    if (clearError) {
      console.log('Warning: Could not clear demo data:', clearError)
    }

    // Trigger multiple live signal generation functions
    const functions = [
      { name: 'live-crypto-feed', body: { start_aitradex1: true, start_aira: true } },
      { name: 'enhanced-signal-generation', body: { enhanced_mode: true } },
      { name: 'realtime-crypto-scanner', body: { enable_live_feed: true } },
      { name: 'free-crypto-api-integration', body: { action: 'generate_enhanced_signals' } }
    ]

    const results = []
    
    for (const func of functions) {
      try {
        console.log(`Triggering ${func.name}...`)
        
        const { data, error } = await supabase.functions.invoke(func.name, {
          body: func.body
        })

        if (error) {
          console.log(`Error in ${func.name}:`, error)
          results.push({ function: func.name, success: false, error: error.message })
        } else {
          console.log(`✅ ${func.name} completed successfully`)
          results.push({ function: func.name, success: true, data })
        }
      } catch (err) {
        console.log(`Exception in ${func.name}:`, err.message)
        results.push({ function: func.name, success: false, error: err.message })
      }
    }

    // Generate some immediate live signals using real market data APIs
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT']
    const liveSignals = []

    for (const symbol of symbols) {
      try {
        // Fetch real market data from Bybit public API
        const marketResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
        const marketData = await marketResponse.json()
        
        if (marketData.result?.list?.[0]) {
          const ticker = marketData.result.list[0]
          const price = parseFloat(ticker.lastPrice)
          const change24h = parseFloat(ticker.price24hPcnt) * 100
          const volume = parseFloat(ticker.volume24h)
          
          // Generate signal based on real market conditions
          const signal = {
            symbol,
            timeframe: '15m',
            direction: change24h > 0 ? 'BUY' : 'SELL',
            price,
            entry_price: price * (change24h > 0 ? 0.999 : 1.001),
            take_profit: price * (change24h > 0 ? 1.02 : 0.98),
            stop_loss: price * (change24h > 0 ? 0.985 : 1.015),
            score: Math.min(95, Math.max(75, Math.round(75 + Math.abs(change24h) * 2))),
            confidence: Math.min(0.95, Math.max(0.75, 0.75 + Math.abs(change24h) / 50)),
            source: 'live_feed',
            algo: 'aitradex1',
            exchange: 'bybit',
            side: change24h > 0 ? 'BUY' : 'SELL',
            is_active: true,
            metadata: {
              change_24h: change24h,
              volume_24h: volume,
              live_price: price,
              market_trend: change24h > 2 ? 'strong_bullish' : change24h > 0 ? 'bullish' : change24h < -2 ? 'strong_bearish' : 'bearish',
              signal_quality: 'high'
            },
            bar_time: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }

          const { error: insertError } = await supabase
            .from('signals')
            .insert(signal)

          if (!insertError) {
            liveSignals.push(signal)
            console.log(`✅ Generated live signal for ${symbol}: ${signal.direction} at ${price}`)
          } else {
            console.log(`Error inserting signal for ${symbol}:`, insertError)
          }
        }
      } catch (err) {
        console.log(`Error generating signal for ${symbol}:`, err.message)
      }
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
        message: 'Live signal orchestrator completed',
        functions_triggered: results.length,
        live_signals_generated: liveSignals.length,
        results,
        signals: liveSignals
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in live signal orchestrator:', error)
    
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