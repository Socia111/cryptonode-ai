import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Live Signal Orchestrator] Starting comprehensive signal generation...')
    
    // 1. Trigger live exchange feed
    console.log('[Orchestrator] Step 1: Fetching live market data...')
    const feedResponse = await supabase.functions.invoke('live-exchange-feed', {
      body: { comprehensive: true }
    })
    
    if (feedResponse.error) {
      console.error('[Orchestrator] Feed error:', feedResponse.error)
    } else {
      console.log('[Orchestrator] ✅ Market data updated')
    }

    // 2. Run enhanced signal generation
    console.log('[Orchestrator] Step 2: Generating enhanced signals...')
    const enhancedResponse = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { source: 'live_orchestrator' }
    })
    
    if (enhancedResponse.error) {
      console.error('[Orchestrator] Enhanced generation error:', enhancedResponse.error)
    } else {
      console.log('[Orchestrator] ✅ Enhanced signals generated')
    }

    // 3. Run AItradeX1 enhanced scanner
    console.log('[Orchestrator] Step 3: Running AItradeX1 enhanced scanner...')
    const scannerResponse = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: { orchestrated: true }
    })
    
    if (scannerResponse.error) {
      console.error('[Orchestrator] Scanner error:', scannerResponse.error)
    } else {
      console.log('[Orchestrator] ✅ AItradeX1 scanner completed')
    }

    // 4. Check for signals needing automated execution
    console.log('[Orchestrator] Step 4: Checking for automated trading opportunities...')
    const { data: activeConfigs, error: configError } = await supabase
      .from('automated_trading_config')
      .select('*')
      .eq('enabled', true)

    if (configError) {
      console.error('[Orchestrator] Config error:', configError)
    } else if (activeConfigs && activeConfigs.length > 0) {
      console.log(`[Orchestrator] Found ${activeConfigs.length} users with automated trading enabled`)
      
      // Get high-scoring signals for automated execution
      const { data: highScoreSignals, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 85) // Only very high confidence signals
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .is('metadata->executed', null) // Not already executed
        .order('score', { ascending: false })
        .limit(10)

      if (signalsError) {
        console.error('[Orchestrator] Signals error:', signalsError)
      } else if (highScoreSignals && highScoreSignals.length > 0) {
        console.log(`[Orchestrator] Found ${highScoreSignals.length} high-score signals for auto-trading`)
        
        // For each user with auto-trading enabled, check their signal preferences
        for (const config of activeConfigs) {
          const eligibleSignals = highScoreSignals.filter(signal => {
            // Check minimum signal score
            if (signal.score < (config.min_signal_score || 75)) return false
            
            // Check excluded symbols
            if (config.excluded_symbols && config.excluded_symbols.includes(signal.symbol)) return false
            
            // Check preferred timeframes
            if (config.preferred_timeframes && config.preferred_timeframes.length > 0) {
              if (!config.preferred_timeframes.includes(signal.timeframe)) return false
            }
            
            return true
          })
          
          if (eligibleSignals.length > 0) {
            console.log(`[Orchestrator] User ${config.user_id}: ${eligibleSignals.length} eligible signals`)
            
            // Take the highest scoring signal for this user
            const topSignal = eligibleSignals[0]
            
            // Execute the trade (paper mode for now)
            try {
              const executeResponse = await supabase.functions.invoke('automated-trading-executor', {
                body: {
                  signal_id: topSignal.id,
                  user_id: config.user_id,
                  symbol: topSignal.symbol,
                  direction: topSignal.direction,
                  amount_usd: 100, // Default amount - should be configurable
                  leverage: 1, // Conservative leverage
                  stop_loss: topSignal.stop_loss,
                  take_profit: topSignal.take_profit,
                  paper_mode: true
                }
              })
              
              if (executeResponse.error) {
                console.error(`[Orchestrator] Execution error for user ${config.user_id}:`, executeResponse.error)
              } else {
                console.log(`[Orchestrator] ✅ Auto-executed trade for user ${config.user_id}: ${topSignal.symbol}`)
              }
            } catch (executeError) {
              console.error(`[Orchestrator] Execute error:`, executeError)
            }
          }
        }
      }
    }

    // 5. Update system status
    console.log('[Orchestrator] Step 5: Updating system status...')
    await supabase
      .from('app_settings')
      .upsert({
        key: 'last_orchestrator_run',
        value: {
          timestamp: new Date().toISOString(),
          steps_completed: 5,
          success: true
        }
      })

    return new Response(JSON.stringify({
      success: true,
      message: 'Live signal orchestration completed successfully',
      timestamp: new Date().toISOString(),
      steps_completed: 5,
      automated_trades_checked: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Live Signal Orchestrator] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})