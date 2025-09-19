import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🎯 Starting real-time signal aggregation across all sources...')

    // Trigger all signal generation functions simultaneously
    const signalSources = [
      'aitradex1-enhanced-scanner',
      'enhanced-signal-generation',
      'live-scanner-production'
    ]

    const aggregationPromises = signalSources.map(async (source) => {
      try {
        console.log(`📡 Triggering ${source}...`)
        const { data, error } = await supabase.functions.invoke(source)
        
        if (error) {
          console.error(`❌ ${source} error:`, error)
          return { source, success: false, error: error.message }
        }
        
        console.log(`✅ ${source} completed`)
        return { source, success: true, data }
      } catch (err) {
        console.error(`❌ ${source} failed:`, err)
        return { source, success: false, error: err.message }
      }
    })

    // Wait for all sources to complete
    const results = await Promise.allSettled(aggregationPromises)
    
    // Count successful generations
    let totalSignalsGenerated = 0
    const sourceResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        const sourceResult = result.value
        if (sourceResult.success && sourceResult.data?.signals_generated) {
          totalSignalsGenerated += sourceResult.data.signals_generated
        }
        return sourceResult
      } else {
        return { 
          source: signalSources[index], 
          success: false, 
          error: result.reason?.message || 'Unknown error' 
        }
      }
    })

    // Get latest high-quality signals
    const { data: latestSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', 70)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('score', { ascending: false })
      .limit(50)

    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError)
    }

    // Update system status
    await supabase
      .from('app_settings')
      .upsert({
        key: 'real_time_aggregation_status',
        value: {
          last_run: new Date().toISOString(),
          sources_triggered: signalSources.length,
          total_signals_generated: totalSignalsGenerated,
          active_signals: latestSignals?.length || 0,
          source_results: sourceResults,
          status: 'active'
        }
      }, { onConflict: 'key' })

    console.log(`🎯 Aggregation complete: ${totalSignalsGenerated} signals generated, ${latestSignals?.length || 0} active signals`)

    return new Response(
      JSON.stringify({
        success: true,
        sources_triggered: signalSources.length,
        signals_generated: totalSignalsGenerated,
        active_signals: latestSignals?.length || 0,
        source_results: sourceResults,
        latest_signals: latestSignals?.slice(0, 10) || [],
        message: `Real-time aggregation complete: ${totalSignalsGenerated} signals generated`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Real-time aggregation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Real-time signal aggregation failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})