import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [test-signal-generation] Starting test signal generation...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate a test signal
    const testSignal = {
      symbol: 'TESTUSDT',
      timeframe: '15m',
      direction: 'LONG',
      price: 100,
      entry_price: 100,
      stop_loss: 95,
      take_profit: 110,
      score: 75,
      confidence: 0.75,
      source: 'test_signal_generator',
      algo: 'test_algo',
      exchange: 'bybit',
      bar_time: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        test: true,
        generator: 'test_signal_generation_function',
        verified_real_data: false
      },
      diagnostics: {
        test_mode: true,
        generated_at: new Date().toISOString()
      },
      indicators: {
        rsi: 65,
        macd: 0.5,
        adx: 30
      },
      market_conditions: {
        trend: 'bullish',
        volatility: 'low'
      }
    };

    // Insert the test signal
    const { data: signal, error: insertError } = await supabase
      .from('signals')
      .insert(testSignal)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Test signal insertion failed:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('✅ Test signal generated successfully:', signal?.id);

    // Check how many test signals exist
    const { data: testSignals, error: countError } = await supabase
      .from('signals')
      .select('id, symbol, score, created_at')
      .ilike('source', '%test%')
      .order('created_at', { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test signal generated successfully',
        signal: {
          id: signal?.id,
          symbol: signal?.symbol,
          direction: signal?.direction,
          score: signal?.score
        },
        test_signals_count: testSignals?.length || 0,
        recent_test_signals: testSignals || [],
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ [test-signal-generation] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});