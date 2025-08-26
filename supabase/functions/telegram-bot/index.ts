import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  signal_id: string
  token: string
  direction: 'BUY' | 'SELL'
  signal_type: string
  entry_price: number
  exit_target?: number
  stop_loss?: number
  leverage: number
  confidence_score: number
  roi_projection: number
  quantum_probability: number
  risk_level: string
  signal_strength: string
  trend_projection: string
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

    const { signal } = await req.json()
    
    if (!signal) {
      return new Response(
        JSON.stringify({ error: 'Signal data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send to main channel
    await sendToTelegramChannel(signal)
    
    // Send to premium channel if high confidence
    if (signal.confidence_score > 90) {
      await sendToPremiumChannel(signal)
    }
    
    // Log notification
    await supabase
      .from('telegram_notifications')
      .insert({
        signal_id: signal.signal_id,
        message_type: 'signal_alert',
        sent_at: new Date().toISOString(),
        confidence_score: signal.confidence_score
      })

    return new Response(
      JSON.stringify({ success: true, message: 'Telegram alert sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendToTelegramChannel(signal: TelegramMessage) {
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  
  if (!telegramToken || !chatId) return

  const emoji = signal.direction === 'BUY' ? '🚀' : '📉'
  const strengthEmoji = getStrengthEmoji(signal.signal_strength)
  const riskEmoji = getRiskEmoji(signal.risk_level)
  
  const message = `
${emoji} *AItradeX1 ${signal.direction} SIGNAL* ${emoji}

🎯 *Token:* \`${signal.token}\`
📊 *Signal:* ${signal.signal_type}
💰 *Entry:* $${signal.entry_price.toFixed(4)}
🎯 *Target:* $${signal.exit_target?.toFixed(4)}
🛡️ *Stop Loss:* $${signal.stop_loss?.toFixed(4)}
⚡ *Leverage:* ${signal.leverage}x
📈 *ROI Target:* ${signal.roi_projection}%

🔥 *Confidence:* ${signal.confidence_score.toFixed(1)}% ${strengthEmoji}
🧠 *Quantum Prob:* ${(signal.quantum_probability * 100).toFixed(1)}%
⚠️ *Risk Level:* ${signal.risk_level} ${riskEmoji}
📊 *Trend:* ${signal.trend_projection}

⏰ *Time:* ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})} UTC

🤖 *Powered by AItradeX1 Quantum Engine*
  `.trim()

  await sendTelegramMessage(telegramToken, chatId, message)
}

async function sendToPremiumChannel(signal: TelegramMessage) {
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const premiumChatId = Deno.env.get('TELEGRAM_PREMIUM_CHAT_ID')
  
  if (!telegramToken || !premiumChatId) return

  const message = `
🌟 *PREMIUM HIGH-CONFIDENCE SIGNAL* 🌟

${signal.direction === 'BUY' ? '🚀' : '📉'} *${signal.token}* ${signal.direction}

⭐ *Confidence:* ${signal.confidence_score.toFixed(1)}%
🧬 *Quantum Analysis:* ${(signal.quantum_probability * 100).toFixed(1)}%
💎 *Signal Strength:* ${signal.signal_strength}
🎯 *Entry:* $${signal.entry_price.toFixed(4)}
🏆 *ROI Target:* ${signal.roi_projection}%
⚡ *Max Leverage:* ${signal.leverage}x

🔥 *EXECUTE IMMEDIATELY FOR MAXIMUM ALPHA*
  `.trim()

  await sendTelegramMessage(telegramToken, premiumChatId, message)
}

async function sendTelegramMessage(token: string, chatId: string, message: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Telegram API error: ${error}`)
    }
  } catch (error) {
    console.error('Telegram send error:', error)
    throw error
  }
}

function getStrengthEmoji(strength: string): string {
  switch (strength) {
    case 'VERY_STRONG': return '🔥🔥🔥'
    case 'STRONG': return '🔥🔥'
    case 'MODERATE': return '🔥'
    default: return '⚡'
  }
}

function getRiskEmoji(risk: string): string {
  switch (risk) {
    case 'LOW': return '🟢'
    case 'MEDIUM': return '🟡'
    case 'HIGH': return '🔴'
    default: return '⚪'
  }
}