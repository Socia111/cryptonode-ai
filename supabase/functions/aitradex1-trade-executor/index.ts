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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'status':
        return new Response(
          JSON.stringify({
            success: true,
            status: 'online',
            executor_version: '1.0.0',
            position_mode: 'hedge',
            trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'execute_trade':
        const { symbol, side, amount, user_id } = params
        
        if (!symbol || !side || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        // Validate position mode (simulate Bybit API call)
        const positionMode = 'hedge' // Default to hedge mode for derivatives
        
        // Create execution order
        const tradeId = crypto.randomUUID()
        const order = {
          id: tradeId,
          user_id,
          symbol,
          side,
          amount: parseFloat(amount),
          status: 'executed',
          position_mode: positionMode,
          executed_at: new Date().toISOString(),
          executor: 'aitradex1_trade_executor'
        }

        const { error } = await supabaseClient
          .from('execution_orders')
          .insert(order)

        if (error) {
          console.error('Failed to insert order:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to execute trade' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            trade_id: tradeId,
            symbol,
            side,
            amount,
            position_mode: positionMode,
            status: 'executed',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_positions':
        // Return mock positions for now
        return new Response(
          JSON.stringify({
            success: true,
            positions: [],
            total_positions: 0,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('AItradeX1 trade executor error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})