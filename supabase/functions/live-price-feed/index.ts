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
    const { action = 'update_prices', symbols } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const targetSymbols = symbols || [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ]

    if (action === 'update_prices') {
      const priceUpdates = []

      for (const symbol of targetSymbols) {
        try {
          const response = await fetch(
            `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`
          )
          const data = await response.json()
          
          if (data?.result?.list?.[0]) {
            const ticker = data.result.list[0]
            priceUpdates.push({
              symbol,
              price: parseFloat(ticker.lastPrice),
              volume_24h: parseFloat(ticker.volume24h),
              change_24h: parseFloat(ticker.price24hPcnt) * 100,
              high_24h: parseFloat(ticker.highPrice24h),
              low_24h: parseFloat(ticker.lowPrice24h),
              updated_at: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error)
        }
      }

      // Bulk update database
      if (priceUpdates.length > 0) {
        const { error } = await supabaseClient
          .from('live_market_data')
          .upsert(priceUpdates, { onConflict: 'symbol' })

        if (error) {
          console.error('Database update error:', error)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          updated_symbols: priceUpdates.length,
          symbols: priceUpdates.map(p => p.symbol),
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_price') {
      const { symbol } = await req.json()
      if (!symbol) {
        throw new Error('Symbol is required for get_price action')
      }

      const response = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`
      )
      const data = await response.json()
      
      if (data?.result?.list?.[0]) {
        const ticker = data.result.list[0]
        return new Response(
          JSON.stringify({
            symbol,
            price: parseFloat(ticker.lastPrice),
            volume_24h: parseFloat(ticker.volume24h),
            change_24h: parseFloat(ticker.price24hPcnt) * 100,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Live price feed error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})