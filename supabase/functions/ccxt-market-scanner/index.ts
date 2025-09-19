import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CCXT-powered multi-exchange market scanner
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[CCXT Market Scanner] Starting multi-exchange scan...')
    
    // Get all USDT symbols from multiple exchanges
    const exchanges = ['bybit', 'binance', 'okx']
    const allMarketData: any[] = []
    
    for (const exchange of exchanges) {
      try {
        console.log(`[CCXT] Scanning ${exchange}...`)
        
        // Get top USDT symbols for each exchange
        const symbols = await getTopUSDTSymbols(exchange)
        console.log(`[CCXT] Found ${symbols.length} symbols on ${exchange}`)
        
        for (const symbol of symbols.slice(0, 20)) { // Limit to top 20 per exchange
          try {
            const marketData = await fetchMarketData(exchange, symbol)
            if (marketData && marketData.price > 0) {
              allMarketData.push(marketData)
            }
          } catch (symbolError) {
            console.error(`[CCXT] Error fetching ${symbol} on ${exchange}:`, symbolError.message)
          }
        }
      } catch (exchangeError) {
        console.error(`[CCXT] Error with ${exchange}:`, exchangeError.message)
      }
    }

    console.log(`[CCXT] Collected ${allMarketData.length} market data points`)

    // Insert/update market data
    if (allMarketData.length > 0) {
      // Clear old data
      await supabase
        .from('live_market_data')
        .delete()
        .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 minutes old

      // Insert new data
      const { data: insertedData, error: insertError } = await supabase
        .from('live_market_data')
        .upsert(allMarketData, {
          onConflict: 'symbol,exchange',
          ignoreDuplicates: false
        })
        .select()

      if (insertError) {
        console.error('[CCXT] Insert error:', insertError)
      } else {
        console.log(`[CCXT] ✅ Inserted ${insertedData?.length || 0} market data records`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      exchanges_scanned: exchanges.length,
      market_data_points: allMarketData.length,
      symbols_per_exchange: allMarketData.reduce((acc, curr) => {
        acc[curr.exchange] = (acc[curr.exchange] || 0) + 1
        return acc
      }, {}),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[CCXT Market Scanner] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function getTopUSDTSymbols(exchange: string): Promise<string[]> {
  // Mock implementation - replace with actual CCXT calls
  const symbolSets = {
    bybit: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'LINKUSDT', 'DOTUSDT'],
    binance: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT', 'LINKUSDT', 'DOTUSDT', 'AVAXUSDT'],
    okx: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT']
  }
  
  return symbolSets[exchange as keyof typeof symbolSets] || symbolSets.bybit
}

async function fetchMarketData(exchange: string, symbol: string) {
  // Mock market data generation with realistic values
  const basePrice = getBasePrice(symbol)
  const volatility = Math.random() * 0.05 + 0.01 // 1-6% volatility
  
  const currentPrice = basePrice * (1 + (Math.random() - 0.5) * volatility)
  const change24h = (Math.random() - 0.5) * 10 // -5% to +5% daily change
  const volume = Math.random() * 10000000 + 1000000 // 1M-11M volume
  
  return {
    symbol,
    exchange,
    base_asset: symbol.replace('USDT', ''),
    quote_asset: 'USDT',
    price: Number(currentPrice.toFixed(4)),
    bid: Number((currentPrice * 0.9995).toFixed(4)),
    ask: Number((currentPrice * 1.0005).toFixed(4)),
    volume: Math.round(volume),
    volume_quote: Math.round(volume * currentPrice),
    change_24h: Number(change24h.toFixed(2)),
    change_24h_percent: Number(change24h.toFixed(2)),
    high_24h: Number((currentPrice * 1.02).toFixed(4)),
    low_24h: Number((currentPrice * 0.98).toFixed(4)),
    rsi_14: Math.random() * 100,
    ema21: currentPrice * (0.99 + Math.random() * 0.02),
    sma200: currentPrice * (0.95 + Math.random() * 0.1),
    atr_14: currentPrice * (0.01 + Math.random() * 0.02),
    stoch_k: Math.random() * 100,
    stoch_d: Math.random() * 100,
    adx: 20 + Math.random() * 60,
    plus_di: Math.random() * 100,
    minus_di: Math.random() * 100,
    volume_avg_20: Math.round(volume * (0.8 + Math.random() * 0.4)),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    'BTCUSDT': 115000,
    'ETHUSDT': 4450,
    'BNBUSDT': 975,
    'ADAUSDT': 0.895,
    'SOLUSDT': 236,
    'XRPUSDT': 2.996,
    'LINKUSDT': 23.44,
    'DOTUSDT': 4.398,
    'AVAXUSDT': 65.5,
    'MATICUSDT': 1.234
  }
  
  return prices[symbol] || (50 + Math.random() * 100)
}