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
    console.log('[AItradeX1-Enhanced] Starting REAL market data scanner...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const symbols = body.symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'];
    const timeframes = ['15m', '30m', '1h'];

    console.log(`[AItradeX1-Enhanced] Scanning ${symbols.length} symbols with REAL data...`);

    // FETCH REAL MARKET DATA from live_market_data table
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .in('symbol', symbols)
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .not('price', 'is', null)
      .not('ema21', 'is', null)
      .order('updated_at', { ascending: false });

    if (marketError) {
      console.error('[AItradeX1-Enhanced] Error fetching market data:', marketError);
      throw marketError;
    }

    if (!marketData || marketData.length === 0) {
      console.log('[AItradeX1-Enhanced] No recent market data found. Triggering live feed...');
      
      // Trigger live-exchange-feed to get fresh data
      try {
        await supabase.functions.invoke('live-exchange-feed', {
          body: { trigger: 'scanner_request' }
        });
        console.log('[AItradeX1-Enhanced] Live feed triggered, waiting for data...');
        
        // Wait for data to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: retryMarketData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false });
          
        if (!retryMarketData || retryMarketData.length === 0) {
          throw new Error('No market data available after triggering live feed');
        }
        
        marketData.push(...retryMarketData);
      } catch (feedError) {
        console.error('[AItradeX1-Enhanced] Failed to trigger live feed:', feedError);
        throw new Error('No recent market data available and unable to fetch new data');
      }
    }

    console.log(`[AItradeX1-Enhanced] Processing ${marketData.length} real market data points`);

    const signals = [];

    // Group market data by symbol to get the latest data for each
    const symbolMap = new Map();
    marketData.forEach(data => {
      if (!symbolMap.has(data.symbol) || new Date(data.updated_at) > new Date(symbolMap.get(data.symbol).updated_at)) {
        symbolMap.set(data.symbol, data);
      }
    });

    for (const [symbol, latestData] of symbolMap) {
      for (const timeframe of timeframes) {
        // Generate REAL signal using actual market data
        const signal = await generateAdvancedRealSignal(latestData, timeframe);
        
        if (signal) {
          const { error } = await supabase.from('signals').insert(signal);
          
          if (error) {
            console.error('Error inserting signal:', error);
          } else {
            console.log(`✅ Generated REAL signal: ${symbol} ${signal.direction} (Score: ${signal.score}%)`);
            signals.push(signal);
          }
        }
      }
    }

    console.log(`[AItradeX1-Enhanced] Successfully inserted ${signals.length} REAL signals from market data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        signals_found: signals.length,
        market_data_points: marketData.length,
        symbols_processed: symbolMap.size,
        data_source: 'real_market_data',
        message: `Processed ${symbolMap.size} symbols with real market data`,
        signals 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[AItradeX1-Enhanced] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})

// ADVANCED REAL SIGNAL GENERATION using actual market data and technical indicators
async function generateAdvancedRealSignal(marketData: any, timeframe: string) {
  try {
    // Validate required real market data
    if (!marketData.price || !marketData.ema21 || !marketData.rsi_14) {
      console.log(`[Advanced Signal] Insufficient data for ${marketData.symbol}`);
      return null;
    }

    const price = Number(marketData.price);
    const ema21 = Number(marketData.ema21);
    const sma200 = Number(marketData.sma200);
    const rsi = Number(marketData.rsi_14);
    const volume = Number(marketData.volume) || 0;
    const volumeAvg = Number(marketData.volume_avg_20) || volume || 1;
    const atr = Number(marketData.atr_14) || price * 0.015; // Default 1.5% if no ATR
    const stochK = Number(marketData.stoch_k) || 50;
    const stochD = Number(marketData.stoch_d) || 50;
    const adx = Number(marketData.adx) || 25;
    const changePercent = Number(marketData.change_24h_percent) || 0;

    // ADVANCED TECHNICAL ANALYSIS CONDITIONS
    const strongTrend = sma200 ? (price > ema21 && ema21 > sma200) || (price < ema21 && ema21 < sma200) : Math.abs(changePercent) > 5;
    const volumeSignificant = volume > (volumeAvg * 1.3);
    const trendStrength = adx > 25;
    const momentum = Math.abs(changePercent);
    
    // RSI conditions for different scenarios
    const rsiBullish = rsi >= 45 && rsi <= 70;
    const rsiBearish = rsi >= 30 && rsi <= 55;
    const rsiOversold = rsi < 30;
    const rsiOverbought = rsi > 70;
    
    // Stochastic conditions
    const stochBullish = stochK > stochD && stochK < 80;
    const stochBearish = stochK < stochD && stochK > 20;
    
    let signal = null;
    let score = 70;
    let confidence = 0.70;

    // ADVANCED LONG SIGNAL CONDITIONS
    if (price > ema21 && rsiBullish && volumeSignificant && strongTrend) {
      score = 80;
      
      // Score enhancements based on confluence
      if (stochBullish) score += 5;
      if (trendStrength) score += 5;
      if (momentum > 3) score += 5;
      if (rsi > 50 && rsi < 65) score += 3;
      if (volume > (volumeAvg * 2)) score += 2;
      
      score = Math.min(95, score);
      confidence = score / 100;
      
      const stopLossPrice = Number((price - (2.5 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4));
      const takeProfitPrice = Number((price + (4 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4));
      
      signal = {
        symbol: marketData.symbol,
        timeframe,
        direction: 'LONG',
        price,
        entry_price: price,
        stop_loss: stopLossPrice,
        take_profit: takeProfitPrice,
        score,
        confidence,
        source: 'aitradex1_real_enhanced',
        algo: 'aitradex1_real_v3',
        exchange: marketData.exchange || 'bybit',
        side: 'BUY',
        signal_type: 'advanced_technical_analysis',
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        signal_grade: score >= 90 ? 'A+' : score >= 85 ? 'A' : score >= 80 ? 'B+' : 'B',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        atr: atr,
        volume_ratio: volume / volumeAvg,
        metadata: {
          real_data: true,
          strong_trend: strongTrend,
          volume_significant: volumeSignificant,
          trend_strength: trendStrength,
          rsi_value: rsi,
          stoch_k: stochK,
          stoch_d: stochD,
          adx_value: adx,
          momentum: momentum,
          volume_ratio: volume / volumeAvg,
          ema21_value: ema21,
          sma200_value: sma200,
          scanner_version: 'aitradex1_enhanced_v3',
          confluence_score: score,
          data_timestamp: marketData.updated_at
        }
      };
    }
    // ADVANCED SHORT SIGNAL CONDITIONS  
    else if (price < ema21 && rsiBearish && volumeSignificant && strongTrend) {
      score = 80;
      
      // Score enhancements based on confluence
      if (stochBearish) score += 5;
      if (trendStrength) score += 5;
      if (momentum > 3) score += 5;
      if (rsi > 35 && rsi < 50) score += 3;
      if (volume > (volumeAvg * 2)) score += 2;
      
      score = Math.min(95, score);
      confidence = score / 100;
      
      const stopLossPrice = Number((price + (2.5 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4));
      const takeProfitPrice = Number((price - (4 * atr)).toFixed(marketData.symbol.includes('USDT') && price < 1 ? 6 : 4));
      
      signal = {
        symbol: marketData.symbol,
        timeframe,
        direction: 'SHORT',
        price,
        entry_price: price,
        stop_loss: stopLossPrice,
        take_profit: takeProfitPrice,
        score,
        confidence,
        source: 'aitradex1_real_enhanced',
        algo: 'aitradex1_real_v3',
        exchange: marketData.exchange || 'bybit',
        side: 'SELL',
        signal_type: 'advanced_technical_analysis',
        is_active: true,
        exchange_source: marketData.exchange || 'bybit',
        signal_grade: score >= 90 ? 'A+' : score >= 85 ? 'A' : score >= 80 ? 'B+' : 'B',
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        atr: atr,
        volume_ratio: volume / volumeAvg,
        metadata: {
          real_data: true,
          strong_trend: strongTrend,
          volume_significant: volumeSignificant,
          trend_strength: trendStrength,
          rsi_value: rsi,
          stoch_k: stochK,
          stoch_d: stochD,
          adx_value: adx,
          momentum: momentum,
          volume_ratio: volume / volumeAvg,
          ema21_value: ema21,
          sma200_value: sma200,
          scanner_version: 'aitradex1_enhanced_v3',
          confluence_score: score,
          data_timestamp: marketData.updated_at
        }
      };
    }
    
    if (signal) {
      console.log(`[Advanced Real Signal] ${signal.symbol} ${signal.direction} - Price: ${price}, RSI: ${rsi}, Score: ${score}%`);
    }
    
    return signal;
    
  } catch (error) {
    console.error(`[Advanced Signal Generation] Error processing ${marketData.symbol}:`, error);
    return null;
  }
}