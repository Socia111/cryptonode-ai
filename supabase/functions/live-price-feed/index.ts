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
    const { action = 'update_prices' } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'update_prices') {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
      const priceUpdates = []

      for (const symbol of symbols) {
        const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
        if (response.ok) {
          const data = await response.json()
          const ticker = data.result?.list?.[0]
          if (ticker) {
            priceUpdates.push({
              symbol,
              price: parseFloat(ticker.lastPrice),
              volume_24h: parseFloat(ticker.volume24h),
              change_24h: parseFloat(ticker.price24hPcnt) * 100,
              last_updated: new Date().toISOString()
            })
          }
        }
      }

      if (priceUpdates.length > 0) {
        await supabaseClient.from('live_prices').upsert(priceUpdates, { onConflict: 'symbol' })
      }

      return new Response(JSON.stringify({
        success: true,
        symbols_updated: priceUpdates.length,
        price_updates: priceUpdates
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})