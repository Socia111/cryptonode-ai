import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json()
    
    if (!symbol) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Symbol is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For now, return mock instrument data
    // TODO: Replace with real Bybit API call when needed
    const instrumentData = {
      ok: true,
      symbol,
      lastPrice: getLastPrice(symbol),
      qtyStep: 0.001,
      minQty: 0.001,
      minNotional: 5,
      maxLeverage: getMaxLeverage(symbol)
    }

    return new Response(JSON.stringify(instrumentData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Instrument info error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getLastPrice(symbol: string): number {
  // Mock price data based on real market ranges
  const prices: Record<string, number> = {
    'BTCUSDT': 115000 + Math.random() * 5000,
    'ETHUSDT': 4400 + Math.random() * 200,
    'BNBUSDT': 975 + Math.random() * 25,
    'ADAUSDT': 0.89 + Math.random() * 0.05,
    'SOLUSDT': 235 + Math.random() * 15,
    'XRPUSDT': 2.99 + Math.random() * 0.1,
    'LINKUSDT': 23.4 + Math.random() * 1.0,
    'DOTUSDT': 4.39 + Math.random() * 0.2
  }
  
  return prices[symbol] || (100 + Math.random() * 50)
}

function getMaxLeverage(symbol: string): number {
  // Conservative leverage limits for safety
  const leverageLimits: Record<string, number> = {
    'BTCUSDT': 100,
    'ETHUSDT': 100,
    'BNBUSDT': 50,
    'ADAUSDT': 25,
    'SOLUSDT': 25,
    'XRPUSDT': 25,
    'LINKUSDT': 25,
    'DOTUSDT': 25
  }
  
  return leverageLimits[symbol] || 10
}