import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { channel = 'free', minScore = 75 } = await req.json().catch(() => ({}));

    // Get Telegram credentials
    const botToken = channel === 'premium' 
      ? Deno.env.get('TELEGRAM_PAID_BOT_TOKEN')
      : Deno.env.get('TELEGRAM_FREE_BOT_TOKEN');
    
    const chatId = channel === 'premium'
      ? Deno.env.get('TELEGRAM_PAID_CHAT_ID')
      : Deno.env.get('TELEGRAM_FREE_CHAT_ID');

    if (!botToken || !chatId) {
      throw new Error(`Telegram credentials not configured for ${channel} channel`);
    }

    console.log(`[Telegram Bot] Fetching signals for ${channel} channel (score >= ${minScore})`);

    // Fetch recent high-score signals
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', minScore)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('score', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Failed to fetch signals: ${error.message}`);
    }

    if (!signals || signals.length === 0) {
      console.log('[Telegram Bot] No new signals to send');
      return new Response(
        JSON.stringify({ success: true, message: 'No new signals', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;

    for (const signal of signals) {
      try {
        const message = formatSignalMessage(signal, channel);
        
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const telegramResp = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });

        const telegramData = await telegramResp.json();

        if (telegramData.ok) {
          sentCount++;
          console.log(`[Telegram Bot] ✅ Sent ${signal.symbol} ${signal.direction} to ${channel}`);
          
          // Mark signal as sent
          await supabase
            .from('signals')
            .update({ 
              metadata: { 
                ...(signal.metadata || {}), 
                telegram_sent: true,
                telegram_channel: channel,
                telegram_sent_at: new Date().toISOString()
              }
            })
            .eq('id', signal.id);
        } else {
          console.error(`[Telegram Bot] Failed to send signal:`, telegramData);
        }

      } catch (error) {
        console.error(`[Telegram Bot] Error sending signal ${signal.id}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        channel,
        signals_found: signals.length,
        sent: sentCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Telegram Bot] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatSignalMessage(signal: any, channel: string): string {
  const isPremium = channel === 'premium';
  const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
  const qualityEmoji = signal.score >= 85 ? '⭐⭐⭐' : signal.score >= 75 ? '⭐⭐' : '⭐';
  
  let message = `${emoji} <b>${signal.symbol}</b> ${signal.direction}\n`;
  message += `${qualityEmoji} Score: <b>${signal.score}/100</b>\n`;
  message += `📊 Timeframe: ${signal.timeframe}\n\n`;
  
  message += `💰 Entry: <code>${signal.entry_price?.toFixed(4) || signal.price.toFixed(4)}</code>\n`;
  
  if (isPremium && signal.stop_loss) {
    message += `🛑 Stop Loss: <code>${signal.stop_loss.toFixed(4)}</code>\n`;
  }
  
  if (isPremium && signal.take_profit) {
    message += `🎯 Take Profit: <code>${signal.take_profit.toFixed(4)}</code>\n`;
  }
  
  if (signal.indicators) {
    message += `\n📈 Indicators:\n`;
    if (signal.indicators.rsi) message += `  RSI: ${signal.indicators.rsi.toFixed(1)}\n`;
    if (signal.indicators.volume_ratio) message += `  Volume: ${signal.indicators.volume_ratio.toFixed(2)}x\n`;
  }
  
  message += `\n⚡ Algorithm: ${signal.algo || 'quantum_ai'}\n`;
  message += `🕐 ${new Date(signal.created_at).toLocaleString()}\n`;
  
  if (isPremium) {
    message += `\n💎 <i>Premium Signal</i>`;
  } else {
    message += `\n✨ <i>Free Signal - Upgrade for full analysis</i>`;
  }
  
  return message;
}
