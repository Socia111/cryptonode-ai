import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real trading pairs from Bybit
const TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOGEUSDT', 'MATICUSDT', 'LTCUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

async function getBybitMarketData(): Promise<MarketData[]> {
  try {
    console.log('📊 Fetching real market data from Bybit...');
    
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
    const data = await response.json();
    
    if (!data.result?.list) {
      throw new Error('Invalid Bybit API response');
    }
    
    const marketData = data.result.list
      .filter((ticker: any) => TRADING_PAIRS.includes(ticker.symbol))
      .map((ticker: any) => ({
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.price24hPcnt) * 100,
        volume: parseFloat(ticker.volume24h),
        high24h: parseFloat(ticker.highPrice24h),
        low24h: parseFloat(ticker.lowPrice24h),
      }));
    
    console.log(`✅ Retrieved market data for ${marketData.length} symbols`);
    return marketData;
  } catch (error) {
    console.error('❌ Error fetching Bybit market data:', error);
    throw error;
  }
}

function calculateTechnicalIndicators(marketData: MarketData) {
  const { price, high24h, low24h, change24h, volume } = marketData;
  
  // Simple technical analysis
  const priceRange = high24h - low24h;
  const pricePosition = (price - low24h) / priceRange;
  
  // Calculate momentum score
  const momentumScore = Math.abs(change24h) > 5 ? 85 : 
                       Math.abs(change24h) > 2 ? 75 : 65;
  
  // Volume analysis
  const volumeScore = volume > 1000000 ? 80 : 70;
  
  // Combine scores
  const finalScore = Math.round((momentumScore + volumeScore) / 2);
  
  // Determine direction based on price momentum
  const direction = change24h > 0 ? 'LONG' : 'SHORT';
  
  // Calculate targets
  const entryPrice = price;
  const stopLoss = direction === 'LONG' ? 
    price * 0.98 : price * 1.02; // 2% stop loss
  const takeProfit = direction === 'LONG' ? 
    price * 1.04 : price * 0.96; // 4% take profit
  
  return {
    score: finalScore,
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    confidence: finalScore / 100,
    pricePosition,
    momentum: change24h
  };
}

async function generateSignalsFromMarketData(supabase: any) {
  try {
    const marketData = await getBybitMarketData();
    const signals = [];
    
    for (const data of marketData) {
      const analysis = calculateTechnicalIndicators(data);
      
      // Only generate signals with score >= 70
      if (analysis.score >= 70) {
        const signal = {
          symbol: data.symbol,
          direction: analysis.direction,
          timeframe: '1h',
          price: analysis.entryPrice,
          entry_price: analysis.entryPrice,
          stop_loss: analysis.stopLoss,
          take_profit: analysis.takeProfit,
          score: analysis.score,
          confidence: analysis.confidence,
          source: 'production_live_bybit',
          algo: 'real_market_analysis',
          bar_time: new Date().toISOString(),
          metadata: {
            market_data: {
              change24h: data.change24h,
              volume: data.volume,
              high24h: data.high24h,
              low24h: data.low24h
            },
            analysis: {
              momentum: analysis.momentum,
              price_position: analysis.pricePosition
            },
            data_source: 'bybit_api',
            generated_at: new Date().toISOString()
          },
          is_active: true
        };
        
        signals.push(signal);
      }
    }
    
    if (signals.length > 0) {
      console.log(`🔄 Inserting ${signals.length} real signals into database...`);
      
      const { data: insertedSignals, error } = await supabase
        .from('signals')
        .insert(signals)
        .select();
      
      if (error) {
        console.error('❌ Error inserting signals:', error);
        throw error;
      }
      
      console.log(`✅ Successfully inserted ${insertedSignals?.length || 0} signals`);
      return insertedSignals;
    } else {
      console.log('⚠️ No signals met the quality threshold (score >= 70)');
      return [];
    }
  } catch (error) {
    console.error('❌ Error generating signals:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting production signal generation...');
    
    // Clean up old signals (older than 4 hours)
    const { error: cleanupError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString());
    
    if (cleanupError) {
      console.warn('⚠️ Cleanup error (non-fatal):', cleanupError);
    } else {
      console.log('🧹 Cleaned up old signals');
    }
    
    // Generate new signals from real market data
    const newSignals = await generateSignalsFromMarketData(supabase);
    
    const response = {
      success: true,
      signals_generated: newSignals.length,
      signals: newSignals,
      source: 'production_live_bybit',
      timestamp: new Date().toISOString(),
      market_pairs_analyzed: TRADING_PAIRS.length
    };
    
    console.log('🎉 Signal generation complete:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Production signal generation failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});