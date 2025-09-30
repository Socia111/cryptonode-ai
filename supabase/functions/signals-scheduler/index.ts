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
    console.log('⏰ Signals Scheduler started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { mode = 'full_cycle' } = await req.json() || {}

    const results = {
      signal_generation: null,
      auto_trading: null,
      scanner_update: null,
      system_cleanup: null
    }

    try {
      // 1. Generate new signals
      console.log('🔄 Triggering signal generation...')
      const signalGenResponse = await supabaseClient.functions.invoke('live-signals-generator', {
        body: {}
      })
      
      results.signal_generation = {
        success: !signalGenResponse.error,
        data: signalGenResponse.data,
        error: signalGenResponse.error?.message
      }
      
      console.log(`Signal generation: ${results.signal_generation.success ? '✅' : '❌'}`)
      
    } catch (error) {
      results.signal_generation = { success: false, error: error.message }
    }

    try {
      // 2. Process signals with auto trading engine
      console.log('🤖 Triggering auto trading engine...')
      const autoTradingResponse = await supabaseClient.functions.invoke('auto-trading-engine', {
        body: { action: 'process_signals' }
      })
      
      results.auto_trading = {
        success: !autoTradingResponse.error,
        data: autoTradingResponse.data,
        error: autoTradingResponse.error?.message
      }
      
      console.log(`Auto trading: ${results.auto_trading.success ? '✅' : '❌'}`)
      
    } catch (error) {
      results.auto_trading = { success: false, error: error.message }
    }

    try {
      // 3. Update market scanner
      console.log('📊 Updating market scanner...')
      const scannerResponse = await supabaseClient.functions.invoke('live-scanner-production', {
        body: {}
      })
      
      results.scanner_update = {
        success: !scannerResponse.error,
        data: scannerResponse.data,
        error: scannerResponse.error?.message
      }
      
      console.log(`Scanner update: ${results.scanner_update.success ? '✅' : '❌'}`)
      
    } catch (error) {
      results.scanner_update = { success: false, error: error.message }
    }

    try {
      // 4. System cleanup
      console.log('🧹 Running system cleanup...')
      
      // Expire old signals
      const { error: expireError } = await supabaseClient
        .from('signals')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString())
      
      if (expireError) throw expireError

      // Clean old execution queue items
      const { error: cleanupError } = await supabaseClient
        .from('execution_queue')
        .delete()
        .eq('status', 'completed')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      
      if (cleanupError) throw cleanupError

      results.system_cleanup = { success: true, message: 'Cleanup completed' }
      console.log('System cleanup: ✅')
      
    } catch (error) {
      results.system_cleanup = { success: false, error: error.message }
    }

    // Update scheduler status
    await supabaseClient
      .from('system_status')
      .upsert({
        service_name: 'signals_scheduler',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: Object.values(results).filter(r => r?.success).length,
        metadata: {
          last_run: new Date().toISOString(),
          results: results,
          mode: mode
        }
      }, { onConflict: 'service_name' })

    const successCount = Object.values(results).filter(r => r?.success).length
    const totalTasks = Object.keys(results).length

    console.log(`✅ Scheduler completed: ${successCount}/${totalTasks} tasks successful`)

    return new Response(
      JSON.stringify({
        success: true,
        scheduler_run: {
          tasks_completed: successCount,
          total_tasks: totalTasks,
          success_rate: (successCount / totalTasks) * 100
        },
        results: results,
        summary: {
          signals_generated: results.signal_generation?.data?.signals_generated || 0,
          trades_executed: results.auto_trading?.data?.auto_executions || 0,
          symbols_scanned: results.scanner_update?.data?.symbols_scanned || 0,
          system_healthy: successCount >= 3
        },
        next_run: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next run in 15 minutes
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Signals Scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})