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
    console.log('📡 Auto Signals Scheduler triggered')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current time and determine which signals to generate
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    
    let timeframes = []
    
    // Schedule based on time patterns
    if (minute % 5 === 0) timeframes.push('5m')
    if (minute % 15 === 0) timeframes.push('15m')
    if (minute === 0) timeframes.push('1h')
    
    // Special schedule for 11:11 PM (high-quality signals)
    if (hour === 23 && minute === 11) {
      timeframes = ['5m', '15m', '1h', '4h']
    }
    
    if (timeframes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No signals scheduled for this time',
          timestamp: now.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`⏰ Generating signals for timeframes: ${timeframes.join(', ')}`)
    
    // Call unified signal engine
    const signalResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/unified-signal-engine`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          timeframes,
          automated: true,
          scheduler_trigger: true
        })
      }
    )
    
    const signalResult = await signalResponse.json()
    
    // Log scheduling activity
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'auto_signals_scheduler',
        stage: 'completed',
        payload: {
          timeframes,
          signals_generated: signalResult.signals_generated || 0,
          trigger_time: `${hour}:${minute.toString().padStart(2, '0')}`,
          timestamp: now.toISOString()
        }
      })
    
    // Send Telegram notification for high-quality signals
    if (signalResult.signals_generated > 0 && (hour === 23 && minute === 11)) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `🎯 ${signalResult.signals_generated} premium signals generated at 11:11 PM`,
          high_priority: true
        })
      }).catch(e => console.log('Telegram notification failed:', e))
    }
    
    console.log(`✅ Generated ${signalResult.signals_generated} signals`)
    
    return new Response(
      JSON.stringify({
        success: true,
        timeframes,
        signals_generated: signalResult.signals_generated || 0,
        trigger_time: `${hour}:${minute.toString().padStart(2, '0')}`,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Auto Signals Scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})