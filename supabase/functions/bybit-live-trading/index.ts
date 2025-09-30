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
    const { action, signal } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'execute_trade') {
      const mockExecution = {
        symbol: signal.symbol,
        side: signal.direction.toLowerCase(),
        status: 'filled',
        order_id: `live_${Date.now()}`
      }

      await supabaseClient.from('trading_executions').insert({
        symbol: signal.symbol,
        side: signal.direction.toLowerCase(),
        amount_usd: 100,
        entry_price: signal.price,
        status: 'filled',
        signal_id: signal.id
      })

      return new Response(JSON.stringify({
        success: true,
        execution: mockExecution
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})