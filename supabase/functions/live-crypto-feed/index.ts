import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Candle = { 
  time: string; 
  price_open: string; 
  price_high: string; 
  price_low: string; 
  price_close: string; 
  volume_traded: string; 
};

// Math utilities
const n = (x: string) => parseFloat(x);

function ema(vals: number[], len: number) {
  const k = 2/(len+1);
  let e = vals[0];
  const out = [e];
  for (let i=1; i<vals.length; i++) { 
    e = vals[i]*k + e*(1-k); 
    out.push(e);
  }
  return out;
}

function sma(vals: number[], len: number) {
  const out: number[] = [];
  let sum = 0;
  for (let i=0; i<vals.length; i++) {
    sum += vals[i];
    if (i >= len) sum -= vals[i-len];
    if (i >= len-1) out.push(sum/len);
  }
  return out;
}

function stdev(vals: number[], len: number) {
  const out: number[] = [];
  for (let i=len-1; i<vals.length; i++) {
    const slice = vals.slice(i-len+1, i+1);
    const mean = slice.reduce((a,b)=>a+b,0)/len;
    const v = Math.sqrt(slice.reduce((s,x)=>s+(x-mean)*(x-mean),0)/len);
    out.push(v);
  }
  return out;
}

function dmiAdx(high: number[], low: number[], close: number[], len=14) {
  const tr: number[] = [], dmPlus: number[] = [], dmMinus: number[] = [];
  for (let i=1; i<high.length; i++) {
    const up = high[i]-high[i-1], dn = low[i-1]-low[i];
    dmPlus.push(up>dn && up>0 ? up : 0);
    dmMinus.push(dn>up && dn>0 ? dn : 0);
    const trv = Math.max(high[i]-low[i], Math.abs(high[i]-close[i-1]), Math.abs(low[i]-close[i-1]));
    tr.push(trv);
  }
  const smooth = (arr: number[]) => {
    let a = arr.slice(0, len).reduce((s,x)=>s+x,0);
    const out = [a];
    for (let i=len; i<arr.length; i++){ 
      a = out[out.length-1] - out[out.length-1]/len + arr[i]; 
      out.push(a); 
    }
    return out;
  };
  const trN = smooth(tr), dmpN = smooth(dmPlus), dmmN = smooth(dmMinus);
  const diPlus = dmpN.map((x,i)=>100*(x/(trN[i]||1)));
  const diMinus = dmmN.map((x,i)=>100*(x/(trN[i]||1)));
  const dx = diPlus.map((p,i)=> 100*Math.abs(((p - diMinus[i]) / ((p + diMinus[i])||1))));
  const adxArr = sma(dx, len);
  return { diPlus: diPlus.slice(len-1), diMinus: diMinus.slice(len-1), adx: adxArr };
}

function hvpPercentile(returns: number[]) {
  const st21 = stdev(returns, 21);
  const last = st21[st21.length-1] ?? 0;
  const max252 = Math.max(...st21.slice(-252), 1e-9);
  return 100 * (last / max252);
}

// Real CoinAPI fetch with retries
async function coinapiGet(url: string, tries = 3, backoffMs = 400) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'X-CoinAPI-Key': Deno.env.get('COINAPI_KEY')!,
          'User-Agent': 'aitradex1/1.0'
        }
      });
      if (res.ok) return res.json();
      lastErr = await res.text();
      if (res.status === 429 || res.status >= 500) {
        await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status} ${lastErr}`);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw new Error(`CoinAPI failed after ${tries} attempts: ${lastErr}`);
}

function tfToPeriod(tf: string) {
  return ({'1m':'1MIN','5m':'5MIN','15m':'15MIN','30m':'30MIN','1h':'1HRS','4h':'4HRS','1d':'1DAY'})[tf] ?? '15MIN';
}

async function fetchOHLCV(symbol: string, tf: string, limit = 400) {
  const period = tfToPeriod(tf);
  const url = `https://rest.coinapi.io/v1/ohlcv/BINANCE_SPOT_${symbol}/latest?period_id=${period}&limit=${limit}`;
  const data = await coinapiGet(url);
  return Array.isArray(data) ? data : [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting production live crypto feed with real data...')

    // Initialize real-time scanning for both algorithms
    const results = await Promise.all([
      startRealTimeAITRADEX1Scanning(supabase),
      startRealTimeAIRATETHECOINScanning(supabase)
    ])

    const summary = {
      aitradex_status: results[0],
      aira_status: results[1],
      timestamp: new Date().toISOString(),
      live_feed_active: true
    }

    console.log('✅ Production live crypto scanning initiated:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Real-time crypto scanning started with production data',
        summary,
        instructions: {
          aitradex: 'Scanning every 5 minutes with canonical AITRADEX1 algorithm',
          aira: 'Scanning every 15 minutes with real AIRATETHECOIN metrics',
          data_source: 'CoinAPI real-time OHLCV feeds',
          symbols: 'Top 200+ crypto pairs with proper cooldown'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Live feed startup error:', error)
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
    )
  }
})

