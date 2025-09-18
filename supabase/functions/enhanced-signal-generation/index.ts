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

    // REAL technical analysis using actual indicators
    const price = Number(marketData.price);
    const ema21 = Number(marketData.ema21);
    const rsi = Number(marketData.rsi_14);
    const volume = Number(marketData.volume);
    const volumeAvg = Number(marketData.volume_avg_20) || volume;
    const atr = Number(marketData.atr_14) || price * 0.02; // Fallback to 2% if ATR not available
    
    // REAL trend analysis
    const priceAboveEMA = price > ema21;
    const volumeSurge = volume > (volumeAvg * 1.2); // More relaxed
    const oversoldRSI = rsi < 40;
    const overboughtRSI = rsi > 60;
    const neutralRSI = rsi >= 35 && rsi <= 70; // More relaxed range
    
    // REAL signal conditions
    let signal = null;
    let confidence = 0;
    
    // LONG signal conditions (using real data) - More relaxed conditions
    if (priceAboveEMA && (neutralRSI || oversoldRSI) && (volumeSurge || volume > volumeAvg)) {
      signal = {
        symbol: marketData.symbol,
        direction: 'LONG',
        timeframe,
        price,
        entry_price: price,
        stop_loss: Number((price - (2 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        take_profit: Number((price + (3 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        score: 75,
        confidence: 0.75,
        source: 'real_market_data',
        algo: 'real_technical_analysis',
        exchange: marketData.exchange || 'bybit',
        side: 'BUY',
        signal_type: 'real_trend_following',
        signal_grade: 'B',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        atr: atr,
        volume_ratio: volume / volumeAvg,
        metadata: {
          real_data: true,
          price_above_ema21: priceAboveEMA,
          volume_surge: volumeSurge,
          rsi_value: rsi,
          volume_ratio: volume / volumeAvg,
          atr_value: atr,
          data_timestamp: marketData.updated_at
        }
      };
      
      confidence = 75;
      if (volumeSurge) confidence += 10;
      if (rsi > 40 && rsi < 60) confidence += 5;
      
    } 
    // SHORT signal conditions (using real data) - More relaxed conditions
    else if (!priceAboveEMA && (neutralRSI || overboughtRSI) && (volumeSurge || volume > volumeAvg)) {
      signal = {
        symbol: marketData.symbol,
        direction: 'SHORT',
        timeframe,
        price,
        entry_price: price,
        stop_loss: Number((price + (2 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        take_profit: Number((price - (3 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4)),
        score: 75,
        confidence: 0.75,
        source: 'real_market_data',
        algo: 'real_technical_analysis',
        exchange: marketData.exchange || 'bybit',
        side: 'SELL',
        signal_type: 'real_trend_following',
        signal_grade: 'B',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        atr: atr,
        volume_ratio: volume / volumeAvg,
        metadata: {
          real_data: true,
          price_above_ema21: priceAboveEMA,
          volume_surge: volumeSurge,
          rsi_value: rsi,
          volume_ratio: volume / volumeAvg,
          atr_value: atr,
          data_timestamp: marketData.updated_at
        }
      };
      
      confidence = 75;
      if (volumeSurge) confidence += 10;
      if (rsi > 40 && rsi < 60) confidence += 5;
    }
    
    if (signal) {
      // Apply confidence to score and grade
      signal.score = Math.min(95, Math.max(70, confidence));
      signal.confidence = confidence / 100;
      signal.signal_grade = confidence >= 90 ? 'A+' : confidence >= 85 ? 'A' : confidence >= 80 ? 'B+' : 'B';
      
      console.log(`[Real Signal] ${signal.symbol} ${signal.direction} - Price: ${price}, RSI: ${rsi}, Volume Ratio: ${(volume/volumeAvg).toFixed(2)}`);
    }
    
    return signal;
    
  } catch (error) {
    console.error(`[Signal Generation] Error processing ${marketData.symbol}:`, error);
    return null;
  }
}