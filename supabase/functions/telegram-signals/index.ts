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

    // Simulate sending to Telegram
    let sentCount = 0
    const results = []

    for (const signal of signals || []) {
      const message = `🚀 AItradeX1 Signal\n📊 ${signal.symbol}\n📈 ${signal.direction}\n💰 $${signal.price}\n🎯 Score: ${signal.score}/100`
      
      // Mock successful send
      sentCount++
      results.push({ signal: signal.symbol, status: 'sent', channel })
      console.log(`📱 Signal sent to ${channel}: ${signal.symbol} ${signal.direction}`)
    }

    await supabaseClient.from('edge_event_log').insert({
      fn: 'telegram_signals',
      stage: 'completed',
      payload: {
        channel,
        signals_sent: sentCount,
        timestamp: new Date().toISOString()
      }
    })

    return new Response(JSON.stringify({
      success: true,
      channel,
      signals_sent: sentCount,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})