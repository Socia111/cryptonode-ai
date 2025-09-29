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

    const { action = 'update_prices', symbols } = await req.json()
    
    const targetSymbols = symbols || [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ]

    if (action === 'update_prices') {
      const priceUpdates = []
      
      for (const symbol of targetSymbols) {
        try {
          // Fetch latest price from Bybit
          const response = await fetch(
            `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`
          )
          const data = await response.json()
          
          if (data?.result?.list?.[0]) {
            const ticker = data.result.list[0]
            priceUpdates.push({
              symbol,
              price: parseFloat(ticker.lastPrice),
              volume_24h: parseFloat(ticker.volume24h || 0),
              change_24h: parseFloat(ticker.price24hPcnt || 0) * 100,
              updated_at: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error)
        }
      }
      
      // Update live market data
      for (const update of priceUpdates) {
        await supabaseClient
          .from('live_market_data')
          .upsert(update, { onConflict: 'symbol' })
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          prices_updated: priceUpdates.length,
          symbols: targetSymbols,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_price') {
      const { symbol: requestedSymbol } = await req.json()
      
      try {
        const response = await fetch(
          `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${requestedSymbol}`
        )
        const data = await response.json()
        
        if (data?.result?.list?.[0]) {
          const ticker = data.result.list[0]
          return new Response(
            JSON.stringify({
              symbol: requestedSymbol,
              price: parseFloat(ticker.lastPrice),
              volume: parseFloat(ticker.volume24h || 0),
              change: parseFloat(ticker.price24hPcnt || 0) * 100,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (error) {
        console.error(`Error fetching price for ${requestedSymbol}:`, error)
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