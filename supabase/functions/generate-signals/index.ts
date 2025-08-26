import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketData {
  symbol: string
  price: number
  volume: number
  priceChange24h: number
}

interface TechnicalIndicators {
  ema21: number
  ema200: number
  rsi: number
  macd: number
  stochK: number
  stochD: number
  volumeRatio: number
}

interface Signal {
  token: string
  direction: 'BUY' | 'SELL'
  signal_type: string
  timeframe: string
  entry_price: number
  exit_target?: number
  stop_loss?: number
  leverage: number
  confidence_score: number
  pms_score: number
  trend_projection: string
  volume_strength: number
  roi_projection: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch live market data from multiple sources
    const marketData = await fetchMarketData()
    
    // Generate signals for each token
    const signals: Signal[] = []
    
    for (const data of marketData) {
      const indicators = await calculateTechnicalIndicators(data)
      const signal = await generateSignal(data, indicators)
      
      if (signal && signal.confidence_score > 70) {
        signals.push(signal)
      }
    }

    // Store signals in database
    if (signals.length > 0) {
      const { data: insertedSignals, error } = await supabase
        .from('signals')
        .insert(signals)
        .select()

      if (error) throw error

      // Send to Telegram if configured
      for (const signal of insertedSignals) {
        await sendTelegramAlert(signal)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          signals: insertedSignals.length,
          data: insertedSignals 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, signals: 0, message: 'No signals generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchMarketData(): Promise<MarketData[]> {
  // Fetch from CoinGecko API
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
  )
  
  if (!response.ok) throw new Error('Failed to fetch market data')
  
  const data = await response.json()
  
  return data.map((coin: any) => ({
    symbol: coin.symbol.toUpperCase() + '/USDT',
    price: coin.current_price,
    volume: coin.total_volume,
    priceChange24h: coin.price_change_percentage_24h || 0
  }))
}

async function calculateTechnicalIndicators(data: MarketData): Promise<TechnicalIndicators> {
  // Simplified technical indicators calculation
  // In production, you'd fetch historical data and calculate properly
  
  const basePrice = data.price
  const volatility = Math.abs(data.priceChange24h) / 100
  
  return {
    ema21: basePrice * (1 + (Math.random() - 0.5) * 0.02),
    ema200: basePrice * (1 + (Math.random() - 0.5) * 0.05),
    rsi: 30 + Math.random() * 40, // Random RSI between 30-70
    macd: (Math.random() - 0.5) * basePrice * 0.01,
    stochK: Math.random() * 100,
    stochD: Math.random() * 100,
    volumeRatio: 0.5 + Math.random() * 2 // 0.5x to 2.5x average volume
  }
}

async function generateSignal(data: MarketData, indicators: TechnicalIndicators): Promise<Signal | null> {
  // Golden Cross / Death Cross Detection
  const isGoldenCross = indicators.ema21 > indicators.ema200
  const isDeathCross = indicators.ema21 < indicators.ema200
  
  // RSI Signals
  const isOversold = indicators.rsi < 30
  const isOverbought = indicators.rsi > 70
  
  // Volume Strength
  const volumeStrength = indicators.volumeRatio
  const hasVolumeSpike = volumeStrength > 1.5
  
  // Calculate PMS (Price Momentum Score)
  const pmsScore = (
    0.3 * volumeStrength +
    0.2 * (data.priceChange24h / 10) +
    0.2 * (isGoldenCross ? 1 : isDeathCross ? -1 : 0) +
    0.15 * (indicators.macd > 0 ? 1 : -1) +
    0.15 * ((indicators.stochK > indicators.stochD ? 1 : -1))
  )
  
  let signal: Signal | null = null
  
  // BUY Signal Logic
  if (isGoldenCross && isOversold && hasVolumeSpike && pmsScore > 1.5) {
    signal = {
      token: data.symbol,
      direction: 'BUY',
      signal_type: 'Golden Cross + RSI Oversold',
      timeframe: '15m',
      entry_price: data.price,
      exit_target: data.price * 1.15, // 15% target
      stop_loss: data.price * 0.93, // 7% stop loss
      leverage: 25,
      confidence_score: Math.min(95, 70 + Math.abs(pmsScore) * 10),
      pms_score: pmsScore,
      trend_projection: '⬆️',
      volume_strength: volumeStrength,
      roi_projection: 15
    }
  }
  
  // SELL Signal Logic
  else if (isDeathCross && isOverbought && pmsScore < -1.5) {
    signal = {
      token: data.symbol,
      direction: 'SELL',
      signal_type: 'Death Cross + RSI Overbought',
      timeframe: '15m',
      entry_price: data.price,
      exit_target: data.price * 0.85, // 15% target
      stop_loss: data.price * 1.07, // 7% stop loss
      leverage: 25,
      confidence_score: Math.min(95, 70 + Math.abs(pmsScore) * 10),
      pms_score: pmsScore,
      trend_projection: '⬇️',
      volume_strength: volumeStrength,
      roi_projection: 15
    }
  }
  
  return signal
}

async function sendTelegramAlert(signal: Signal) {
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  
  if (!telegramToken || !chatId) return
  
  const message = `
🤖 *AItradeX1 ${signal.direction} Signal*

💎 *Token:* ${signal.token}
📊 *Signal:* ${signal.signal_type}
💰 *Entry:* $${signal.entry_price.toFixed(4)}
🎯 *Target:* $${signal.exit_target?.toFixed(4)}
🛡️ *Stop Loss:* $${signal.stop_loss?.toFixed(4)}
⚡ *Leverage:* ${signal.leverage}x
📈 *ROI Target:* ${signal.roi_projection}%
🔥 *Confidence:* ${signal.confidence_score.toFixed(1)}%
📊 *PMS Score:* ${signal.pms_score.toFixed(2)}
🔊 *Volume:* ${signal.volume_strength.toFixed(2)}x
📈 *Trend:* ${signal.trend_projection}

⏰ *Time:* ${new Date().toLocaleString()}
  `.trim()
  
  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('Telegram send error:', error)
  }
}