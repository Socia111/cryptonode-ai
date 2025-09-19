import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BYBIT_BASE_URL = 'https://api.bybit.com';

interface MarketTicker {
  symbol: string;
  price24hPcnt: string;
  lastPrice: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
  turnover24h: string;
  bid1Price: string;
  ask1Price: string;
  markPrice: string;
  indexPrice: string;
  openInterest: string;
  fundingRate: string;
  nextFundingTime: string;
}

interface KlineData {
  openTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover: string;
}

async function fetchBybitTickers(): Promise<MarketTicker[]> {
  const url = `${BYBIT_BASE_URL}/v5/market/tickers?category=linear`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    // Filter for USDT pairs only
    return data.result.list.filter((ticker: MarketTicker) => 
      ticker.symbol.endsWith('USDT') && 
      parseFloat(ticker.turnover24h) > 1000000 // Filter for active pairs
    );
  } catch (error) {
    console.error('Error fetching Bybit tickers:', error);
    return [];
  }
}

async function fetchBybitKlines(symbol: string, interval: string, limit: number = 200): Promise<KlineData[]> {
  const url = `${BYBIT_BASE_URL}/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data.result.list.map((kline: any[]) => ({
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      turnover: kline[6]
    }));
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
}

function calculateTechnicalIndicators(klines: KlineData[], symbol: string) {
  if (klines.length < 50) return null;
  
  const closes = klines.map(k => parseFloat(k.close));
  const highs = klines.map(k => parseFloat(k.high));
  const lows = klines.map(k => parseFloat(k.low));
  const volumes = klines.map(k => parseFloat(k.volume));
  
  // Calculate RSI
  const calculateRSI = (prices: number[], period: number = 14) => {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 0.0001);
    return 100 - (100 / (1 + rs));
  };
  
  // Calculate EMA
  const calculateEMA = (prices: number[], period: number) => {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  };
  
  // Calculate SMA
  const calculateSMA = (prices: number[], period: number) => {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };
  
  // Calculate ATR
  const calculateATR = (highs: number[], lows: number[], closes: number[], period: number = 14) => {
    if (highs.length < period + 1) return (highs[highs.length - 1] - lows[lows.length - 1]);
    
    const trs = [];
    for (let i = 1; i < Math.min(highs.length, period + 10); i++) {
      const tr = Math.max(
        highs[highs.length - i] - lows[lows.length - i],
        Math.abs(highs[highs.length - i] - closes[closes.length - i - 1]),
        Math.abs(lows[lows.length - i] - closes[closes.length - i - 1])
      );
      trs.push(tr);
    }
    
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  };
  
  const currentPrice = closes[closes.length - 1];
  const rsi = calculateRSI(closes);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const atr = calculateATR(highs, lows, closes);
  const volume24h = volumes[volumes.length - 1];
  const volumeAvg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  
  return {
    symbol,
    price: currentPrice,
    rsi_14: rsi,
    ema21,
    ema50, 
    sma200,
    atr_14: atr,
    volume: volume24h,
    volume_ratio: volume24h / (volumeAvg || 1),
    change_24h_percent: ((currentPrice - parseFloat(klines[0].close)) / parseFloat(klines[0].close)) * 100,
    timestamp: new Date().toISOString(),
    source: 'bybit_live'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Live Bybit Data Feed] Starting real-time market data collection...');

    const targetSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
      'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT',
      'UNIUSDT', 'FILUSDT', 'TRXUSDT', 'ETCUSDT', 'SANDUSDT', 'MANAUSDT'
    ];

    // Fetch live tickers
    const tickers = await fetchBybitTickers();
    const activeTickers = tickers.filter(t => targetSymbols.includes(t.symbol));
    
    console.log(`[Live Bybit Data Feed] Found ${activeTickers.length} active pairs`);

    const marketDataPromises = activeTickers.slice(0, 12).map(async (ticker) => {
      // Fetch klines for technical analysis
      const klines = await fetchBybitKlines(ticker.symbol, '60', 200); // 1 hour intervals
      
      if (klines.length === 0) return null;
      
      const indicators = calculateTechnicalIndicators(klines, ticker.symbol);
      if (!indicators) return null;
      
      return {
        ...indicators,
        bid_price: parseFloat(ticker.bid1Price),
        ask_price: parseFloat(ticker.ask1Price),
        mark_price: parseFloat(ticker.markPrice),
        funding_rate: parseFloat(ticker.fundingRate),
        open_interest: parseFloat(ticker.openInterest),
        turnover_24h: parseFloat(ticker.turnover24h),
        high_24h: parseFloat(ticker.highPrice24h),
        low_24h: parseFloat(ticker.lowPrice24h),
        updated_at: new Date().toISOString()
      };
    });

    const marketDataResults = await Promise.all(marketDataPromises);
    const validMarketData = marketDataResults.filter(Boolean);

    console.log(`[Live Bybit Data Feed] Processed ${validMarketData.length} market data points`);

    // Store in database
    if (validMarketData.length > 0) {
      const { error: insertError } = await supabase
        .from('live_market_data')
        .upsert(validMarketData, { 
          onConflict: 'symbol',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('[Live Bybit Data Feed] Error storing data:', insertError);
      } else {
        console.log(`[Live Bybit Data Feed] ✅ Stored ${validMarketData.length} live data points`);
      }
    }

    // Trigger signal generation with fresh data
    const signalResponse = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: { 
        force_refresh: true,
        data_source: 'bybit_live',
        market_data: validMarketData
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data_points: validMarketData.length,
      symbols_processed: validMarketData.map(d => d.symbol),
      signal_generation_triggered: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Live Bybit Data Feed] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});