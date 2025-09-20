import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoTradingConfig {
  enabled: boolean
  user_id: string
  min_signal_score: number
  max_position_size: number
  risk_per_trade: number
  max_concurrent_trades: number
}

interface Signal {
  id: string
  symbol: string
  direction: string
  score: number
  price: number
  entry_price: number
  stop_loss?: number
  take_profit?: number
  timeframe: string
  created_at: string
}

class TradingOrchestrator {
  private supabase: any

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  async processSignals(): Promise<any> {
    console.log('🤖 Starting automated trading signal processing...')

    // Get all enabled auto trading configs
    const { data: configs, error: configError } = await this.supabase
      .from('automated_trading_config')
      .select('*')
      .eq('enabled', true)

    if (configError) {
      throw new Error(`Failed to fetch trading configs: ${configError.message}`)
    }

    console.log(`Found ${configs?.length || 0} enabled auto trading accounts`)

    // Get high-quality signals from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: signals, error: signalsError } = await this.supabase
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', 70)
      .gte('created_at', fiveMinutesAgo)
      .order('score', { ascending: false })
      .limit(20)

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`)
    }

    console.log(`Found ${signals?.length || 0} high-quality signals`)

    const results = []

    // Process each config
    for (const config of configs || []) {
      console.log(`Processing trades for user ${config.user_id}`)
      
      // Check if user has valid trading account
      const { data: account } = await this.supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', config.user_id)
        .eq('exchange', 'bybit')
        .eq('is_active', true)
        .single()

      if (!account) {
        console.log(`No active trading account for user ${config.user_id}`)
        continue
      }

      // Check current open positions
      const { data: openPositions } = await this.supabase
        .from('execution_orders')
        .select('*')
        .eq('user_id', config.user_id)
        .eq('status', 'filled')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const currentOpenTrades = openPositions?.length || 0

      if (currentOpenTrades >= config.max_concurrent_trades) {
        console.log(`User ${config.user_id} has reached max concurrent trades (${currentOpenTrades}/${config.max_concurrent_trades})`)
        continue
      }

      // Process eligible signals
      for (const signal of signals || []) {
        if (signal.score < config.min_signal_score) continue

        // Check if we already traded this signal
        const { data: existingOrder } = await this.supabase
          .from('execution_orders')
          .select('id')
          .eq('user_id', config.user_id)
          .eq('symbol', signal.symbol)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour
          .single()

        if (existingOrder) {
          console.log(`Already traded ${signal.symbol} recently for user ${config.user_id}`)
          continue
        }

        try {
          // Execute the trade
          const tradeResult = await this.executeTrade(config, signal, account)
          results.push({
            user_id: config.user_id,
            signal_id: signal.id,
            symbol: signal.symbol,
            result: tradeResult,
            status: 'success'
          })

          console.log(`✅ Trade executed: ${signal.symbol} for user ${config.user_id}`)
          
          // Limit to one trade per user per run to avoid overloading
          break

        } catch (error: any) {
          console.error(`❌ Trade failed for ${signal.symbol}, user ${config.user_id}:`, error.message)
          results.push({
            user_id: config.user_id,
            signal_id: signal.id,
            symbol: signal.symbol,
            error: error.message,
            status: 'failed'
          })
        }
      }
    }

    return {
      success: true,
      processed_configs: configs?.length || 0,
      available_signals: signals?.length || 0,
      execution_results: results,
      timestamp: new Date().toISOString()
    }
  }

  private async executeTrade(config: AutoTradingConfig, signal: Signal, account: any): Promise<any> {
    // Calculate position size based on risk settings
    const notionalUSD = Math.min(
      config.max_position_size * config.risk_per_trade,
      config.max_position_size
    )

    // Prepare execution payload
    const executionPayload = {
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      notionalUSD,
      signal_id: signal.id,
      entry_price: signal.entry_price || signal.price,
      stop_loss: signal.stop_loss,
      take_profit: signal.take_profit,
      metadata: {
        auto_trade: true,
        signal_score: signal.score,
        config_id: config.user_id,
        timeframe: signal.timeframe
      }
    }

    // Call the trade executor
    const { data, error } = await this.supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'execute',
        ...executionPayload
      }
    })

    if (error) {
      throw new Error(`Trade execution failed: ${error.message}`)
    }

    // Log the automated execution
    await this.supabase.from('execution_queue').insert({
      user_id: config.user_id,
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      amount_usd: notionalUSD,
      signal_id: signal.id,
      status: 'completed',
      metadata: {
        automated: true,
        signal_score: signal.score,
        execution_result: data
      }
    })

    return data
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const orchestrator = new TradingOrchestrator()
    const result = await orchestrator.processSignals()

    return Response.json(result, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Trading orchestrator error:', error)
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})