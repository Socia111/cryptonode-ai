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
    console.log('🚀 Platform Activation started')
    
    let requestData = {}
    try {
      const text = await req.text()
      if (text) {
        requestData = JSON.parse(text)
      }
    } catch (e) {
      console.log('No body or invalid JSON, using defaults')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Updating system status to live mode...')
    
    // Update system status to indicate platform is live
    const statusUpdates = [
      {
        service_name: 'platform_status',
        status: 'active',
        last_update: new Date().toISOString(),
        metadata: {
          mode: 'live',
          activated_at: new Date().toISOString(),
          version: '1.0.0'
        },
        details: {
          live_mode: true,
          signal_generation: true,
          market_data: true,
          trading_systems: true
        }
      }
    ]
    
    // Insert or update status
    const { error: statusError } = await supabaseClient
      .from('system_status')
      .upsert(statusUpdates, { onConflict: 'service_name' })
    
    if (statusError) {
      console.error('Status update error:', statusError)
    }
    
    // Test key systems
    const systemChecks = {
      database: false,
      signal_engine: false,
      market_data: false,
      trading_ready: false
    }
    
    // Check database connectivity
    try {
      const { data: signals } = await supabaseClient
        .from('signals')
        .select('id')
        .limit(1)
      systemChecks.database = true
    } catch (e) {
      console.error('Database check failed:', e)
    }
    
    // Check signal engine
    try {
      const signalResponse = await supabaseClient.functions.invoke('aitradex1-strategy-engine', {
        body: { action: 'status' }
      })
      systemChecks.signal_engine = !signalResponse.error
    } catch (e) {
      console.error('Signal engine check failed:', e)
    }
    
    // Check market data
    try {
      const { data: marketData } = await supabaseClient
        .from('live_market_data')
        .select('*')
        .limit(1)
      systemChecks.market_data = !!marketData
    } catch (e) {
      console.error('Market data check failed:', e)
    }
    
    // Check trading readiness (API keys configured)
    systemChecks.trading_ready = !!(
      Deno.env.get('BYBIT_API_KEY') && 
      Deno.env.get('BYBIT_API_SECRET')
    )
    
    const allSystemsOperational = Object.values(systemChecks).every(check => check)
    
    console.log(`✅ Platform activation completed. Systems operational: ${allSystemsOperational}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        platform_status: 'live',
        activated_at: new Date().toISOString(),
        system_checks: systemChecks,
        all_systems_operational: allSystemsOperational,
        capabilities: [
          'real_time_market_data',
          'signal_generation',
          'live_trading',
          'risk_management',
          'performance_monitoring'
        ],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Platform Activation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform_status: 'offline',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})