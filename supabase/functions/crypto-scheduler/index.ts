import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SchedulerConfig {
  enable_aitradex: boolean
  enable_aira: boolean
  scan_intervals: {
    aitradex_minutes: number
    aira_minutes: number
  }
  symbols_limit: number
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

    const body = await req.json()
    const config: SchedulerConfig = {
      enable_aitradex: body.enable_aitradex ?? true,
      enable_aira: body.enable_aira ?? true,
      scan_intervals: {
        aitradex_minutes: body.scan_intervals?.aitradex_minutes ?? 5,
        aira_minutes: body.scan_intervals?.aira_minutes ?? 15
      },
      symbols_limit: body.symbols_limit ?? 100
    }

    console.log('⏰ Starting crypto scanning scheduler...', config)

    // Store scheduler configuration
    await supabase.from('configs').upsert({
      key: 'scheduler_config',
      value: config,
      updated_at: new Date()
    })

    // Start background scanning tasks
    if (config.enable_aitradex) {
      startAITRADEX1Scheduler(supabase, config.scan_intervals.aitradex_minutes, config.symbols_limit)
    }

    if (config.enable_aira) {
      startAIRATETHECOINScheduler(supabase, config.scan_intervals.aira_minutes, config.symbols_limit)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Crypto scanning scheduler started',
        config,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function startAITRADEX1Scheduler(supabase: any, intervalMinutes: number, symbolsLimit: number) {
  console.log(`📊 Starting AITRADEX1 scheduler (every ${intervalMinutes} minutes)`)
  
  const runScan = async () => {
    try {
      console.log('🔄 Running scheduled AITRADEX1 scan...')
      
      const { data, error } = await supabase.functions.invoke('realtime-crypto-scanner', {
        body: {
          algorithms: ['AITRADEX1'],
          timeframes: ['5m', '15m', '1h'],
          limit: symbolsLimit
        }
      })

      if (error) {
        console.error('AITRADEX1 scheduler error:', error)
        return
      }

      const results = data?.scan_results
      console.log(`✅ AITRADEX1 scan completed: ${results?.aitradex_signals || 0} signals from ${results?.processed_symbols?.length || 0} symbols`)

      // Send alerts for high-score signals
      if (results?.aitradex_signals > 0) {
        await sendSignalAlerts(supabase, 'AITRADEX1')
      }

    } catch (error) {
      console.error('AITRADEX1 scan error:', error)
    }
  }

  // Run initial scan
  runScan()

  // Schedule recurring scans
  setInterval(runScan, intervalMinutes * 60 * 1000)
}

function startAIRATETHECOINScheduler(supabase: any, intervalMinutes: number, symbolsLimit: number) {
  console.log(`🎯 Starting AIRATETHECOIN scheduler (every ${intervalMinutes} minutes)`)
  
  const runScan = async () => {
    try {
      console.log('🔄 Running scheduled AIRATETHECOIN scan...')
      
      const { data, error } = await supabase.functions.invoke('realtime-crypto-scanner', {
        body: {
          algorithms: ['AIRATETHECOIN'],
          timeframes: ['1h', '4h', '1d'],
          limit: symbolsLimit * 2 // AIRA scans more symbols for rankings
        }
      })

      if (error) {
        console.error('AIRATETHECOIN scheduler error:', error)
        return
      }

      const results = data?.scan_results
      console.log(`✅ AIRATETHECOIN scan completed: ${results?.aira_rankings || 0} rankings from ${results?.processed_symbols?.length || 0} symbols`)

      // Update rankings and send top picks alerts
      if (results?.aira_rankings > 0) {
        await updateAndAlertTopAIRAPicks(supabase)
      }

    } catch (error) {
      console.error('AIRATETHECOIN scan error:', error)
    }
  }

  // Run initial scan
  runScan()

  // Schedule recurring scans
  setInterval(runScan, intervalMinutes * 60 * 1000)
}

async function sendSignalAlerts(supabase: any, algorithm: string) {
  try {
    // Get recent high-score signals
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .eq('algo', algorithm)
      .gte('score', 85) // High-confidence signals only
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !signals?.length) return

    for (const signal of signals) {
      // Send Telegram alert
      await supabase.functions.invoke('telegram-bot', {
        body: {
          message_type: 'signal_alert',
          signal_data: signal
        }
      })

      // Log alert
      await supabase.from('alerts_log').insert({
        signal_id: signal.id,
        channel: 'telegram',
        status: 'sent',
        created_at: new Date()
      })
    }

    console.log(`📨 Sent ${signals.length} ${algorithm} signal alerts`)

  } catch (error) {
    console.error('Error sending signal alerts:', error)
  }
}

async function updateAndAlertTopAIRAPicks(supabase: any) {
  try {
    // Get top AIRA ranked coins
    const { data: topPicks, error } = await supabase
      .from('aira_rankings')
      .select('*')
      .gte('aira_score', 80) // Prime tier only
      .order('aira_score', { ascending: false })
      .limit(10)

    if (error || !topPicks?.length) return

    // Update ranks
    for (let i = 0; i < topPicks.length; i++) {
      await supabase
        .from('aira_rankings')
        .update({ rank: i + 1 })
        .eq('id', topPicks[i].id)
    }

    // Send alerts for new top picks
    const topPick = topPicks[0]
    if (topPick.aira_score >= 90) {
      await supabase.functions.invoke('telegram-bot', {
        body: {
          message_type: 'aira_alert',
          coin_data: topPick
        }
      })

      console.log(`🎯 Sent AIRA top pick alert for ${topPick.symbol} (score: ${topPick.aira_score})`)
    }

  } catch (error) {
    console.error('Error updating AIRA rankings:', error)
  }
}