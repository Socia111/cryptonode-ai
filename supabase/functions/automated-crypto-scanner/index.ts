import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('🚀 Starting automated crypto scanning...')

    // Run both algorithms in parallel
    const [aitradexResult, airaResult] = await Promise.all([
      runAITRADEX1Scan(supabase),
      runAIRATETHECOINScan(supabase)
    ])

    // Update AIRA rankings after all scores are calculated
    await updateAIRARankings(supabase)

    const summary = {
      aitradex_signals: aitradexResult.signals_found,
      aira_rankings: airaResult.rankings_updated,
      total_symbols_processed: aitradexResult.symbols_processed + airaResult.symbols_processed,
      scan_duration_ms: Date.now(),
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Scan complete: ${summary.aitradex_signals} signals, ${summary.aira_rankings} rankings`)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        details: {
          aitradex: aitradexResult,
          aira: airaResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Automated scan error:', error)
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

async function runAITRADEX1Scan(supabase: any) {
  console.log('📊 Running AITRADEX1 scan...')
  
  // Call the realtime scanner
  const { data, error } = await supabase.functions.invoke('realtime-crypto-scanner', {
    body: {
      algorithms: ['AITRADEX1'],
      timeframes: ['5m', '15m', '1h'],
      limit: 100
    }
  })

  if (error) {
    console.error('AITRADEX1 scan error:', error)
    return { signals_found: 0, symbols_processed: 0, error: error.message }
  }

  return {
    signals_found: data?.scan_results?.aitradex_signals || 0,
    symbols_processed: data?.scan_results?.processed_symbols?.length || 0
  }
}

async function runAIRATETHECOINScan(supabase: any) {
  console.log('🎯 Running AIRATETHECOIN scan...')
  
  // Call the realtime scanner
  const { data, error } = await supabase.functions.invoke('realtime-crypto-scanner', {
    body: {
      algorithms: ['AIRATETHECOIN'],
      timeframes: ['1h', '4h', '1d'], // AIRA uses longer timeframes
      limit: 200 // Scan more symbols for rankings
    }
  })

  if (error) {
    console.error('AIRATETHECOIN scan error:', error)
    return { rankings_updated: 0, symbols_processed: 0, error: error.message }
  }

  return {
    rankings_updated: data?.scan_results?.aira_rankings || 0,
    symbols_processed: data?.scan_results?.processed_symbols?.length || 0
  }
}

async function updateAIRARankings(supabase: any) {
  console.log('🏆 Updating AIRA rankings...')
  
  try {
    // Get all AIRA scores and assign ranks
    const { data: rankings, error } = await supabase
      .from('aira_rankings')
      .select('*')
      .order('aira_score', { ascending: false })

    if (error) throw error

    // Update ranks
    const updates = rankings?.map((ranking, index) => ({
      id: ranking.id,
      rank: index + 1
    })) || []

    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('aira_rankings')
          .update({ rank: update.rank })
          .eq('id', update.id)
      }
    }

    console.log(`✅ Updated ${updates.length} AIRA rankings`)
    
  } catch (error) {
    console.error('Error updating AIRA rankings:', error)
  }
}