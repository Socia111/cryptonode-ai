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
    const { action, symbol, side, quantity } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'place_order') {
      // Paper trading simulation
      const mockOrder = {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: `paper_${Date.now()}`,
          symbol,
          side,
          qty: quantity,
          orderStatus: 'Filled'
        }
      }

      await supabaseClient.from('execution_orders').insert({
        symbol,
        side: side.toLowerCase(),
        qty: quantity,
        status: 'filled',
        real_trade: false,
        exchange_order_id: mockOrder.result.orderId
      })

      return new Response(JSON.stringify(mockOrder), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'get_balance') {
      return new Response(JSON.stringify({
        retCode: 0,
        result: { list: [{ totalWalletBalance: '10000.00' }] }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})