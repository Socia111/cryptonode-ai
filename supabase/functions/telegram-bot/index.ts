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
  is_premium?: boolean
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

    // Send to free channel (Aiatethecoin bot)
    await sendToFreeChannel(signal)
    
    // Send to paid channel if premium signal or high confidence
    if (signal.is_premium || signal.confidence_score > 85) {
      await sendToPaidChannel(signal)
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

async function sendToFreeChannel(signal: TelegramMessage) {
  const telegramToken = Deno.env.get('TELEGRAM_FREE_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_FREE_CHAT_ID')
  
  if (!telegramToken || !chatId) return

  const emoji = signal.direction === 'BUY' ? '🚀' : '📉'
  const strengthEmoji = getStrengthEmoji(signal.signal_strength)
  const riskEmoji = getRiskEmoji(signal.risk_level)
  
  const message = `
${emoji} *Aiatethecoin ${signal.direction} SIGNAL* ${emoji}

🎯 *Token:* \`${signal.token}\`
📊 *Signal:* ${signal.signal_type}
💰 *Entry:* $${signal.entry_price.toFixed(4)}
🎯 *Target:* $${signal.exit_target?.toFixed(4) || 'TBD'}
🛡️ *Stop Loss:* $${signal.stop_loss?.toFixed(4) || 'TBD'}
⚡ *Leverage:* ${signal.leverage}x
📈 *ROI Target:* ${signal.roi_projection}%

🔥 *Confidence:* ${signal.confidence_score.toFixed(1)}% ${strengthEmoji}
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

🆓 *Free Signal* | 🤖 *@Aiatethecoin_bot*

💎 *Upgrade to AItradeX Premium for:*
• Advanced quantum analysis
• Higher accuracy signals
• Priority alerts & faster execution
• Exclusive high-confidence trades
  `.trim()

  await sendTelegramMessage(telegramToken, chatId, message)
}

async function sendToPaidChannel(signal: TelegramMessage) {
  const telegramToken = Deno.env.get('TELEGRAM_PAID_BOT_TOKEN')
  const paidChatId = Deno.env.get('TELEGRAM_PAID_CHAT_ID')
  
  if (!telegramToken || !paidChatId) return

  const emoji = signal.direction === 'BUY' ? '🚀' : '📉'
  const strengthEmoji = getStrengthEmoji(signal.signal_strength)
  const riskEmoji = getRiskEmoji(signal.risk_level)

  const message = `
🌟 *AItradeX PREMIUM ${signal.direction} SIGNAL* 🌟

${emoji} *${signal.token}* ${signal.direction}

⭐ *Confidence:* ${signal.confidence_score.toFixed(1)}% ${strengthEmoji}
🧬 *Quantum Analysis:* ${(signal.quantum_probability * 100).toFixed(1)}%
💎 *Signal Strength:* ${signal.signal_strength}
🎯 *Entry:* $${signal.entry_price.toFixed(4)}
🎯 *Target:* $${signal.exit_target?.toFixed(4)}
🛡️ *Stop Loss:* $${signal.stop_loss?.toFixed(4)}
⚡ *Leverage:* ${signal.leverage}x
🏆 *ROI Target:* ${signal.roi_projection}%
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

💎 *PREMIUM MEMBERS ONLY*
🔥 *EXECUTE IMMEDIATELY FOR MAXIMUM ALPHA*
🤖 *@AItradeX1_bot*
  `.trim()

  await sendTelegramMessage(telegramToken, paidChatId, message)
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