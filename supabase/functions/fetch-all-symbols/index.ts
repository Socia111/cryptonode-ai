import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { exchange = 'bybit', category = 'spot' } = await req.json()

    let symbols = []

    if (exchange === 'bybit') {
      // Fetch symbols from Bybit API
      const response = await fetch(
        `https://api.bybit.com/v5/market/instruments-info?category=${category}`
      )
      const data = await response.json()
      
      if (data?.result?.list) {
        symbols = data.result.list
          .filter((instrument: any) => 
            instrument.symbol.endsWith('USDT') && 
            instrument.status === 'Trading'
          )
          .map((instrument: any) => ({
            symbol: instrument.symbol,
            baseCoin: instrument.baseCoin,
            quoteCoin: instrument.quoteCoin,
            status: instrument.status,
            lotSizeFilter: instrument.lotSizeFilter
          }))
      }
    } else {
      // Default symbols for other exchanges
      symbols = [
        { symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'ETHUSDT', baseCoin: 'ETH', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'BNBUSDT', baseCoin: 'BNB', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'XRPUSDT', baseCoin: 'XRP', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'ADAUSDT', baseCoin: 'ADA', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'SOLUSDT', baseCoin: 'SOL', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'DOTUSDT', baseCoin: 'DOT', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'LINKUSDT', baseCoin: 'LINK', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'AVAXUSDT', baseCoin: 'AVAX', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'MATICUSDT', baseCoin: 'MATIC', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'ATOMUSDT', baseCoin: 'ATOM', quoteCoin: 'USDT', status: 'Trading' },
        { symbol: 'LTCUSDT', baseCoin: 'LTC', quoteCoin: 'USDT', status: 'Trading' }
      ]
    }

    return new Response(
      JSON.stringify({
        success: true,
        exchange,
        category,
        symbols_count: symbols.length,
        symbols: symbols.slice(0, 100), // Limit to first 100 for performance
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fetch all symbols error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})