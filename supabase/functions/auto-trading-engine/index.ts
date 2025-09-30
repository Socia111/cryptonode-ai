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
    console.log('🤖 Auto Trading Engine started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action = 'process_signals', min_score = 75 } = await req.json() || {}

    if (action === 'status') {
      return new Response(
        JSON.stringify({
          success: true,
          engine: 'Auto Trading Engine',
          version: '1.0.0',
          status: 'active',
          features: ['signal_processing', 'auto_execution', 'risk_management'],
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active high-score signals
    const { data: signals, error: signalsError } = await supabaseClient
      .from('signals')
      .select('*')
      .eq('is_active', true)
      .gte('score', min_score)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('score', { ascending: false })
      .limit(10)

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`)
    }

    console.log(`📊 Found ${signals?.length || 0} high-quality signals`)

    const processedSignals = []
    const executions = []

    for (const signal of signals || []) {
      try {
        // Check if this signal has already been processed
        const { data: existingExecution } = await supabaseClient
          .from('trading_executions')
          .select('id')
          .eq('signal_id', signal.id)
          .single()

        if (existingExecution) {
          console.log(`Signal ${signal.id} already processed, skipping`)
          continue
        }

        // Risk assessment
        const riskScore = calculateRiskScore(signal)
        
        if (riskScore > 70) {
          console.log(`Signal ${signal.id} rejected due to high risk: ${riskScore}`)
          continue
        }

        // Auto-execute if conditions are met
        const autoTradingEnabled = Deno.env.get('AUTO_TRADING_ENABLED') === 'true'
        
        if (autoTradingEnabled && signal.score >= 80) {
          try {
            console.log(`🎯 Auto-executing signal: ${signal.symbol} ${signal.direction}`)
            
            // Call bybit-live-trading function
            const executionResponse = await supabaseClient.functions.invoke('bybit-live-trading', {
              body: {
                action: 'execute_trade',
                signal: signal
              }
            })

            if (executionResponse.error) {
              throw new Error(executionResponse.error.message)
            }

            executions.push({
              signal_id: signal.id,
              symbol: signal.symbol,
              direction: signal.direction,
              status: 'executed',
              execution_data: executionResponse.data
            })

          } catch (executionError) {
            console.error(`Failed to execute signal ${signal.id}:`, executionError)
            
            // Log failed execution
            await supabaseClient.from('trading_executions').insert({
              symbol: signal.symbol,
              side: signal.direction.toLowerCase(),
              signal_id: signal.id,
              status: 'failed',
              error_message: executionError.message,
              executed_at: new Date().toISOString()
            })
          }
        } else {
          // Queue for manual review
          await supabaseClient.from('execution_queue').insert({
            signal_id: signal.id,
            symbol: signal.symbol,
            side: signal.direction.toLowerCase(),
            amount_usd: 100, // Default amount
            signal: signal,
            status: 'queued',
            metadata: {
              auto_trading_score: signal.score,
              risk_score: riskScore,
              created_by: 'auto_trading_engine'
            }
          })
        }

        processedSignals.push({
          id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          score: signal.score,
          risk_score: riskScore,
          auto_executed: autoTradingEnabled && signal.score >= 80,
          queued_for_manual: !autoTradingEnabled || signal.score < 80
        })

      } catch (error) {
        console.error(`Error processing signal ${signal.id}:`, error)
      }
    }

    // Update system status
    await supabaseClient
      .from('system_status')
      .upsert({
        service_name: 'auto_trading_engine',
        status: 'active',
        last_update: new Date().toISOString(),
        success_count: processedSignals.length,
        metadata: {
          signals_processed: processedSignals.length,
          auto_executions: executions.length,
          queued_signals: processedSignals.filter(s => s.queued_for_manual).length,
          auto_trading_enabled: Deno.env.get('AUTO_TRADING_ENABLED') === 'true'
        }
      }, { onConflict: 'service_name' })

    console.log(`✅ Processed ${processedSignals.length} signals, executed ${executions.length} trades`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_processed: processedSignals.length,
        auto_executions: executions.length,
        processed_signals: processedSignals,
        executions: executions,
        summary: {
          high_score_signals: processedSignals.filter(s => s.score >= 85).length,
          auto_executed: executions.length,
          queued_for_manual: processedSignals.filter(s => s.queued_for_manual).length,
          auto_trading_enabled: Deno.env.get('AUTO_TRADING_ENABLED') === 'true'
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Auto Trading Engine error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function calculateRiskScore(signal: any): number {
  let risk = 30 // Base risk
  
  // Score-based risk (higher score = lower risk)
  if (signal.score >= 85) risk -= 10
  else if (signal.score >= 75) risk -= 5
  else if (signal.score < 65) risk += 15
  
  // Confidence-based risk
  if (signal.confidence >= 0.8) risk -= 5
  else if (signal.confidence < 0.6) risk += 10
  
  // Timeframe-based risk
  if (signal.timeframe === '1h') risk += 5
  else if (signal.timeframe === '15m') risk += 10
  else if (signal.timeframe === '4h') risk -= 5
  
  // Check if stop loss is set
  if (!signal.stop_loss) risk += 15
  
  // Volatility check
  if (signal.metadata?.rsi) {
    const rsi = signal.metadata.rsi
    if (rsi < 20 || rsi > 80) risk += 10
  }
  
  return Math.min(100, Math.max(0, risk))
}