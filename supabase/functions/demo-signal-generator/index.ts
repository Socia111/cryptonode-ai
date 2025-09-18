import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[demo-signal-generator] Generating realistic trading signals...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Major crypto symbols with realistic prices
    const symbols = [
      { symbol: 'BTCUSDT', basePrice: 92100, name: 'Bitcoin' },
      { symbol: 'ETHUSDT', basePrice: 3420, name: 'Ethereum' },
      { symbol: 'ADAUSDT', basePrice: 1.24, name: 'Cardano' },
      { symbol: 'SOLUSDT', basePrice: 243, name: 'Solana' },
      { symbol: 'DOGEUSDT', basePrice: 0.424, name: 'Dogecoin' },
      { symbol: 'XRPUSDT', basePrice: 2.67, name: 'Ripple' },
      { symbol: 'DOTUSDT', basePrice: 8.45, name: 'Polkadot' },
      { symbol: 'LINKUSDT', basePrice: 25.89, name: 'Chainlink' },
      { symbol: 'MATICUSDT', basePrice: 0.624, name: 'Polygon' },
      { symbol: 'AVAXUSDT', basePrice: 54.32, name: 'Avalanche' }
    ];

    const timeframes = ['5m', '15m', '1h', '4h'];
    const algorithms = ['unirail_core', 'aitradex1', 'quantum_ai'];
    
    const signals = [];
    const currentTime = new Date();

    // Generate 15-25 realistic signals
    const signalCount = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < signalCount; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      const algo = algorithms[Math.floor(Math.random() * algorithms.length)];
      
      // Create realistic price movements
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const currentPrice = symbol.basePrice * (1 + priceVariation);
      
      // Determine signal direction and confidence
      const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
      const baseConfidence = 70 + Math.random() * 25; // 70-95%
      const score = Math.floor(baseConfidence);
      
      // Calculate take profit and stop loss
      const riskReward = 1.2 + Math.random() * 0.8; // 1.2-2.0 R:R
      const riskPercent = 0.01 + Math.random() * 0.02; // 1-3% risk
      
      let takeProfit, stopLoss;
      if (direction === 'LONG') {
        stopLoss = currentPrice * (1 - riskPercent);
        takeProfit = currentPrice * (1 + riskPercent * riskReward);
      } else {
        stopLoss = currentPrice * (1 + riskPercent);
        takeProfit = currentPrice * (1 - riskPercent * riskReward);
      }

      // Create signal timestamp (within last 5 minutes)
      const signalTime = new Date(currentTime.getTime() - Math.random() * 5 * 60 * 1000);

      const signal = {
        symbol: symbol.symbol,
        timeframe,
        direction,
        side: direction, // Alias for compatibility
        algo,
        source: 'aitradex1',
        exchange: 'bybit',
        price: Number(currentPrice.toFixed(symbol.basePrice > 1000 ? 0 : 4)),
        entry_price: Number(currentPrice.toFixed(symbol.basePrice > 1000 ? 0 : 4)),
        take_profit: Number(takeProfit.toFixed(symbol.basePrice > 1000 ? 0 : 4)),
        stop_loss: Number(stopLoss.toFixed(symbol.basePrice > 1000 ? 0 : 4)),
        score,
        confidence: baseConfidence,
        signal_type: `${algo}_${timeframe}`,
        signal_grade: score > 85 ? 'A' : score > 80 ? 'B' : 'C',
        bar_time: signalTime.toISOString(),
        created_at: signalTime.toISOString(),
        expires_at: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        metadata: {
          symbol_name: symbol.name,
          risk_reward: Number(riskReward.toFixed(2)),
          risk_percent: Number((riskPercent * 100).toFixed(2)),
          generated_by: 'demo_signal_generator',
          market_condition: score > 80 ? 'trending' : 'ranging'
        }
      };

      signals.push(signal);
    }

    // Insert signals into database
    console.log(`[demo-signal-generator] Inserting ${signals.length} signals...`);
    
    const { data: insertedSignals, error: insertError } = await supabase
      .from('signals')
      .insert(signals)
      .select();

    if (insertError) {
      console.error('[demo-signal-generator] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[demo-signal-generator] ✅ Successfully generated ${insertedSignals?.length || 0} signals`);

    // Update exchange feed status
    await supabase.from('exchange_feed_status').upsert({
      exchange: 'aitradex1_demo',
      status: 'active',
      last_update: currentTime.toISOString(),
      symbols_tracked: symbols.length,
      error_count: 0
    });

    return new Response(JSON.stringify({
      success: true,
      signals_generated: insertedSignals?.length || 0,
      timeframes_scanned: timeframes,
      symbols_analyzed: symbols.length,
      message: `Generated ${insertedSignals?.length || 0} realistic trading signals`,
      timestamp: currentTime.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[demo-signal-generator] ❌ Failed:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});