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
    console.log('[Enhanced Signal Generation] Starting...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Clear old signals first (older than 2 hours)
    const { data: deletedSignals, error: deleteError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .select();

    const deletedCount = deletedSignals?.length || 0;
    console.log(`[Enhanced Signal Generation] Cleaned ${deletedCount} old signals`);

    // Generate new signals
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'];
    const timeframes = ['15m', '30m', '1h'];
    const signals = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        // Generate 1-2 signals per symbol/timeframe combo
        const signalCount = Math.random() > 0.7 ? 2 : 1;
        
        for (let i = 0; i < signalCount; i++) {
          const direction = Math.random() > 0.3 ? 'LONG' : 'SHORT'; // More LONG bias
          
          // Simulate realistic prices
          const basePrice = symbol === 'BTCUSDT' ? 67000 + Math.random() * 10000 :
                           symbol === 'ETHUSDT' ? 3200 + Math.random() * 800 :
                           symbol === 'SOLUSDT' ? 180 + Math.random() * 80 :
                           symbol === 'ADAUSDT' ? 0.45 + Math.random() * 0.2 :
                           symbol === 'BNBUSDT' ? 600 + Math.random() * 200 :
                           symbol === 'XRPUSDT' ? 0.6 + Math.random() * 0.3 :
                           symbol === 'DOTUSDT' ? 7.5 + Math.random() * 3 :
                           15 + Math.random() * 10; // LINKUSDT

          const price = Number(basePrice.toFixed(symbol.includes('ADA') || symbol.includes('XRP') ? 4 : 2));
          const score = 75 + Math.floor(Math.random() * 25); // 75-99
          
          const signal = {
            symbol,
            direction,
            timeframe,
            price,
            entry_price: price,
            stop_loss: direction === 'LONG' ? 
              Number((price * 0.97).toFixed(4)) : Number((price * 1.03).toFixed(4)),
            take_profit: direction === 'LONG' ? 
              Number((price * 1.08).toFixed(4)) : Number((price * 0.92).toFixed(4)),
            score,
            confidence: Number((score * 0.85 + Math.random() * 15).toFixed(1)),
            source: 'enhanced_generation',
            algo: 'enhanced_ai_v2',
            exchange: 'bybit',
            side: direction === 'LONG' ? 'BUY' : 'SELL',
            signal_type: 'enhanced_signal',
            signal_grade: score > 90 ? 'A+' : score > 85 ? 'A' : score > 80 ? 'B+' : 'B',
            bar_time: new Date().toISOString(),
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
            is_active: true,
            exchange_source: 'bybit',
            metadata: {
              enhanced: true,
              volume_24h: Math.floor(Math.random() * 2000000),
              change_24h: (Math.random() - 0.5) * 15,
              volatility: Math.random() * 0.08,
              rsi_simulated: 35 + Math.random() * 30,
              macd_simulated: (Math.random() - 0.5) * 0.05
            }
          };

          signals.push(signal);
        }
      }
    }

    // Insert all new signals
    const { data: insertedSignals, error: insertError } = await supabase
      .from('signals')
      .insert(signals)
      .select();

    if (insertError) {
      console.error('[Enhanced Signal Generation] Failed to insert signals:', insertError);
      throw insertError;
    }

    const generatedCount = insertedSignals?.length || 0;
    console.log(`[Enhanced Signal Generation] Generated ${generatedCount} new enhanced signals`);

    return new Response(
      JSON.stringify({ 
        success: true,
        signals_generated: generatedCount,
        signals_deleted: deletedCount,
        message: `Enhanced signal generation completed: ${generatedCount} signals created, ${deletedCount} old signals cleaned`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Enhanced Signal Generation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})