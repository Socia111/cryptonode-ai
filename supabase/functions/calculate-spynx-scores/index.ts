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

    console.log('🎯 Calculating Spynx scores for active signals...')

    // Get recent signals to calculate scores for
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (signalsError) {
      throw signalsError
    }

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No signals found to calculate scores for',
          scores_calculated: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const scores = []
    let scoresCalculated = 0

    for (const signal of signals) {
      try {
        // Calculate Spynx score based on multiple factors
        const baseScore = signal.score || 75
        const confidenceFactor = (signal.confidence || 0.75) * 100
        const volumeFactor = signal.metadata?.volume_24h ? Math.log10(signal.metadata.volume_24h) * 10 : 50
        const timeFactor = Math.max(0, 100 - ((Date.now() - new Date(signal.created_at).getTime()) / (1000 * 60 * 60))) // Decay over hours
        
        // Spynx scoring algorithm
        const spynxScore = Math.min(100, Math.max(0, 
          baseScore * 0.4 + 
          confidenceFactor * 0.3 + 
          volumeFactor * 0.2 + 
          timeFactor * 0.1
        ))

        const scoreData = {
          signal_id: signal.id,
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          score: Math.round(spynxScore * 100) / 100,
          base_score: baseScore,
          confidence_factor: confidenceFactor,
          volume_factor: volumeFactor,
          time_factor: timeFactor,
          algo: signal.algo || 'aitradex1',
          direction: signal.direction,
          calculated_at: new Date().toISOString(),
          metadata: {
            original_signal: {
              price: signal.price,
              entry_price: signal.entry_price,
              take_profit: signal.take_profit,
              stop_loss: signal.stop_loss
            },
            calculation_factors: {
              base_weight: 0.4,
              confidence_weight: 0.3,
              volume_weight: 0.2,
              time_weight: 0.1
            }
          }
        }

        scores.push(scoreData)
        scoresCalculated++
        
        console.log(`✅ Calculated Spynx score for ${signal.symbol}: ${spynxScore.toFixed(2)}`)
      } catch (err) {
        console.error(`Error calculating score for signal ${signal.id}:`, err)
      }
    }

    // Store the calculated scores (create table if it doesn't exist)
    if (scores.length > 0) {
      // Try to create the spynx_scores table if it doesn't exist
      try {
        await supabase.rpc('create_spynx_scores_table_if_not_exists')
      } catch (e) {
        // Table might already exist, or we don't have the function - that's ok
        console.log('Note: Could not create spynx_scores table, assuming it exists')
      }

      // Insert the scores (we'll use signals table with a special tag for now)
      for (const score of scores) {
        const { error: insertError } = await supabase
          .from('signals')
          .update({
            metadata: {
              ...score.metadata,
              spynx_score: score.score,
              spynx_calculated_at: score.calculated_at
            }
          })
          .eq('id', score.signal_id)

        if (insertError) {
          console.error(`Error updating signal ${score.signal_id} with Spynx score:`, insertError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Spynx scores calculated successfully',
        scores_calculated: scoresCalculated,
        signals_processed: signals.length,
        scores: scores.slice(0, 10) // Return first 10 for preview
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in calculate-spynx-scores:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})