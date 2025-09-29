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

    const { action, user_id, ...params } = await req.json()
    
    // Get user's trading account if user_id provided
    let tradingAccount = null
    if (user_id) {
      const { data: accounts } = await supabaseClient
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', user_id)
        .eq('exchange', 'bybit')
        .eq('is_active', true)
        .limit(1)
      
      tradingAccount = accounts?.[0]
    }

    switch (action) {
      case 'status':
        return new Response(
          JSON.stringify({
            success: true,
            status: 'connected',
            live_trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
            paper_trading: Deno.env.get('PAPER_TRADING') === 'true',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'balance':
        if (!tradingAccount) {
          return new Response(
            JSON.stringify({ error: 'No trading account found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        
        // Mock balance for development
        return new Response(
          JSON.stringify({
            success: true,
            balance: {
              total_balance: "10000.00",
              available_balance: "9500.00",
              currency: "USDT"
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'positions':
        if (!tradingAccount) {
          return new Response(
            JSON.stringify({ error: 'No trading account found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            positions: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'execute_trade':
        const { symbol, side, amount, leverage = 1 } = params
        
        if (!symbol || !side || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        // Log trade execution
        const tradeId = crypto.randomUUID()
        await supabaseClient
          .from('execution_orders')
          .insert({
            id: tradeId,
            user_id,
            symbol,
            side,
            amount: parseFloat(amount),
            leverage: parseFloat(leverage),
            status: 'completed',
            executed_at: new Date().toISOString()
          })

        return new Response(
          JSON.stringify({
            success: true,
            trade_id: tradeId,
            symbol,
            side,
            amount,
            status: 'executed',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'process_queue':
        // Process automated trading queue
        const { data: queuedTrades } = await supabaseClient
          .from('execution_queue')
          .select('*')
          .eq('status', 'queued')
          .limit(10)

        let processedCount = 0
        for (const trade of queuedTrades || []) {
          try {
            // Update trade status
            await supabaseClient
              .from('execution_queue')
              .update({ 
                status: 'processing',
                locked_at: new Date().toISOString()
              })
              .eq('id', trade.id)

            // Simulate trade execution
            await new Promise(resolve => setTimeout(resolve, 100))

            await supabaseClient
              .from('execution_queue')
              .update({ 
                status: 'completed',
                locked_at: null
              })
              .eq('id', trade.id)

            processedCount++
          } catch (error) {
            console.error(`Error processing trade ${trade.id}:`, error)
            await supabaseClient
              .from('execution_queue')
              .update({ 
                status: 'error',
                locked_at: null,
                last_error: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq('id', trade.id)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            processed_trades: processedCount,
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
    console.error('Bybit live trading error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})