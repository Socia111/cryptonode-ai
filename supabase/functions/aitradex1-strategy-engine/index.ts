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
    const { symbols = ['BTCUSDT', 'ETHUSDT'], timeframe = '1h' } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signals = []

    for (const symbol of symbols) {
      try {
        // Fetch market data from Bybit
        const response = await fetch(
          `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=100`
        )
        const data = await response.json()
        
        if (data?.result?.list?.length > 0) {
          const candles = data.result.list.reverse()
          const signal = await analyzeWithAItradeX1(symbol, timeframe, candles)
          
          if (signal) {
            // Insert signal into database
            const { data: insertedSignal, error } = await supabaseClient
              .from('signals')
              .insert({
                symbol: signal.symbol,
                timeframe: signal.timeframe,
                direction: signal.direction,
                price: signal.price,
                entry_price: signal.price,
                score: signal.score,
                algo: 'AITRADEX1',
                source: 'aitradex1_strategy_engine',
                metadata: {
                  ...signal.metadata,
                  generated_at: new Date().toISOString()
                }
              })
              .select()
              .single()

            if (!error) {
              signals.push(insertedSignal)
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        signals,
        timeframe,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AItradeX1 strategy engine error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function analyzeWithAItradeX1(symbol: string, timeframe: string, candles: any[]) {
  try {
    const closes = candles.slice(-50).map((c: any) => parseFloat(c[4]))
    if (closes.length < 21) return null
    
    const currentPrice = closes[closes.length - 1]
    const ema21 = calculateEMA(closes, 21)
    const rsi = calculateRSI(closes, 14)
    
    // AItradeX1 Strategy Logic
    const priceAboveEMA = currentPrice > ema21
    const trendStrength = Math.abs((currentPrice - ema21) / ema21) * 100
    const momentum = calculateMomentum(closes, 10)
    
    let score = 50
    let direction = null
    
    // Bullish conditions
    if (priceAboveEMA && rsi > 30 && rsi < 70 && momentum > 0) {
      score += 25 + Math.min(trendStrength * 2, 25)
      direction = 'LONG'
    }
    // Bearish conditions  
    else if (!priceAboveEMA && rsi > 30 && rsi < 70 && momentum < 0) {
      score += 25 + Math.min(trendStrength * 2, 25)
      direction = 'SHORT'
    }
    
    if (score >= 65 && direction) {
      return {
        symbol,
        timeframe,
        direction,
        price: currentPrice,
        score: Math.round(score),
        metadata: {
          ema21: ema21.toFixed(2),
          rsi: rsi.toFixed(2),
          trend_strength: trendStrength.toFixed(2),
          momentum: momentum.toFixed(4)
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Analysis error:', error)
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

function calculateRSI(values: number[], period: number): number {
  const changes = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }
  
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0)
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMomentum(values: number[], period: number): number {
  const current = values[values.length - 1]
  const previous = values[values.length - 1 - period]
  return (current - previous) / previous
}