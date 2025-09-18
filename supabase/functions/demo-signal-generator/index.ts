import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Demo signal generator triggered');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Demo symbols for testing
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
    const timeframes = ['15m', '1h'];
    const directions = ['LONG', 'SHORT'];

    const signals = [];

    for (let i = 0; i < 5; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      
      // Generate realistic price data
      let basePrice;
      switch (symbol) {
        case 'BTCUSDT': basePrice = 70000 + Math.random() * 20000; break;
        case 'ETHUSDT': basePrice = 3000 + Math.random() * 2000; break;
        case 'SOLUSDT': basePrice = 180 + Math.random() * 100; break;
        case 'BNBUSDT': basePrice = 600 + Math.random() * 400; break;
        case 'ADAUSDT': basePrice = 0.8 + Math.random() * 0.4; break;
        default: basePrice = 100;
      }

      const price = Number(basePrice.toFixed(symbol.includes('ADA') ? 4 : 2));
      const score = Math.floor(Math.random() * 25) + 75; // 75-99
      const confidence = score / 100;

      const signal = {
        symbol,
        timeframe,
        direction,
        price,
        entry_price: price,
        stop_loss: direction === 'LONG' ? price * 0.97 : price * 1.03,
        take_profit: direction === 'LONG' ? price * 1.1 : price * 0.9,
        score,
        confidence,
        source: 'demo_generator',
        metadata: {
          demo: true,
          generated_at: new Date().toISOString(),
          change_24h: (Math.random() - 0.5) * 10,
          volume_24h: Math.random() * 1000000
        },
        bar_time: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        algo: 'demo_v1',
        exchange: 'bybit',
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        signal_type: 'demo',
        is_active: true,
        exchange_source: 'demo'
      };

      const { error } = await supabase.from('signals').insert(signal);
      
      if (error) {
        console.error('Error inserting demo signal:', error);
      } else {
        console.log(`✅ Generated demo signal: ${symbol} ${direction} at ${price}`);
        signals.push(signal);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        signals_generated: signals.length,
        signals 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Demo signal generator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})