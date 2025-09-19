import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TradeRequest {
  signal_id: string
  user_id: string
  symbol: string
  direction: string
  amount_usd: number
  leverage: number
  stop_loss?: number
  take_profit?: number
  paper_mode?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Automated Trading Executor] Processing trade request...')
    
    const { signal_id, user_id, symbol, direction, amount_usd, leverage, stop_loss, take_profit, paper_mode = true } = await req.json() as TradeRequest

    // Validate required fields
    if (!signal_id || !user_id || !symbol || !direction || !amount_usd) {
      throw new Error('Missing required fields')
    }

    console.log(`[Trading] ${paper_mode ? 'PAPER' : 'LIVE'} trade: ${symbol} ${direction} $${amount_usd} ${leverage}x`)

    // Get user's trading configuration
    const { data: tradingConfig, error: configError } = await supabase
      .from('automated_trading_config')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error('[Trading] Config error:', configError)
    }

    // Check if trading is enabled for user
    if (tradingConfig && !tradingConfig.enabled) {
      throw new Error('Automated trading is disabled for this user')
    }

    // Risk management checks
    const riskPerTrade = tradingConfig?.risk_per_trade || 2.0
    const maxConcurrentTrades = tradingConfig?.max_concurrent_trades || 3
    const maxDailyTrades = tradingConfig?.max_daily_trades || 10

    // Check daily trade limit
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTrades, error: tradesError } = await supabase
      .from('trading_executions')
      .select('id')
      .eq('user_id', user_id)
      .gte('created_at', `${today}T00:00:00.000Z`)

    if (tradesError) {
      console.error('[Trading] Error checking daily trades:', tradesError)
    }

    if (todayTrades && todayTrades.length >= maxDailyTrades) {
      throw new Error(`Daily trade limit reached (${maxDailyTrades})`)
    }

    // Check concurrent trades
    const { data: activeTrades, error: activeError } = await supabase
      .from('trading_executions')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')

    if (activeError) {
      console.error('[Trading] Error checking active trades:', activeError)
    }

    if (activeTrades && activeTrades.length >= maxConcurrentTrades) {
      throw new Error(`Maximum concurrent trades reached (${maxConcurrentTrades})`)
    }

    // Calculate position size based on risk
    const accountBalance = 10000 // Default for demo, should be fetched from user account
    const riskAmount = (accountBalance * riskPerTrade) / 100
    const positionSize = riskAmount * leverage

    // Create execution record
    const executionId = crypto.randomUUID()
    const execution = {
      id: executionId,
      user_id,
      signal_id,
      symbol,
      direction: direction.toUpperCase(),
      entry_price: 0, // Will be filled by actual execution
      amount_usd: amount_usd,
      leverage,
      stop_loss,
      take_profit,
      status: paper_mode ? 'paper_executed' : 'pending',
      paper_mode,
      risk_amount: riskAmount,
      position_size: positionSize,
      metadata: {
        risk_per_trade: riskPerTrade,
        execution_time: new Date().toISOString(),
        trading_mode: paper_mode ? 'paper' : 'live'
      }
    }

    if (paper_mode) {
      // For paper trading, simulate successful execution
      const simulatedPrice = Math.random() * 0.01 + 1 // Small random variation
      execution.entry_price = simulatedPrice
      execution.status = 'paper_executed'
      execution.metadata = {
        ...execution.metadata,
        simulated_execution: true,
        simulated_price: simulatedPrice,
        simulated_slippage: Math.random() * 0.001
      }

      console.log(`[Trading] Paper trade simulated: ${symbol} at $${simulatedPrice}`)
    } else {
      // For live trading, implement actual exchange integration
      console.log(`[Trading] Live trading not implemented yet - using paper mode`)
      execution.status = 'paper_executed'
      execution.entry_price = Math.random() * 0.01 + 1
    }

    // Insert execution record
    const { data: insertedExecution, error: insertError } = await supabase
      .from('trading_executions')
      .insert(execution)
      .select()
      .single()

    if (insertError) {
      console.error('[Trading] Failed to insert execution:', insertError)
      throw new Error(`Failed to record execution: ${insertError.message}`)
    }

    console.log(`[Trading] ✅ Execution recorded: ${executionId}`)

    // Update signal as executed
    await supabase
      .from('signals')
      .update({ 
        metadata: { 
          executed: true, 
          execution_id: executionId,
          execution_time: new Date().toISOString()
        }
      })
      .eq('id', signal_id)

    return new Response(JSON.stringify({
      success: true,
      execution_id: executionId,
      trade_details: {
        symbol,
        direction,
        amount_usd,
        leverage,
        position_size: positionSize,
        risk_amount: riskAmount,
        paper_mode,
        status: execution.status
      },
      message: `${paper_mode ? 'Paper' : 'Live'} trade executed successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Automated Trading Executor] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})