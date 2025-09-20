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
          rsi_14: 65.2,
          sma_20: 97200.0,
          volume_ratio: 1.2
        }
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
          rsi_14: 58.7,
          sma_20: 3820.5,
          volume_ratio: 1.1
        }
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
          rsi_14: 72.1,
          sma_20: 248.3,
          volume_ratio: 0.9
        }
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