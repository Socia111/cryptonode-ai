import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🧪 Generating test signals...')

    // Generate realistic test signals with real market data structure
    const testSignals = [
      {
        symbol: 'BTCUSDT',
        timeframe: '15m',
        direction: 'LONG',
        price: 97500.50,
        entry_price: 97500.50,
        stop_loss: 96500.00,
        take_profit: 99000.00,
        score: 85,
        confidence: 0.85,
        source: 'test_signal_generation',
        algo: 'enhanced_ai',
        bar_time: new Date().toISOString(),
        exchange: 'bybit',
        metadata: {
          test: true,
          data_source: 'test_generation',
          verified_real_data: false,
          technical_indicators: {
            rsi: 65.2,
            macd: 150.5,
            adx: 45.3,
            stoch_k: 68.1,
            volume_ratio: 1.2
          }
        },
        indicators: {
          rsi: 65.2,
          macd: 150.5,
          adx: 45.3,
          stoch_k: 68.1,
          stoch_d: 65.9,
          ema21: 97200.0,
          ema200: 95800.0,
          volume_ratio: 1.2,
          atr: 500.0
        },
        market_conditions: {
          trend: 'bullish',
          volume: 'high',
          momentum: 'strong'
        },
        diagnostics: {
          market_phase: 'trending',
          signal_quality: 'excellent',
          confluence_factors: 8
        },
        risk: 1.5,
        algorithm_version: 'v1.0',
        execution_priority: 85,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        symbol: 'ETHUSDT',
        timeframe: '30m',
        direction: 'LONG',
        price: 3850.25,
        entry_price: 3850.25,
        stop_loss: 3800.00,
        take_profit: 3950.00,
        score: 78,
        confidence: 0.78,
        source: 'test_signal_generation',
        algo: 'enhanced_ai',
        bar_time: new Date().toISOString(),
        exchange: 'bybit',
        metadata: {
          test: true,
          data_source: 'test_generation',
          verified_real_data: false,
          technical_indicators: {
            rsi: 58.7,
            macd: 25.3,
            adx: 38.2,
            stoch_k: 62.5,
            volume_ratio: 1.1
          }
        },
        indicators: {
          rsi: 58.7,
          macd: 25.3,
          adx: 38.2,
          stoch_k: 62.5,
          stoch_d: 59.8,
          ema21: 3820.5,
          ema200: 3750.0,
          volume_ratio: 1.1,
          atr: 35.0
        },
        market_conditions: {
          trend: 'bullish',
          volume: 'normal',
          momentum: 'moderate'
        },
        diagnostics: {
          market_phase: 'trending',
          signal_quality: 'good',
          confluence_factors: 6
        },
        risk: 1.3,
        algorithm_version: 'v1.0',
        execution_priority: 78,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        symbol: 'SOLUSDT',
        timeframe: '1h',
        direction: 'SHORT',
        price: 245.80,
        entry_price: 245.80,
        stop_loss: 250.00,
        take_profit: 235.00,
        score: 72,
        confidence: 0.72,
        source: 'test_signal_generation',
        algo: 'enhanced_ai',
        bar_time: new Date().toISOString(),
        exchange: 'bybit',
        metadata: {
          test: true,
          data_source: 'test_generation',
          verified_real_data: false,
          technical_indicators: {
            rsi: 72.1,
            macd: -15.2,
            adx: 35.8,
            stoch_k: 78.3,
            volume_ratio: 0.9
          }
        },
        indicators: {
          rsi: 72.1,
          macd: -15.2,
          adx: 35.8,
          stoch_k: 78.3,
          stoch_d: 75.6,
          ema21: 248.3,
          ema200: 255.0,
          volume_ratio: 0.9,
          atr: 8.5
        },
        market_conditions: {
          trend: 'bearish',
          volume: 'low',
          momentum: 'moderate'
        },
        diagnostics: {
          market_phase: 'ranging',
          signal_quality: 'acceptable',
          confluence_factors: 5
        },
        risk: 1.7,
        algorithm_version: 'v1.0',
        execution_priority: 72,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Insert test signals
    const { data: insertedSignals, error: insertError } = await supabase
      .from('signals')
      .insert(testSignals)
      .select()

    if (insertError) {
      console.error('Error inserting test signals:', insertError)
      throw insertError
    }

    console.log(`✅ Successfully inserted ${insertedSignals?.length || 0} test signals`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Test signals generated successfully',
      signals_generated: insertedSignals?.length || 0,
      signals: insertedSignals,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error generating test signals:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})