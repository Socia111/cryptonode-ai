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
    const { signals, channel = 'free' } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Telegram credentials based on channel
    const botToken = channel === 'paid' 
      ? Deno.env.get('TELEGRAM_PAID_BOT_TOKEN') 
      : Deno.env.get('TELEGRAM_FREE_BOT_TOKEN')
    
    const chatId = channel === 'paid'
      ? Deno.env.get('TELEGRAM_PAID_CHAT_ID')
      : Deno.env.get('TELEGRAM_FREE_CHAT_ID')

    if (!botToken || !chatId) {
      throw new Error(`Telegram credentials not configured for ${channel} channel`)
    }

    console.log(`📱 Sending ${signals?.length || 0} signals to ${channel} Telegram channel`)

    const sentMessages = []

    // Send signals to Telegram
    for (const signal of signals || []) {
      try {
        const message = formatSignalMessage(signal, channel)
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        })

        const telegramData = await response.json()
        
        if (telegramData.ok) {
          sentMessages.push({
            signal_id: signal.id,
            message_id: telegramData.result.message_id,
            channel,
            sent_at: new Date().toISOString()
          })
          
          console.log(`✅ Signal sent to ${channel}: ${signal.symbol} ${signal.direction}`)
        } else {
          console.error(`❌ Failed to send signal to ${channel}:`, telegramData.description)
        }
      } catch (error) {
        console.error(`❌ Error sending signal ${signal.id} to ${channel}:`, error)
      }
    }

    // Log telegram activity
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'telegram_signals',
        stage: 'signals_sent',
        payload: {
          channel,
          signals_sent: sentMessages.length,
          total_signals: signals?.length || 0,
          sent_messages: sentMessages,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        channel,
        signals_sent: sentMessages.length,
        messages: sentMessages,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Telegram signals error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function formatSignalMessage(signal: any, channel: string): string {
  const emoji = signal.direction === 'LONG' ? '🟢' : '🔴'
  const trend = signal.direction === 'LONG' ? '📈' : '📉'
  
  let message = `${emoji} <b>AItradeX1 SIGNAL</b> ${trend}\n\n`
  message += `💰 <b>${signal.symbol}</b>\n`
  message += `📊 Direction: <b>${signal.direction}</b>\n`
  message += `💵 Price: <b>$${signal.price}</b>\n`
  message += `⭐ Score: <b>${signal.score}/100</b>\n`
  message += `⏰ Timeframe: <b>${signal.timeframe}</b>\n`
  
  if (signal.metadata) {
    if (signal.metadata.rsi) {
      message += `📈 RSI: <b>${signal.metadata.rsi}</b>\n`
    }
    if (signal.metadata.trend_strength) {
      message += `💪 Trend: <b>${signal.metadata.trend_strength}%</b>\n`
    }
  }
  
  if (channel === 'paid') {
    message += `\n🎯 <b>PREMIUM FEATURES:</b>\n`
    if (signal.take_profit) {
      message += `✅ Take Profit: <b>$${signal.take_profit}</b>\n`
    }
    if (signal.stop_loss) {
      message += `❌ Stop Loss: <b>$${signal.stop_loss}</b>\n`
    }
    if (signal.metadata?.volatility) {
      message += `📊 Volatility: <b>${signal.metadata.volatility}%</b>\n`
    }
    if (signal.metadata?.volume_confirmation) {
      message += `📈 Volume: <b>${signal.metadata.volume_confirmation ? 'Confirmed' : 'Weak'}</b>\n`
    }
  }
  
  message += `\n⏱️ Generated: ${new Date().toLocaleString()}\n`
  message += `🤖 Engine: <b>${signal.algo}</b>\n`
  
  if (channel === 'free') {
    message += `\n💎 <i>Upgrade to Premium for Stop Loss, Take Profit & Advanced Analytics!</i>`
  }
  
  return message
}