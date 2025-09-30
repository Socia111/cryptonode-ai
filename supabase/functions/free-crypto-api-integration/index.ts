import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const freeCryptoApiKey = Deno.env.get('FREE_CRYPTO_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

interface Signal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  timeframe: string;
  algo: string;
  score: number;
  filters: any;
  indicators: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] } = await req.json();

    console.log(`🔄 Free Crypto API integration - Action: ${action}`);

    switch (action) {
      case 'fetch_market_data':
        return await fetchMarketData(symbols);
      
      case 'generate_enhanced_signals':
        return await generateEnhancedSignals(symbols);
      
      case 'price_comparison':
        return await comparePricesWithBybit(symbols);
      
      default:
        return await fetchMarketData(symbols);
    }

  } catch (error) {
    console.error('❌ Free Crypto API integration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchMarketData(symbols: string[]): Promise<Response> {
  console.log(`📊 Fetching market data for ${symbols.length} symbols`);
  
  const marketData: MarketData[] = [];
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://api.freecryptoapi.com/v1/ticker?symbol=${symbol}&apikey=${freeCryptoApiKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch data for ${symbol}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data && data.result) {
        marketData.push({
          symbol: symbol,
          price: parseFloat(data.result.last_price || data.result.price || '0'),
          volume: parseFloat(data.result.volume_24h || '0'),
          change24h: parseFloat(data.result.price_change_percent_24h || '0'),
          high24h: parseFloat(data.result.high_24h || '0'),
          low24h: parseFloat(data.result.low_24h || '0'),
          timestamp: new Date().toISOString()
        });
      }

      // Rate limiting - respect API limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error fetching ${symbol}:`, error);
    }
  }

  console.log(`✅ Fetched data for ${marketData.length} symbols`);

  return new Response(
    JSON.stringify({
      success: true,
      data: marketData,
      count: marketData.length,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateEnhancedSignals(symbols: string[]): Promise<Response> {
  console.log(`🎯 Generating enhanced signals for ${symbols.length} symbols`);
  
  const signals: Signal[] = [];
  
  for (const symbol of symbols) {
    try {
      // Fetch current market data
      const marketResponse = await fetch(
        `https://api.freecryptoapi.com/v1/ticker?symbol=${symbol}&apikey=${freeCryptoApiKey}`
      );

      if (!marketResponse.ok) continue;

      const marketData = await marketResponse.json();
      
      if (!marketData?.result) continue;

      const price = parseFloat(marketData.result.last_price || marketData.result.price || '0');
      const change24h = parseFloat(marketData.result.price_change_percent_24h || '0');
      const volume = parseFloat(marketData.result.volume_24h || '0');
      const high24h = parseFloat(marketData.result.high_24h || '0');
      const low24h = parseFloat(marketData.result.low_24h || '0');

      // Simple signal generation logic based on price action
      let direction: 'LONG' | 'SHORT' = 'LONG';
      let confidence = 50;

      // Bullish signals
      if (change24h > 5 && price > (high24h + low24h) / 2) {
        direction = 'LONG';
        confidence = Math.min(85, 60 + Math.abs(change24h));
      }
      // Bearish signals
      else if (change24h < -5 && price < (high24h + low24h) / 2) {
        direction = 'SHORT';
        confidence = Math.min(85, 60 + Math.abs(change24h));
      }
      // Neutral - only generate if volume is significant
      else if (volume > 1000000) {
        confidence = 45 + (volume / 10000000) * 10;
      }

      // Only generate signals with confidence > 60
      if (confidence > 60) {
        const signal: Signal = {
          symbol: symbol,
          direction: direction,
          confidence: confidence,
          entry_price: price,
          stop_loss: direction === 'LONG' ? price * 0.95 : price * 1.05,
          take_profit: direction === 'LONG' ? price * 1.08 : price * 0.92,
          timeframe: '1h',
          algo: 'FreeCryptoAPI-Enhanced',
          score: confidence,
          filters: {
            volume_check: volume > 500000,
            price_momentum: Math.abs(change24h) > 3,
            range_position: direction === 'LONG' ? price > (high24h + low24h) / 2 : price < (high24h + low24h) / 2
          },
          indicators: {
            price: price,
            change_24h: change24h,
            volume_24h: volume,
            high_24h: high24h,
            low_24h: low24h,
            volatility: ((high24h - low24h) / price) * 100
          }
        };

        signals.push(signal);

        // Save to database
        const { error } = await supabase.from('signals').insert({
          algo: signal.algo,
          exchange: 'multi',
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          direction: signal.direction,
          price: signal.entry_price,
          score: signal.score,
          sl: signal.stop_loss,
          tp: signal.take_profit,
          filters: signal.filters,
          indicators: signal.indicators,
          relaxed_mode: false,
          bar_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

        if (error) {
          console.error(`❌ Failed to save signal for ${symbol}:`, error);
        } else {
          console.log(`✅ Saved enhanced signal for ${symbol}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error(`❌ Error generating signal for ${symbol}:`, error);
    }
  }

  console.log(`🎯 Generated ${signals.length} enhanced signals`);

  return new Response(
    JSON.stringify({
      success: true,
      signals: signals,
      count: signals.length,
      timestamp: new Date().toISOString(),
      source: 'FreeCryptoAPI-Enhanced'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function comparePricesWithBybit(symbols: string[]): Promise<Response> {
  console.log(`🔍 Comparing prices between Free Crypto API and Bybit`);
  
  const comparisons = [];
  
  for (const symbol of symbols) {
    try {
      // Fetch from Free Crypto API
      const freeApiResponse = await fetch(
        `https://api.freecryptoapi.com/v1/ticker?symbol=${symbol}&apikey=${freeCryptoApiKey}`
      );

      // Fetch from Bybit (public endpoint)
      const bybitResponse = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`
      );

      if (freeApiResponse.ok && bybitResponse.ok) {
        const freeApiData = await freeApiResponse.json();
        const bybitData = await bybitResponse.json();

        const freeApiPrice = parseFloat(freeApiData.result?.last_price || freeApiData.result?.price || '0');
        const bybitPrice = parseFloat(bybitData.result?.list?.[0]?.lastPrice || '0');

        if (freeApiPrice > 0 && bybitPrice > 0) {
          const difference = Math.abs(freeApiPrice - bybitPrice);
          const percentDiff = (difference / bybitPrice) * 100;

          comparisons.push({
            symbol: symbol,
            freeCryptoAPI_price: freeApiPrice,
            bybit_price: bybitPrice,
            difference: difference,
            percent_difference: percentDiff,
            data_source_reliability: percentDiff < 0.5 ? 'HIGH' : percentDiff < 2 ? 'MEDIUM' : 'LOW'
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Error comparing prices for ${symbol}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      comparisons: comparisons,
      average_difference: comparisons.length > 0 
        ? comparisons.reduce((sum, comp) => sum + comp.percent_difference, 0) / comparisons.length 
        : 0,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}