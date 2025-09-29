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
    const { exchange = 'bybit', timeframe = '1h', relaxed_filters = true, symbols } = await req.json()
    
    const targetSymbols = symbols || [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ]

    let signalsFound = 0

    for (const symbol of targetSymbols) {
      try {
        // Fetch market data
        const response = await fetch(
          `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=100`
        )
        const data = await response.json()
        
        if (data?.result?.list?.length > 0) {
          const candles = data.result.list.reverse()
          const signal = await scanForSignal(symbol, timeframe, candles, relaxed_filters)
          
          if (signal) {
            signalsFound++
          }
        }
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_found: signalsFound,
        timeframe,
        exchange,
        symbols_scanned: targetSymbols.length,
        relaxed_filters,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Live scanner production error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function scanForSignal(symbol: string, timeframe: string, candles: any[], relaxedFilters: boolean) {
  try {
    const closes = candles.slice(-50).map((c: any) => parseFloat(c[4]))
    if (closes.length < 21) return null
    
    const currentPrice = closes[closes.length - 1]
    const ema21 = calculateEMA(closes, 21)
    
    // Relaxed scanning criteria
    const threshold = relaxedFilters ? 0.5 : 1.0
    const trendStrength = Math.abs((currentPrice - ema21) / ema21) * 100
    
    if (trendStrength > threshold) {
      return {
        symbol,
        timeframe,
        direction: currentPrice > ema21 ? 'LONG' : 'SHORT',
        strength: trendStrength.toFixed(2)
      }
    }
    
    return null
  } catch (error) {
    console.error('Error in signal scanning:', error)
    return null
  }
}

function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}