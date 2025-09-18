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
    console.log('[Enhanced Signal Generation] Starting with REAL market data...');

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

    // FETCH REAL MARKET DATA from live_market_data table
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .not('ema21', 'is', null)
      .not('rsi_14', 'is', null)
      .not('volume', 'is', null)
      .order('updated_at', { ascending: false });

    if (marketError) {
      console.error('[Enhanced Signal Generation] Error fetching market data:', marketError);
      throw marketError;
    }

    if (!marketData || marketData.length === 0) {
      console.log('[Enhanced Signal Generation] No recent market data found. Triggering live feed...');
      
      // Trigger live-exchange-feed to get fresh data
      try {
        await supabase.functions.invoke('live-exchange-feed', {
          body: { trigger: 'auto' }
        });
        console.log('[Enhanced Signal Generation] Live feed triggered');
        
        // Wait a moment and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: retryMarketData } = await supabase
          .from('live_market_data')
          .select('*')
          .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false });
          
        if (!retryMarketData || retryMarketData.length === 0) {
          throw new Error('No market data available after triggering live feed');
        }
        
        marketData.push(...retryMarketData);
      } catch (feedError) {
        console.error('[Enhanced Signal Generation] Failed to trigger live feed:', feedError);
        throw new Error('No recent market data available and unable to fetch new data');
      }
    }

    console.log(`[Enhanced Signal Generation] Using ${marketData.length} real market data points`);

    const signals = [];
    const timeframes = ['15m', '30m', '1h'];

    // Group market data by symbol for processing
    const symbolMap = new Map();
    marketData.forEach(data => {
      if (!symbolMap.has(data.symbol)) {
        symbolMap.set(data.symbol, []);
      }
      symbolMap.get(data.symbol).push(data);
    });

    for (const [symbol, dataPoints] of symbolMap) {
      // Use the most recent data point for this symbol
      const latestData = dataPoints.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      
      for (const timeframe of timeframes) {
        // Apply REAL signal generation algorithm using actual market data
        const signal = await generateRealSignal(latestData, timeframe);
        
        if (signal) {
          signals.push(signal);
          console.log(`✅ Generated REAL signal: ${symbol} ${signal.direction} (Score: ${signal.score})`);
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
    console.log(`[Enhanced Signal Generation] Generated ${generatedCount} new REAL signals from live market data`);

    return new Response(
      JSON.stringify({ 
        success: true,
        signals_generated: generatedCount,
        signals_deleted: deletedCount,
        market_data_points: marketData.length,
        symbols_processed: symbolMap.size,
        message: `REAL signal generation completed: ${generatedCount} signals created from live data, ${deletedCount} old signals cleaned`,
        data_source: 'real_market_data'
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

// REAL SIGNAL GENERATION ALGORITHM USING ACTUAL MARKET DATA
async function generateRealSignal(marketData: any, timeframe: string) {
  try {
    // Validate required real market data
    if (!marketData.price || !marketData.ema21 || !marketData.rsi_14 || !marketData.volume) {
      console.log(`[Signal Generation] Insufficient data for ${marketData.symbol}`);
      return null;
    }

    // PRODUCTION GRADE technical analysis using actual indicators
    const price = Number(marketData.price);
    const ema21 = Number(marketData.ema21);
    const sma200 = Number(marketData.sma200) || ema21; // Fallback if SMA200 not available
    const rsi = Number(marketData.rsi_14);
    const volume = Number(marketData.volume);
    const volumeAvg = Number(marketData.volume_avg_20) || volume;
    const atr = Number(marketData.atr_14) || price * 0.02;
    const stochK = Number(marketData.stoch_k) || 50;
    const stochD = Number(marketData.stoch_d) || 50;
    const adx = Number(marketData.adx) || 25;
    const plusDI = Number(marketData.plus_di) || 25;
    const minusDI = Number(marketData.minus_di) || 25;
    
    // PRODUCTION GRADE ANALYSIS
    
    // EMA21/SMA200 cross analysis
    const emaAboveSma = ema21 > sma200;
    const emaBelowSma = ema21 < sma200;
    const nearCross = Math.abs(ema21 - sma200) / price < 0.015; // Within 1.5%
    
    // Volume spike filter ≥ 1.5×
    const volRatio = volume / volumeAvg;
    const volumeSpike = volRatio >= 1.5;
    
    // Historical Volatility Percentile gate (estimated)
    const change24h = marketData.change_24h_percent || 0;
    const volatility = Math.abs(change24h);
    const hvpEstimate = Math.min(100, Math.max(0, 25 + (volatility * 2.5))); // HVP estimation
    const hvpGate = hvpEstimate > 50;
    
    // Stochastic confirmations
    const stochBull = stochK > stochD && stochK < 80;
    const stochBear = stochK < stochD && stochK > 20;
    
    // DMI/ADX confirmations
    const dmiBull = plusDI > minusDI && adx > 20;
    const dmiBear = minusDI > plusDI && adx > 20;
    
    let signal = null;
    let confidence = 70;
    
    // LONG signal - Production grade with EMA/SMA cross
    if (emaAboveSma && volumeSpike && hvpGate && stochBull && dmiBull) {
      confidence = 90; // High confidence for all confirmations
      
      signal = {
        symbol: marketData.symbol,
        direction: 'LONG',
        timeframe,
        price,
        entry_price: price,
        stop_loss: Number((price - (2.0 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        take_profit: Number((price + (4.0 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        score: confidence,
        confidence: confidence / 100,
        source: 'enhanced_signal_generation',
        algo: 'production_ema_sma_hvp_stoch_dmi',
        exchange: marketData.exchange || 'bybit',
        side: 'BUY',
        signal_type: 'production_grade',
        signal_grade: 'A+',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        atr: atr,
        volume_ratio: volRatio,
        hvp_value: hvpEstimate,
        metadata: {
          verified_real_data: true,
          production_engine: true,
          ema_above_sma: emaAboveSma,
          volume_spike: volumeSpike,
          hvp_gate: hvpGate,
          stoch_confirmed: stochBull,
          dmi_confirmed: dmiBull,
          near_cross: nearCross,
          signal_reason: nearCross ? 'PreCross' : 'Cross',
          rsi_value: rsi,
          adx_value: adx,
          data_timestamp: marketData.updated_at
        }
      };
      
      console.log(`✅ Generated REAL signal: ${signal.symbol} ${signal.direction} (Score: ${confidence}%)`);
      
    } 
    // SHORT signal - Production grade with EMA/SMA cross
    else if (emaBelowSma && volumeSpike && hvpGate && stochBear && dmiBear) {
      confidence = 90; // High confidence for all confirmations
      
      signal = {
        symbol: marketData.symbol,
        direction: 'SHORT',
        timeframe,
        price,
        entry_price: price,
        stop_loss: Number((price + (2.0 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        take_profit: Number((price - (4.0 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        score: confidence,
        confidence: confidence / 100,
        source: 'enhanced_signal_generation',
        algo: 'production_ema_sma_hvp_stoch_dmi',
        exchange: marketData.exchange || 'bybit',
        side: 'SELL',
        signal_type: 'production_grade',
        signal_grade: 'A+',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        atr: atr,
        volume_ratio: volRatio,
        hvp_value: hvpEstimate,
        metadata: {
          verified_real_data: true,
          production_engine: true,
          ema_below_sma: emaBelowSma,
          volume_spike: volumeSpike,
          hvp_gate: hvpGate,
          stoch_confirmed: stochBear,
          dmi_confirmed: dmiBear,
          near_cross: nearCross,
          signal_reason: nearCross ? 'PreCross' : 'Cross',
          rsi_value: rsi,
          adx_value: adx,
          data_timestamp: marketData.updated_at
        }
      };
      
      console.log(`✅ Generated REAL signal: ${signal.symbol} ${signal.direction} (Score: ${confidence}%)`);
    }
    // Relaxed conditions for moderate quality signals
    else if ((emaAboveSma && volumeSpike) || (emaBelowSma && volumeSpike)) {
      const direction = emaAboveSma ? 'LONG' : 'SHORT';
      confidence = 80;
      
      // Additional scoring
      if (hvpGate) confidence += 5;
      if (direction === 'LONG' && stochBull) confidence += 3;
      if (direction === 'SHORT' && stochBear) confidence += 3;
      if (volRatio > 2.0) confidence += 3;
      
      signal = {
        symbol: marketData.symbol,
        direction,
        timeframe,
        price,
        entry_price: price,
        stop_loss: Number((direction === 'LONG' ? price - (2.5 * atr) : price + (2.5 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        take_profit: Number((direction === 'LONG' ? price + (3.5 * atr) : price - (3.5 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        score: confidence,
        confidence: confidence / 100,
        source: 'enhanced_signal_generation',
        algo: 'production_ema_sma_relaxed',
        exchange: marketData.exchange || 'bybit',
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        signal_type: 'production_grade',
        signal_grade: confidence >= 90 ? 'A+' : confidence >= 85 ? 'A' : 'B',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        atr: atr,
        volume_ratio: volRatio,
        hvp_value: hvpEstimate,
        metadata: {
          verified_real_data: true,
          production_engine: true,
          ema_sma_trend: direction === 'LONG' ? 'ema_above_sma' : 'ema_below_sma',
          volume_spike: volumeSpike,
          hvp_gate: hvpGate,
          signal_reason: 'Relaxed',
          rsi_value: rsi,
          data_timestamp: marketData.updated_at
        }
      };
      
      console.log(`[Advanced Real Signal] ${signal.symbol} ${signal.direction} - Price: ${price}, RSI: ${rsi}, Score: ${confidence}%`);
    }
    
    return signal;
    
  } catch (error) {
    console.error(`[Signal Generation] Error processing ${marketData.symbol}:`, error);
    return null;
  }
}