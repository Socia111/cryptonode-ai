import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const log = (level: string, message: string, data: any = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
};

// REMOVED: No more mock signals - only real market data signals

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, count = 10 } = body;

    log('info', 'Scanner request', { action, count });

    if (action === 'generate_signals') {
      // Only use REAL market data from live_market_data table
      const { data: liveMarketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('updated_at', { ascending: false })
        .limit(count);

      if (marketError) {
        log('error', 'Failed to fetch live market data', { error: marketError.message });
        return json({ error: 'Failed to fetch real market data' }, 500);
      }

      if (!liveMarketData || liveMarketData.length === 0) {
        return json({
          success: true,
          signals: [],
          message: 'No recent live market data available'
        });
      }

      const signals = [];
      
      // Generate signals only from REAL data
      for (const marketData of liveMarketData) {
        if (!marketData.price || !marketData.volume) continue;

        // Use technical indicators from real data
        const signal = generateRealSignal(marketData);
        if (signal) {
          signals.push(signal);
        }
      }

      // Store only real signals
      if (signals.length > 0) {
        const { error: insertError } = await supabase
          .from('signals')
          .insert(signals);
          
        if (insertError) {
          log('error', 'Failed to insert real signals', { error: insertError.message });
        }
      }

      log('info', 'Generated signals', { 
        count: signals.length,
        symbols: [...new Set(signals.map(s => s.symbol))]
      });

      return json({
        success: true,
        signals,
        metadata: {
          generated_at: new Date().toISOString(),
          scanner_version: '2.0.0_real_data_only',
          total_signals: signals.length,
          data_source: 'live_market_data_only'
        }
      });
    }

    if (action === 'status') {
      return json({
        status: 'operational',
        scanner_enabled: true,
        last_scan: new Date().toISOString(),
        supported_symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT']
      });
    }

    return json({ error: 'Invalid action' }, 400);

  } catch (error: any) {
    log('error', 'Scanner failed', { error: error.message });
    return json({
      error: 'Scanner error',
      message: error.message
    }, 500);
  }
});

function generateRealSignal(marketData: any) {
  // Only generate signals from real market data with proper indicators
  if (!marketData.price || !marketData.rsi_14 || !marketData.volume) {
    return null;
  }

  const price = Number(marketData.price);
  const rsi = Number(marketData.rsi_14);
  const volume = Number(marketData.volume);
  const ema21 = Number(marketData.ema21 || price);
  const stochK = Number(marketData.stoch_k || 50);
  
  let direction = null;
  let confidence = 0;

  // Real signal logic based on actual technical indicators
  if (rsi < 30 && stochK < 20 && price < ema21) {
    direction = 'BUY';
    confidence = Math.min(85, 60 + (30 - rsi));
  } else if (rsi > 70 && stochK > 80 && price > ema21) {
    direction = 'SELL';
    confidence = Math.min(85, 60 + (rsi - 70));
  }

  if (!direction || confidence < 60) {
    return null;
  }

  const atr = Number(marketData.atr_14 || price * 0.02);
  const entryPrice = price;
  const stopLoss = direction === 'BUY' ? 
    entryPrice - (2 * atr) : 
    entryPrice + (2 * atr);
  const takeProfit = direction === 'BUY' ? 
    entryPrice + (3 * atr) : 
    entryPrice - (3 * atr);

  return {
    symbol: marketData.symbol,
    exchange: marketData.exchange,
    direction,
    price: entryPrice,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score: confidence,
    confidence: confidence / 100,
    timeframe: '1h',
    source: 'real_market_data',
    algo: 'technical_indicators_real',
    atr,
    metadata: {
      rsi_14: rsi,
      stoch_k: stochK,
      ema21,
      volume_ratio: volume / (Number(marketData.volume_avg_20) || volume),
      data_age_minutes: Math.round((Date.now() - new Date(marketData.updated_at).getTime()) / 60000)
    },
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
  };
}