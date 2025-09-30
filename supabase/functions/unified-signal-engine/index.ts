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
    console.log('🔄 Unified Signal Engine started')
    
    const { timeframes = ['1h'], symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const generatedSignals = []

    for (const timeframe of timeframes) {
      for (const symbol of symbols) {
        try {
          const bybitUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=50`
          const response = await fetch(bybitUrl)
          
          if (!response.ok) continue
          const data = await response.json()
          if (!data.result?.list?.length) continue

          const candles = data.result.list.map(k => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          })).reverse()

          const currentPrice = candles[candles.length - 1].close
          const closes = candles.map(c => c.close)
          
          // Calculate trend strength
          const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
          const trendScore = currentPrice > ma20 ? 25 : 15
          
          // Volume analysis
          const avgVolume = candles.slice(-10).reduce((a, b) => a + b.volume, 0) / 10
          const currentVolume = candles[candles.length - 1].volume
          const volumeScore = currentVolume > avgVolume * 1.2 ? 20 : 10
          
          // Price momentum
          const priceChange = (currentPrice - closes[closes.length - 10]) / closes[closes.length - 10]
          const momentumScore = Math.abs(priceChange) > 0.02 ? 20 : 10
          
          const baseScore = 35
          const totalScore = baseScore + trendScore + volumeScore + momentumScore
          
          const direction = currentPrice > ma20 ? 'LONG' : 'SHORT'

          if (totalScore >= 65) {
            const stopLoss = direction === 'LONG' 
              ? currentPrice * 0.98 
              : currentPrice * 1.02
            const takeProfit = direction === 'LONG'
              ? currentPrice * 1.03
              : currentPrice * 0.97

            generatedSignals.push({
              symbol,
              timeframe,
              direction,
              price: currentPrice,
              entry_price: currentPrice,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              score: Math.round(totalScore),
              confidence: totalScore / 100,
              source: 'unified_signal_engine',
              algo: 'AITRADEX1_unified',
              metadata: { 
                engine: 'unified',
                ma20,
                volume_ratio: currentVolume / avgVolume,
                price_change: priceChange
              },
              bar_time: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error)
        }
      }
    }

    if (generatedSignals.length > 0) {
      await supabaseClient
        .from('signals')
        .insert(generatedSignals.map(signal => ({
          ...signal,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        })))
    }

    console.log(`✅ Generated ${generatedSignals.length} unified signals`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: generatedSignals.length,
        signals: generatedSignals,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Unified Signal Engine error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})