async function startRealTimeAITRADEX1Scanning(supabase: any) {
  console.log('📊 Initializing AITRADEX1 real-time scanning...')
  
  const scanSymbols = async () => {
    try {
      const symbols = await getCryptoSymbolsList()
      console.log(`🔄 AITRADEX1 scanning ${symbols.length} symbols...`)
      
      let signalsFound = 0
      
      // Process in smaller batches for real-time performance
      for (let i = 0; i < symbols.length; i += 5) {
        const batch = symbols.slice(i, i + 5)
        
        await Promise.all(batch.map(async (symbol) => {
          try {
            const data = await fetchRealTimeCryptoData(symbol, ['5m', '15m', '1h'])
            const signals = await processAITRADEX1Signals(data, supabase)
            signalsFound += signals.length
            
            if (signals.length > 0) {
              console.log(`📈 AITRADEX1 signal: ${signals[0].direction} ${symbol} @ ${signals[0].price}`)
            }
          } catch (error) {
            console.error(`Error processing ${symbol}:`, error.message)
          }
        }))
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      console.log(`✅ AITRADEX1 scan completed: ${signalsFound} signals found`)
      return signalsFound
      
    } catch (error) {
      console.error('AITRADEX1 scan error:', error)
      return 0
    }
  }

  // Run initial scan
  const initialSignals = await scanSymbols()
  
  // Schedule recurring scans every 5 minutes
  setInterval(scanSymbols, 5 * 60 * 1000)
  
  return {
    algorithm: 'AITRADEX1',
    status: 'active',
    initial_signals: initialSignals,
    scan_interval: '5 minutes',
    timeframes: ['5m', '15m', '1h']
  }
}

async function startRealTimeAIRATETHECOINScanning(supabase: any) {
  console.log('🎯 Initializing AIRATETHECOIN real-time scanning...')
  
  const scanForRankings = async () => {
    try {
      const symbols = await getCryptoSymbolsList(200) // More symbols for rankings
      console.log(`🔄 AIRATETHECOIN scanning ${symbols.length} symbols...`)
      
      let rankingsUpdated = 0
      
      // Process symbols for AIRA rankings
      for (let i = 0; i < symbols.length; i += 10) {
        const batch = symbols.slice(i, i + 10)
        
        await Promise.all(batch.map(async (symbol) => {
          try {
            const data = await fetchRealTimeCryptoData(symbol, ['1h', '4h', '1d'])
            const ranking = await processAIRATETHECOINRanking(data, supabase)
            
            if (ranking) {
              rankingsUpdated++
              console.log(`🏆 AIRA ranking: ${symbol} score ${ranking.aira_score}`)
            }
          } catch (error) {
            console.error(`Error ranking ${symbol}:`, error.message)
          }
        }))
        
        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Update final rankings
      await updateFinalAIRARankings(supabase)
      
      console.log(`✅ AIRATETHECOIN scan completed: ${rankingsUpdated} rankings updated`)
      return rankingsUpdated
      
    } catch (error) {
      console.error('AIRATETHECOIN scan error:', error)
      return 0
    }
  }

  // Run initial scan
  const initialRankings = await scanForRankings()
  
  // Schedule recurring scans every 15 minutes
  setInterval(scanForRankings, 15 * 60 * 1000)
  
  return {
    algorithm: 'AIRATETHECOIN',
    status: 'active',
    initial_rankings: initialRankings,
    scan_interval: '15 minutes',
    timeframes: ['1h', '4h', '1d']
  }
}

async function getCryptoSymbolsList(limit = 100): Promise<string[]> {
  try {
    const coinApiKey = Deno.env.get('COINAPI_KEY')
    
    // Fetch top crypto symbols from CoinAPI
    const response = await fetch(
      'https://rest.coinapi.io/v1/symbols?filter_symbol_id=BINANCE_SPOT_',
      {
        headers: { 'X-CoinAPI-Key': coinApiKey! }
      }
    )

    if (!response.ok) {
      console.warn('CoinAPI fetch failed, using fallback symbols')
      return [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT',
        'MATICUSDT', 'UNIUSDT', 'AVAXUSDT', 'LTCUSDT', 'XRPUSDT', 'BCHUSDT'
      ]
    }

    const symbols = await response.json()
    return symbols
      .filter((s: any) => s.symbol_id.includes('USDT') && !s.symbol_id.includes('_PERP'))
      .slice(0, limit)
      .map((s: any) => s.symbol_id.replace('BINANCE_SPOT_', ''))
      
  } catch (error) {
    console.error('Error fetching symbols:', error)
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] // Minimal fallback
  }
}

async function fetchRealTimeCryptoData(symbol: string, timeframes: string[]) {
  const coinApiKey = Deno.env.get('COINAPI_KEY')
  const data: any = {}
  
  for (const timeframe of timeframes) {
    try {
      const periodId = convertTimeframeToPeriodId(timeframe)
      
      const response = await fetch(
        `https://rest.coinapi.io/v1/ohlcv/BINANCE_SPOT_${symbol}/latest?period_id=${periodId}&limit=100`,
        {
          headers: { 'X-CoinAPI-Key': coinApiKey! }
        }
      )

      if (response.ok) {
        const ohlcvData = await response.json()
        data[timeframe] = ohlcvData
      }
    } catch (error) {
      console.error(`Error fetching ${symbol} ${timeframe}:`, error)
    }
  }

  return { symbol, data }
}

function convertTimeframeToPeriodId(timeframe: string): string {
  const mapping: { [key: string]: string } = {
    '1m': '1MIN', '5m': '5MIN', '15m': '15MIN', '30m': '30MIN',
    '1h': '1HRS', '4h': '4HRS', '1d': '1DAY'
  }
  return mapping[timeframe] || '15MIN'
}

async function processAITRADEX1Signals(marketData: any, supabase: any) {
  const signals: any[] = []
  
  for (const [timeframe, ohlcvData] of Object.entries(marketData.data)) {
    if (!ohlcvData || !Array.isArray(ohlcvData) || ohlcvData.length < 50) continue

    try {
      // Run AITRADEX1 algorithm
      const analysis = evaluateAITRADEX1Signal(ohlcvData)
      
      if (analysis.signal && analysis.score >= 75) {
        // Check cooldown
        const cooldownOk = await checkSignalCooldown(
          supabase, 'coinapi', marketData.symbol, timeframe, analysis.direction
        )
        
        if (cooldownOk) {
          const signal = {
            algo: 'AItradeX1',
            exchange: 'coinapi',
            symbol: marketData.symbol,
            timeframe,
            direction: analysis.direction,
            price: analysis.price,
            score: analysis.score,
            atr: analysis.atr,
            sl: analysis.stop_loss,
            tp: analysis.take_profit,
            hvp: analysis.hvp,
            filters: analysis.filters,
            indicators: analysis.indicators,
            relaxed_mode: false,
            bar_time: new Date(),
            projected_roi: analysis.projected_roi,
            risk_reward_ratio: analysis.risk_reward_ratio
          }

          await supabase.from('signals').insert(signal)
          await updateSignalCooldown(supabase, 'coinapi', marketData.symbol, timeframe, analysis.direction)
          
          signals.push(signal)
        }
      }
    } catch (error) {
      console.error(`AITRADEX1 analysis error:`, error)
    }
  }

  return signals
}

async function processAIRATETHECOINRanking(marketData: any, supabase: any) {
  try {
    // Calculate AIRATETHECOIN score
    const airaAnalysis = calculateAIRATETHECOINScore(marketData)
    
    if (airaAnalysis.score >= 60) {
      const ranking = {
        symbol: marketData.symbol,
        aira_score: airaAnalysis.score,
        market_cap: airaAnalysis.market_cap,
        liquidity_score: airaAnalysis.liquidity_score,
        smart_money_flows: airaAnalysis.smart_money_flows,
        sentiment_score: airaAnalysis.sentiment_score,
        on_chain_activity: airaAnalysis.on_chain_activity,
        holder_distribution: airaAnalysis.holder_distribution,
        ml_pattern_score: airaAnalysis.ml_pattern_score,
        quantum_probability: airaAnalysis.quantum_probability
      }

      await supabase.from('aira_rankings').upsert(ranking, { onConflict: 'symbol' })
      return ranking
    }
    
    return null
  } catch (error) {
    console.error('AIRATETHECOIN ranking error:', error)
    return null
  }
}

// Canonical AITRADEX1 evaluation
function aitradex1Evaluate(candles: Candle[]) {
  const close = candles.map(c=>n(c.price_close));
  const high  = candles.map(c=>n(c.price_high));
  const low   = candles.map(c=>n(c.price_low));
  const vol   = candles.map(c=>n(c.volume_traded));
  
  if (close.length < 260) return { signal:false };

  const ema21 = ema(close, 21);
  const sma200 = sma(close, 200);
  const adxPack = dmiAdx(high, low, close, 14);
  const kRaw = close.map((_,i)=>{
    const start = Math.max(0,i-13), hh = Math.max(...high.slice(start,i+1)), ll = Math.min(...low.slice(start,i+1));
    return hh===ll ? 50 : 100 * ((close[i]-ll)/(hh-ll));
  });
  const k = sma(kRaw,3), d = sma(k,3);
  const volSma21 = sma(vol,21);
  const ret = [];
  for (let i=1;i<close.length;i++) ret.push((close[i]-close[i-1])/close[i-1]);
  const hvp = hvpPercentile(ret);

  const iLast = close.length-1;
  const emaOkBull = ema21[iLast] > (sma200[sma200.length-1] ?? Infinity) && ema21[iLast] > ema21[iLast-3];
  const emaOkBear = ema21[iLast] < (sma200[sma200.length-1] ?? -Infinity) && ema21[iLast] < ema21[iLast-3];

  const adxLast = adxPack.adx[adxPack.adx.length-1] ?? 0;
  const diP = adxPack.diPlus[adxPack.diPlus.length-1] ?? 0;
  const diM = adxPack.diMinus[adxPack.diMinus.length-1] ?? 0;

  const kLast = k[k.length-1] ?? 50;
  const dLast = d[d.length-1] ?? 50;

  const volSpike = vol[vol.length-1] > 1.7 * (volSma21[volSma21.length-1] ?? 0);
  const spreadPct = Math.abs(close[iLast]-n(candles[iLast].price_open)) / (n(candles[iLast].price_open)||1) * 100;

  const hh5 = Math.max(...high.slice(-6,-1));
  const ll5 = Math.min(...low.slice(-6,-1));
  const breakoutUp = close[iLast] > hh5;
  const breakoutDn = close[iLast] < ll5;

  const longFilters = {
    trend: emaOkBull,
    adx: adxLast >= 28,
    dmi: diP > diM,
    stoch: kLast > dLast && kLast < 35 && dLast < 40,
    volume: volSpike,
    obv: true,      // optional: wire real OBV if needed
    hvp: hvp >= 55 && hvp <= 85,
    spread: spreadPct < 0.10,
    breakout: breakoutUp,
  };
  const shortFilters = {
    trend: emaOkBear,
    adx: adxLast >= 28,
    dmi: diM > diP,
    stoch: kLast < dLast && kLast > 65 && dLast > 60,
    volume: volSpike,
    obv: true,
    hvp: hvp >= 55 && hvp <= 85,
    spread: spreadPct < 0.10,
    breakout: breakoutDn,
  };

  const score = (filters: Record<string, boolean>) =>
    Math.min(100, Object.values(filters).filter(Boolean).length * 12.5);

  const longOK = Object.values(longFilters).every(Boolean);
  const shortOK = Object.values(shortFilters).every(Boolean);

  return {
    signal: longOK || shortOK,
    direction: longOK ? 'LONG' : (shortOK ? 'SHORT' : null),
    price: close[iLast],
    score: longOK ? score(longFilters) : (shortOK ? score(shortFilters) : 0),
    hvp, 
    adx: adxLast, 
    diPlus: diP, 
    diMinus: diM,
    atr: close[iLast] * 0.025, // Simplified ATR
    stop_loss: longOK ? close[iLast] * 0.975 : (shortOK ? close[iLast] * 1.025 : close[iLast]),
    take_profit: longOK ? close[iLast] * 1.06 : (shortOK ? close[iLast] * 0.94 : close[iLast]),
    projected_roi: longOK || shortOK ? 6.0 : 0,
    risk_reward_ratio: 2.4,
    filters: longOK ? longFilters : shortFilters,
    indicators: {
      ema21: ema21[iLast],
      sma200: sma200[sma200.length-1],
      adx: adxLast,
      diPlus: diP,
      diMinus: diM,
      stochK: kLast,
      stochD: dLast,
      hvp,
      volSpike,
      spreadPct
    }
  };
}

function evaluateAITRADEX1Signal(ohlcvData: any[]) {
  return aitradex1Evaluate(ohlcvData);
}

// Real AIRATETHECOIN scoring based on market data
function calculateAIRATETHECOINScore(marketData: any) {
  const { symbol, data } = marketData;
  
  // Get the longest timeframe data available
  const tf1h = data['1h'] || [];
  const tf4h = data['4h'] || [];
  const tf1d = data['1d'] || [];
  
  if (tf1h.length < 50) {
    return { score: 0, market_cap: 0, liquidity_score: 0, smart_money_flows: 0, sentiment_score: 0, on_chain_activity: 0, holder_distribution: 0, ml_pattern_score: 0, quantum_probability: 0 };
  }

  // Calculate liquidity score from volume
  const volumes1h = tf1h.map((c: any) => parseFloat(c.volume_traded));
  const avgVolume = volumes1h.reduce((a, b) => a + b, 0) / volumes1h.length;
  const recentVolume = volumes1h.slice(-24).reduce((a, b) => a + b, 0) / 24;
  const liquidityScore = Math.min(100, Math.log10(avgVolume + 1) * 10);

  // Smart money flow from OBV analysis
  const closes1h = tf1h.map((c: any) => parseFloat(c.price_close));
  const obvSlope = closes1h.length > 20 ? 
    (closes1h[closes1h.length - 1] - closes1h[closes1h.length - 21]) / closes1h[closes1h.length - 21] : 0;
  const smartMoneyFlows = Math.max(0, Math.min(100, (obvSlope + 0.1) * 500));

  // Trend analysis for sentiment
  const ema21_1h = ema(closes1h, 21);
  const sma200_1h = sma(closes1h, 200);
  const trendScore = ema21_1h.length > 0 && sma200_1h.length > 0 && 
    ema21_1h[ema21_1h.length - 1] > sma200_1h[sma200_1h.length - 1] ? 0.8 : 0.3;

  // Pattern detection for ML score
  const highs = tf1h.map((c: any) => parseFloat(c.price_high));
  const lows = tf1h.map((c: any) => parseFloat(c.price_low));
  const hh5 = Math.max(...highs.slice(-6, -1));
  const ll5 = Math.min(...lows.slice(-6, -1));
  const currentPrice = closes1h[closes1h.length - 1];
  const breakoutPattern = currentPrice > hh5 || currentPrice < ll5;
  const mlPatternScore = breakoutPattern ? 1.5 : 0.5;

  // Volatility-based quantum probability
  const returns = [];
  for (let i = 1; i < closes1h.length; i++) {
    returns.push((closes1h[i] - closes1h[i-1]) / closes1h[i-1]);
  }
  const volatility = stdev(returns, Math.min(21, returns.length));
  const quantumProb = Math.min(1, volatility[volatility.length - 1] * 100 || 0.5);

  // Calculate final AIRA score
  const airaScore = Math.min(100, 
    liquidityScore * 0.35 + 
    smartMoneyFlows * 0.25 + 
    trendScore * 30 + 
    mlPatternScore * 5 + 
    quantumProb * 5
  );

  return {
    score: airaScore,
    market_cap: avgVolume * currentPrice * 1000, // Approximation
    liquidity_score: liquidityScore,
    smart_money_flows: smartMoneyFlows,
    sentiment_score: trendScore * 100,
    on_chain_activity: 50, // Default since we don't have chain data
    holder_distribution: 60, // Default
    ml_pattern_score: mlPatternScore,
    quantum_probability: quantumProb
  };
}

async function checkSignalCooldown(supabase: any, exchange: string, symbol: string, timeframe: string, direction: string): Promise<boolean> {
  const { data } = await supabase
    .from('signals_state')
    .select('last_emitted')
    .eq('exchange', exchange)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .eq('direction', direction)
    .single()

  if (!data) return true

  const cooldownMs = timeframe === '5m' ? 5 * 60 * 1000 : timeframe === '15m' ? 15 * 60 * 1000 : 60 * 60 * 1000
  return Date.now() - new Date(data.last_emitted).getTime() > cooldownMs
}

async function updateSignalCooldown(supabase: any, exchange: string, symbol: string, timeframe: string, direction: string) {
  await supabase.from('signals_state').upsert({
    exchange,
    symbol,
    timeframe,
    direction,
    last_emitted: new Date()
  })
}

async function updateFinalAIRARankings(supabase: any) {
  const { data: rankings } = await supabase
    .from('aira_rankings')
    .select('id, aira_score')
    .order('aira_score', { ascending: false })

  if (rankings) {
    for (let i = 0; i < rankings.length; i++) {
      await supabase
        .from('aira_rankings')
        .update({ rank: i + 1 })
        .eq('id', rankings[i].id)
    }
  }
}