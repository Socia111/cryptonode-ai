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

    console.log('🎯 Demo signal generator triggered')

    // Generate demo signals with real market data
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT']
    const timeframes = ['15m', '30m', '1h']
    const signalsGenerated = []

    for (let i = 0; i < 5; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)]
      
      // Fetch real price data
      try {
        const priceResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
        const priceData = await priceResponse.json()
        const ticker = priceData.result?.list?.[0]
        
        if (ticker) {
          const currentPrice = parseFloat(ticker.lastPrice)
          const change24h = parseFloat(ticker.price24hPcnt) * 100
          const volume = parseFloat(ticker.volume24h)
          
          // Generate realistic signal
          const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT'
          const score = Math.floor(Math.random() * 20) + 75 // 75-95 range
          
          const signal = {
            symbol,
            timeframe,
            direction,
            price: currentPrice,
            entry_price: currentPrice * (direction === 'LONG' ? 0.999 : 1.001),
            take_profit: currentPrice * (direction === 'LONG' ? 1.025 : 0.975),
            stop_loss: currentPrice * (direction === 'LONG' ? 0.985 : 1.015),
            score,
            confidence: score / 100,
            source: 'demo',
            algo: 'aitradex1_demo',
            exchange: 'bybit',
            side: direction === 'LONG' ? 'BUY' : 'SELL',
            signal_type: 'momentum',
            signal_grade: score > 85 ? 'A' : score > 80 ? 'B' : 'C',
            is_active: true,
            metadata: {
              demo: true,
              real_price: true,
              change_24h: change24h,
              volume_24h: volume,
              generated_at: new Date().toISOString()
            },
            bar_time: new Date().toISOString(),
            expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
          }

          const { error: insertError } = await supabase
            .from('signals')
            .insert(signal)

          if (!insertError) {
            signalsGenerated.push(signal)
            console.log(`✅ Generated demo signal: ${symbol} ${direction} at ${currentPrice}`)
          } else {
            console.error(`Error inserting signal:`, insertError)
          }
        }
      } catch (err) {
        console.log(`Error fetching price for ${symbol}:`, err.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo signals generated successfully',
        signals_generated: signalsGenerated.length,
        signals: signalsGenerated
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in demo signal generator:', error)
    
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