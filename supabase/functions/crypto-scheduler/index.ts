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
    console.log('🚀 Crypto Scheduler triggered')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const tasks = []
    
    // 1. Generate unified signals
    tasks.push(
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/unified-signal-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeframes: ["5m", "15m", "1h"] })
      })
    )
    
    // 2. Update live price feeds
    tasks.push(
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/live-price-feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'update_prices' })
      })
    )
    
    // 3. Process automated trading
    if (Deno.env.get('AUTO_TRADING_ENABLED') === 'true') {
      tasks.push(
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bybit-live-trading`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'process_queue' })
        })
      )
    }
    
    // Execute all tasks in parallel
    const results = await Promise.allSettled(tasks)
    
    // Log execution results
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'crypto_scheduler',
        stage: 'completed',
        payload: {
          tasks_executed: results.length,
          successful: results.filter(r => r.status === 'fulfilled').length,
          failed: results.filter(r => r.status === 'rejected').length,
          timestamp: new Date().toISOString()
        }
      })
    
    console.log('✅ Crypto Scheduler completed')
    
    return new Response(
      JSON.stringify({
        success: true,
        tasks_executed: results.length,
        results: results.map(r => r.status),
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Crypto Scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})