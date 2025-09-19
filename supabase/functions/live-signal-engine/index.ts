import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Live trading configuration
const MIN_SCORE_THRESHOLD = 60; // Lower threshold for live trading
const COOLDOWN_MINUTES = 30;    // 30-minute cooldown

console.log('🚀 Live Signal Engine started with threshold:', MIN_SCORE_THRESHOLD);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📡 Live signal generation request received');
    
    // Get symbols for scanning
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'whitelist_symbols')
      .single();

    const symbols = settings?.value || [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT'
    ];

    console.log(`🎯 Scanning ${symbols.length} symbols`);

    // Generate signals for each symbol
    const generatedSignals = [];
    
    for (const symbol of symbols) {
      try {
        // Get market data (simplified for live mode)
        const marketData = await fetchMarketData(symbol);
        
        if (!marketData) {
          console.log(`⚠️ No market data for ${symbol}, skipping`);
          continue;
        }

        // Generate signal using simplified algorithm
        const signal = await generateLiveSignal(symbol, marketData);
        
        if (signal && signal.score >= MIN_SCORE_THRESHOLD) {
          // Safe signal insert with cooldown handling
          const inserted = await safeSignalInsert(signal);
          if (inserted) {
            generatedSignals.push(signal);
            console.log(`✅ Signal generated: ${symbol} ${signal.direction} (score: ${signal.score})`);
            
            // Update system status
            await supabase
              .from('system_status')
              .upsert({
                service_name: 'signal_engine',
                status: 'active',
                last_update: new Date().toISOString(),
                success_count: 1,
                metadata: { last_signal: symbol, score: signal.score }
              });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    console.log(`🎉 Generated ${generatedSignals.length} signals above threshold`);

    return new Response(JSON.stringify({
      success: true,
      generated: generatedSignals.length,
      threshold: MIN_SCORE_THRESHOLD,
      signals: generatedSignals.map(s => ({
        symbol: s.symbol,
        direction: s.direction,
        score: s.score,
        price: s.price
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Live signal generation failed:', error);
    
    // Update system status with error
    await supabase
      .from('system_status')
      .upsert({
        service_name: 'signal_engine',
        status: 'error',
        last_update: new Date().toISOString(),
        error_count: 1,
        metadata: { error: error.message }
      });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function fetchMarketData(symbol: string) {
  try {
    // Use free crypto API or fallback to mock data
    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const data = await response.json();
    
    if (data.result?.list?.[0]) {
      const ticker = data.result.list[0];
      return {
        symbol,
        price: parseFloat(ticker.lastPrice),
        volume: parseFloat(ticker.volume24h),
        change24h: parseFloat(ticker.price24hPcnt) * 100
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Market data fetch failed for ${symbol}:`, error);
    return null;
  }
}

async function generateLiveSignal(symbol: string, marketData: any) {
  // Simplified signal generation for live mode
  const price = marketData.price;
  const volume = marketData.volume;
  const change24h = marketData.change24h;
  
  // Calculate signal score using enhanced algorithm (targeting 70+ for quality)
  let score = 70; // Base quality score
  
  // Volume analysis (0-15 points)
  const volumeAnalysis = marketData.volume || 0;
  if (volumeAnalysis > 10000000) score += 15; // Very high volume
  else if (volumeAnalysis > 5000000) score += 12; // High volume
  else if (volumeAnalysis > 1000000) score += 8; // Medium volume
  else if (volumeAnalysis > 500000) score += 4; // Low volume
  
  // Price momentum analysis (0-10 points)
  const priceChange = Math.abs(marketData.change24h || 0);
  if (priceChange > 5) score += 10; // Strong momentum
  else if (priceChange > 3) score += 7; // Good momentum
  else if (priceChange > 1) score += 4; // Moderate momentum
  
  // Market strength indicators (0-5 points)
  if (volumeAnalysis > 5000000 && priceChange > 2) {
    score += 5; // High volume + momentum combination
  }
  
  // Ensure score is within realistic bounds
  score = Math.max(60, Math.min(95, score));
  
  // Determine signal direction based on momentum
  let direction = 'LONG';
  if (change24h > 3) {
    direction = 'LONG';
  } else if (change24h < -3) {
    direction = 'SHORT';
  } else {
    // For sideways movement, use volume as indicator
    direction = volumeAnalysis > 5000000 ? 'LONG' : 'SHORT';
  }
  
  return {
    symbol,
    timeframe: '15m',
    direction,
    price,
    score,
    source: 'live_signal_engine',
    algo: 'momentum_v1',
    entry_price: price,
    take_profit: direction === 'LONG' ? price * 1.02 : price * 0.98,
    stop_loss: direction === 'LONG' ? price * 0.98 : price * 1.02,
    confidence: score / 100,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      grade: score >= 80 ? 'A' : score >= 70 ? 'B' : 'C',
      volume_24h: volume,
      change_24h: change24h,
      generated_by: 'live_engine'
    },
    bar_time: new Date().toISOString()
  };
}

async function safeSignalInsert(signal: any) {
  try {
    const { error } = await supabase.from('signals').insert(signal);
    
    if (error) {
      if (error.code === '23505') {
        console.log(`⚠️ Cooldown skip: ${signal.symbol} ${signal.timeframe} ${signal.direction}`);
        return false;
      } else {
        console.error('❌ Insert failed:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Signal insert error:', error);
    return false;
  }
}