import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache for instrument info
const instrumentCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json()
    
    if (!symbol) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Symbol parameter required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Check cache first
    const cacheKey = symbol
    const cached = instrumentCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch instrument info from Bybit
    const [instrumentResponse, tickerResponse] = await Promise.all([
      fetch(`https://api.bybit.com/v5/market/instruments-info?category=linear&symbol=${symbol}`),
      fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`)
    ])

    const instrumentData = await instrumentResponse.json()
    const tickerData = await tickerResponse.json()

    if (instrumentData.retCode !== 0 || !instrumentData.result?.list?.[0]) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Instrument not found or not tradable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    const instrument = instrumentData.result.list[0]
    const ticker = tickerData.result?.list?.[0]

    const result = {
      ok: true,
      symbol: instrument.symbol,
      isTrading: instrument.status === 'Trading',
      minQty: parseFloat(instrument.lotSizeFilter?.minOrderQty || '0'),
      qtyStep: parseFloat(instrument.lotSizeFilter?.qtyStep || '0.001'),
      minNotional: parseFloat(instrument.lotSizeFilter?.minNotionalValue || '5'),
      tickSize: parseFloat(instrument.priceFilter?.tickSize || '0.001'),
      maxLeverage: parseFloat(instrument.leverageFilter?.maxLeverage || '50'),
      lastPrice: ticker ? parseFloat(ticker.lastPrice) : 0,
      bid1Price: ticker ? parseFloat(ticker.bid1Price) : 0,
      ask1Price: ticker ? parseFloat(ticker.ask1Price) : 0,
      volume24h: ticker ? parseFloat(ticker.volume24h) : 0,
      priceChangePercent: ticker ? parseFloat(ticker.price24hPcnt) * 100 : 0,
      quoteCoin: instrument.quoteCoin,
      baseCoin: instrument.baseCoin,
      contractType: instrument.contractType,
      launchTime: instrument.launchTime,
      deliveryTime: instrument.deliveryTime,
      deliveryFeeRate: instrument.deliveryFeeRate,
      priceScale: instrument.priceScale,
      leverageFilter: instrument.leverageFilter,
      priceFilter: instrument.priceFilter,
      lotSizeFilter: instrument.lotSizeFilter
    }

    // Cache the result
    instrumentCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Instrument info error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})