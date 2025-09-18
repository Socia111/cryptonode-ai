import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const { symbol, side, quantity, orderType = 'Market', testMode = true } = body
    
    console.log('[paper-trading-executor] Executing paper trade:', { symbol, side, quantity, orderType })
    
    if (!symbol || !side || !quantity) {
      throw new Error('Missing required parameters: symbol, side, quantity')
    }

    // Simulate paper trade execution
    const executionPrice = 50000 + (Math.random() - 0.5) * 1000 // Mock price
    const orderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Log the paper trade
    const { data: order, error } = await supabase
      .from('execution_orders')
      .insert({
        symbol,
        side: side.toUpperCase(),
        qty: quantity,
        status: 'filled',
        paper_mode: true,
        exchange_order_id: orderId,
        amount_usd: quantity * executionPrice,
        raw_response: {
          orderId,
          symbol,
          side,
          quantity,
          price: executionPrice,
          status: 'FILLED',
          executionTime: new Date().toISOString(),
          type: 'paper_trade'
        }
      })
      .select()
      .single()

    if (error) {
      console.error('[paper-trading-executor] Database error:', error)
      throw error
    }

    console.log('[paper-trading-executor] Paper trade executed successfully:', orderId)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId,
        symbol,
        side,
        quantity,
        executionPrice,
        status: 'filled',
        type: 'paper_trade',
        order
      }),
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('[paper-trading-executor] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    )
  }
})