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
    console.log('⏰ Auto Signals Scheduler started')
    
    const { interval = '1h', symbols } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const targetSymbols = symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']
    const timeframes = ['15m', '1h']
    
    // Schedule signal generation tasks
    const scheduledTasks = []

    for (const timeframe of timeframes) {
      // Generate AItradeX1 signals
      scheduledTasks.push(
        supabaseClient.functions.invoke('aitradex1-strategy-engine', {
          body: { symbols: targetSymbols, timeframe }
        })
      )
      
      // Generate unified signals
      scheduledTasks.push(
        supabaseClient.functions.invoke('unified-signal-engine', {
          body: { 
            symbols: targetSymbols, 
            timeframes: [timeframe],
            algorithms: ['AITRADEX1']
          }
        })
      )
    }

    // Execute all scheduled tasks
    const results = await Promise.allSettled(scheduledTasks)
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length

    // Log scheduler execution
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'auto_signals_scheduler',
        stage: 'completed',
        payload: {
          interval,
          symbols_processed: targetSymbols.length,
          timeframes_processed: timeframes.length,
          tasks_successful: successCount,
          tasks_failed: failCount,
          total_tasks: results.length,
          timestamp: new Date().toISOString()
        }
      })

    console.log(`✅ Auto Signals Scheduler completed: ${successCount}/${results.length} tasks successful`)

    return new Response(
      JSON.stringify({
        success: true,
        scheduler_status: 'completed',
        tasks_executed: results.length,
        successful_tasks: successCount,
        failed_tasks: failCount,
        symbols_processed: targetSymbols,
        timeframes_processed: timeframes,
        timestamp: new Date().toISOString()
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