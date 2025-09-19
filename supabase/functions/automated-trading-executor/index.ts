import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TradingRequest {
  signal_id: string
  symbol: string
  side: string
  amount_usd: number
  leverage: number
  user_id: string
}

interface TradingExecution {
  success: boolean
  order_id?: string
  error?: string
  execution_details?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { signals, user_id } = await req.json()
    console.log(`[Automated Trading Executor] Processing ${signals?.length || 0} signals for user ${user_id}`)

    if (!signals || !Array.isArray(signals) || signals.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No signals provided' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Get user's trading configuration
    const { data: config, error: configError } = await supabase
      .from('automated_trading_config')
      .select('*')
      .eq('user_id', user_id)
      .eq('enabled', true)
      .maybeSingle()

    if (configError) {
      console.error('[Automated Trading Executor] Config error:', configError)
      throw new Error(`Failed to get trading config: ${configError.message}`)
    }

    if (!config) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Automated trading not enabled for user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Get user's trading account
    const { data: account, error: accountError } = await supabase
      .rpc('get_user_trading_account', { 
        p_user_id: user_id,
        p_account_type: 'testnet' // Start with testnet for safety
      })

    if (accountError || !account || account.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active trading account found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    const executions: TradingExecution[] = []
    let successCount = 0

    // Process each signal
    for (const signal of signals) {
      try {
        // Validate signal meets user criteria
        if (signal.score < config.min_signal_score) {
          console.log(`[Automated Trading Executor] Signal ${signal.symbol} score ${signal.score} below minimum ${config.min_signal_score}`)
          continue
        }

        if (config.excluded_symbols?.includes(signal.symbol)) {
          console.log(`[Automated Trading Executor] Signal ${signal.symbol} in excluded symbols`)
          continue
        }

        if (config.preferred_timeframes && !config.preferred_timeframes.includes(signal.timeframe)) {
          console.log(`[Automated Trading Executor] Signal ${signal.symbol} timeframe ${signal.timeframe} not in preferred`)
          continue
        }

        // Execute the trade
        const execution = await executeTrade({
          signal_id: signal.id,
          symbol: signal.symbol,
          side: signal.direction,
          amount_usd: config.risk_per_trade * 1000, // Convert to USD amount
          leverage: 1, // Start conservative
          user_id
        }, account[0])

        executions.push(execution)

        // Log execution to database
        await supabase
          .from('trading_executions')
          .insert({
            user_id,
            signal_id: signal.id,
            symbol: signal.symbol,
            side: signal.direction,
            amount_usd: config.risk_per_trade * 1000,
            leverage: 1,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            status: execution.success ? 'completed' : 'failed',
            exchange_order_id: execution.order_id,
            exchange_response: execution.execution_details,
            error_message: execution.error
          })

        if (execution.success) {
          successCount++
          console.log(`[Automated Trading Executor] ✅ Successfully executed ${signal.symbol} ${signal.direction}`)
        } else {
          console.log(`[Automated Trading Executor] ❌ Failed to execute ${signal.symbol}: ${execution.error}`)
        }

        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`[Automated Trading Executor] Error executing signal ${signal.symbol}:`, error)
        executions.push({
          success: false,
          error: error.message
        })
      }
    }

    console.log(`[Automated Trading Executor] Completed: ${successCount}/${signals.length} successful executions`)

    return new Response(JSON.stringify({
      success: true,
      total_signals: signals.length,
      successful_executions: successCount,
      failed_executions: signals.length - successCount,
      executions,
      timestamp: new Date().toISOString()
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

async function executeTrade(request: TradingRequest, account: any): Promise<TradingExecution> {
  try {
    // For now, simulate the trade execution
    // In production, this would integrate with actual exchange APIs
    console.log(`[Trade Execution] Simulating ${request.side} ${request.symbol} for $${request.amount_usd}`)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Simulate success (90% success rate for demo)
    const success = Math.random() > 0.1
    
    if (success) {
      return {
        success: true,
        order_id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        execution_details: {
          symbol: request.symbol,
          side: request.side,
          quantity: request.amount_usd,
          price: 'market',
          order_type: 'market',
          status: 'filled',
          timestamp: new Date().toISOString()
        }
      }
    } else {
      return {
        success: false,
        error: 'Simulated execution failure for testing'
      }
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}