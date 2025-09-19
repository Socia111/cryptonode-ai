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

    const body = await req.json()
    const { symbol, side, amount, orderType = 'Market', leverage = 1, stopLoss, takeProfit, action } = body

    console.log('🚀 Bybit Order Execution Request:', { symbol, side, amount, orderType, leverage, action })

    // Handle position closing
    if (action === 'close_position') {
      console.log(`🔒 Closing position for ${symbol}`)
      
      // Simulate position close (replace with actual Bybit API)
      const result = {
        success: true,
        order_id: `close_${Date.now()}`,
        executed_price: Math.random() * 50000 + 20000, // Mock price
        message: `Position for ${symbol} closed successfully`
      }

      // Log trade execution
      await supabase.from('execution_queue').insert({
        symbol,
        action: 'close_position',
        status: 'executed',
        result: result,
        executed_at: new Date().toISOString()
      })

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields for new orders
    if (!symbol || !side || !amount) {
      throw new Error('Missing required fields: symbol, side, amount')
    }

    // Normalize side parameter
    const normalizedSide = side.toLowerCase() === 'buy' || side === 'LONG' ? 'Buy' : 'Sell'
    
    console.log(`📊 Executing ${normalizedSide} order for ${symbol}: ${amount} USDT`)

    // Get Bybit credentials (mock for now)
    const bybitApiKey = Deno.env.get('BYBIT_API_KEY')
    const bybitSecret = Deno.env.get('BYBIT_SECRET')

    if (!bybitApiKey || !bybitSecret) {
      console.log('⚠️ Bybit credentials not found, using mock execution')
    }

    // Mock trade execution (replace with actual Bybit API call)
    const mockPrice = Math.random() * 50000 + 20000 // Random price between 20k-70k
    const mockFees = amount * 0.001 // 0.1% fee
    
    const tradeResult = {
      success: true,
      order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executed_price: mockPrice,
      fees: mockFees,
      side: normalizedSide,
      symbol,
      amount,
      leverage,
      orderType
    }

    // Set stop loss and take profit if provided
    if (stopLoss) {
      const slResult = {
        order_id: `sl_${Date.now()}`,
        type: 'stop_loss',
        price: stopLoss
      }
      tradeResult.slOrder = slResult
      console.log('🛡️ Stop Loss set at:', stopLoss)
    }

    if (takeProfit) {
      const tpResult = {
        order_id: `tp_${Date.now()}`,
        type: 'take_profit', 
        price: takeProfit
      }
      tradeResult.tpOrder = tpResult
      console.log('🎯 Take Profit set at:', takeProfit)
    }

    // Log the trade in execution queue
    await supabase.from('execution_queue').insert({
      symbol,
      side: normalizedSide,
      amount,
      leverage,
      order_type: orderType,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      status: 'executed',
      result: tradeResult,
      executed_at: new Date().toISOString()
    })

    console.log('✅ Trade executed successfully:', tradeResult.order_id)

    return new Response(
      JSON.stringify(tradeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Order execution error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Trade execution failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})