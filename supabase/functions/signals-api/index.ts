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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'list'

    if (req.method === 'GET' && action === 'list') {
      // Fetch ONLY real signals (no mock data)
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .in('source', ['real_market_data', 'live_market_data', 'complete_algorithm_live', 'technical_indicators_real'])
        .gte('score', 70)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      // Filter out any remaining mock signals
      const realSignals = (signals || []).filter(signal => {
        return signal.source !== 'demo' && 
               signal.source !== 'mock' && 
               signal.algo !== 'demo_generator' &&
               !signal.algo?.includes('mock');
      });

      return new Response(
        JSON.stringify({
          success: true,
          signals: realSignals,
          count: realSignals.length,
          data_source: 'real_market_only',
          filtered_out: (signals?.length || 0) - realSignals.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      
      if (action === 'create') {
        // Create new signal
        const { data, error } = await supabase
          .from('signals')
          .insert(body.signal)
          .select()

        if (error) {
          throw error
        }

        return new Response(
          JSON.stringify({
            success: true,
            signal: data[0],
            message: 'Signal created successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (action === 'bulk_create') {
        // Create multiple signals
        const { data, error } = await supabase
          .from('signals')
          .insert(body.signals)
          .select()

        if (error) {
          throw error
        }

        return new Response(
          JSON.stringify({
            success: true,
            signals: data,
            count: data.length,
            message: 'Signals created successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action or method'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in signals API:', error)
    
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