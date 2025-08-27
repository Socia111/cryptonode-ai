// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* -------------------------- ENV + SUPABASE CLIENT -------------------------- */
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

/* ---------------------------- CANONICAL SETTINGS --------------------------- */
type Inputs = {
  adxThreshold: number;
  volSpikeMult: number;
  hvpLower: number;
  hvpUpper: number;
  breakoutLen: number;
  useDailyTrendFilter: boolean;
  emaLen: number;
  smaLen: number;
  atrLen: number;
  stochLength: number;
  stochSmoothK: number;
  stochSmoothD: number;
  obvEmaLen: number;
  spreadMaxPct: number;
  cooldownByTF: Record<string, number>;
};

const CANONICAL: Inputs = {
  adxThreshold: 28,
  volSpikeMult: 1.7,
  hvpLower: 55,
  hvpUpper: 85,
  breakoutLen: 5,
  useDailyTrendFilter: true,
  emaLen: 21,
  smaLen: 200,
  atrLen: 14,
  stochLength: 14,
  stochSmoothK: 3,
  stochSmoothD: 3,
  obvEmaLen: 21,
  spreadMaxPct: 0.10,
  cooldownByTF: { "1m": 1, "5m": 3, "15m": 10, "1h": 30 },
};

const RELAXED: Partial<Inputs> = {
  adxThreshold: 22,
  volSpikeMult: 1.4,
  hvpLower: 50,
  hvpUpper: 90,
  breakoutLen: 3,
  useDailyTrendFilter: false,
};

/* -------------------------------- SYMBOL SET ------------------------------- */
const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "LINKUSDT", "LTCUSDT", "APTUSDT",
  "ARBUSDT", "OPUSDT", "NEARUSDT", "ATOMUSDT", "ETCUSDT",
];

/* ---------------------------- UTILS / INDICATORS --------------------------- */
type Bar = { open: number; high: number; low: number; close: number; volume: number; ts: number };
const tfMap: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240" };

// Helper functions
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return `HTTP ${response.status}`;
  }
}

function tfToMs(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
  };
  return map[timeframe] || 60 * 60 * 1000;
}

// Retry + rate limits for Bybit
async function getBybit(url: string, tries = 3, backoff = 300): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'aitradex1/1.0' } 
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      lastErr = await safeText(response);
      if (response.status === 429 || response.status >= 500) {
        console.warn(`⚠️  Bybit rate limit/server error, retrying in ${backoff * (i + 1)}ms...`);
        await delay(backoff * (i + 1));
      } else {
        break; // Don't retry for 4xx errors
      }
    } catch (error) {
      lastErr = error;
      console.warn(`⚠️  Network error, retrying in ${backoff * (i + 1)}ms...`, error);
      await delay(backoff * (i + 1));
    }
  }
  throw new Error(`Bybit fetch failed after ${tries} attempts: ${url} :: ${JSON.stringify(lastErr)}`);
}

// Technical indicators
const sma = (arr: number[], len: number) =>
  arr.map((_, i) => i + 1 >= len ? arr.slice(i + 1 - len, i + 1).reduce((a, b) => a + b, 0) / len : NaN);

const ema = (arr: number[], len: number) => {
  const k = 2 / (len + 1);
  const out: number[] = [];
  let prev = NaN;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (i < len - 1) out.push(NaN);
    else if (i === len - 1) {
      const base = arr.slice(0, len).reduce((a, b) => a + b, 0) / len;
      prev = base; out.push(base);
    } else {
      prev = v * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
};

const rma = (arr: number[], len: number) => {
  const out: number[] = []; let prev = NaN;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (i === 0) { prev = v; out.push(v); }
    else { prev = (prev * (len - 1) + v) / len; out.push(prev); }
  }
  return out;
};

function atr(high: number[], low: number[], close: number[], len: number) {
  const tr = high.map((h, i) => {
    if (i === 0) return h - low[i];
    return Math.max(h - low[i], Math.abs(h - close[i - 1]), Math.abs(low[i] - close[i - 1]));
  });
  return rma(tr, len);
}

function dmiAdx(high: number[], low: number[], close: number[], len: number) {
  const plusDM: number[] = [NaN];
  const minusDM: number[] = [NaN];
  for (let i = 1; i < high.length; i++) {
    const up = high[i] - high[i - 1];
    const down = low[i - 1] - low[i];
    plusDM.push(up > 0 && up > down ? up : 0);
    minusDM.push(down > 0 && down > up ? down : 0);
  }
  const trArr = high.map((h, i) => i === 0 ? h - low[i] :
    Math.max(h - low[i], Math.abs(h - close[i - 1]), Math.abs(low[i] - close[i - 1])));
  const ATR = rma(trArr, len);
  const plusDI = plusDM.map((v, i) => 100 * rma(plusDM, len)[i] / ATR[i]);
  const minusDI = minusDM.map((v, i) => 100 * rma(minusDM, len)[i] / ATR[i]);
  const dx = plusDI.map((p, i) => 100 * Math.abs((p - minusDI[i]) / (p + minusDI[i])));
  const ADX = rma(dx.map(v => isFinite(v) ? v : 0), len);
  return { plusDI, minusDI, ADX };
}

const stoch = (high: number[], low: number[], close: number[], len = 14, smoothK = 3, smoothD = 3) => {
  const kRaw = close.map((c, i) => {
    if (i + 1 < len) return NaN;
    const hh = Math.max(...high.slice(i + 1 - len, i + 1));
    const ll = Math.min(...low.slice(i + 1 - len, i + 1));
    return hh === ll ? 50 : 100 * (c - ll) / (hh - ll);
  });
  const k = sma(kRaw, smoothK);
  const d = sma(k.map(v => isNaN(v) ? 50 : v), smoothD);
  return { k, d };
};

const obv = (close: number[], vol: number[]) => {
  const out: number[] = [vol[0] || 0];
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) out.push(out[i - 1] + vol[i]);
    else if (close[i] < close[i - 1]) out.push(out[i - 1] - vol[i]);
    else out.push(out[i - 1]);
  }
  return out;
};

function hvp(close: number[]) {
  const rets = close.map((c, i) => i === 0 ? 0 : (c - close[i - 1]) / close[i - 1]);
  const sigma21 = rets.map((_, i) => {
    if (i + 1 < 21) return NaN;
    const slice = rets.slice(i + 1 - 21, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const sd = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length);
    return sd * Math.sqrt(252);
  });
  const window252 = (i: number) => Math.max(0, i + 1 - 252);
  const hvpPct = sigma21.map((sig, i) => {
    if (isNaN(sig)) return NaN;
    const maxLast = Math.max(...sigma21.slice(window252(i), i + 1).filter(x => !isNaN(x)));
    return maxLast > 0 ? (100 * sig / maxLast) : NaN;
  });
  return hvpPct;
}

/* ------------------------------ DATA PROVIDERS ----------------------------- */
async function fetchBybitBars(symbol: string, tf: string, limit = 500, category = "linear"): Promise<Bar[]> {
  const interval = tfMap[tf] ?? "60";
  const url = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const data = await getBybit(url);
  
  if (!data?.result?.list) {
    throw new Error(`Bybit kline error for ${symbol} ${tf}: ${JSON.stringify(data)}`);
  }
  
  // result.list: newest first -> sort oldest first
  const rows = [...data.result.list].reverse();
  const bars = rows.map((row: any) => ({
    ts: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
  
  // A. Candle provenance logging
  console.log('bybit.ohlcv', {
    symbol, tf, bars: bars.length,
    firstBar: new Date(bars[0].ts).toISOString(),
    lastBar: new Date(bars[bars.length - 1].ts).toISOString(),
    source: 'bybit-rest'
  });
  
  return bars;
}

async function crossCheckPrice(symbol: string, lastClose: number): Promise<void> {
  try {
    const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
    const data = await getBybit(url);
    
    if (data?.result?.list?.[0]?.lastPrice) {
      const tickerPrice = Number(data.result.list[0].lastPrice);
      const delta = Math.abs(tickerPrice - lastClose);
      const deltaPercent = (delta / lastClose) * 100;
      
      console.log('price.crosscheck', {
        symbol,
        ohlcClose: lastClose,
        tickerPrice,
        delta,
        deltaPercent: deltaPercent.toFixed(4) + '%',
        withinTolerance: deltaPercent < 0.5
      });
      
      if (deltaPercent > 1.0) {
        console.warn(`⚠️  Price divergence detected for ${symbol}: OHLC=${lastClose}, Ticker=${tickerPrice} (${deltaPercent.toFixed(2)}%)`);
      }
    }
  } catch (error) {
    console.warn(`Failed to cross-check price for ${symbol}:`, error);
  }
}

async function persistCandleBatch(symbol: string, timeframe: string, bars: Bar[]): Promise<string> {
  const candleSetId = crypto.randomUUID();
  
  try {
    const candleInserts = bars.map(bar => ({
      id: crypto.randomUUID(),
      symbol,
      timeframe,
      bar_time: new Date(bar.ts).toISOString(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      source: 'bybit'
    }));
    
    const { error } = await supabase.from('candles').insert(candleInserts);
    if (error) {
      console.warn('Failed to persist candle batch:', error);
    } else {
      console.log(`✅ Persisted ${candleInserts.length} candles for ${symbol} ${timeframe}`);
    }
  } catch (error) {
    console.warn('Error persisting candles:', error);
  }
  
  return candleSetId;
}

/* --------------------------------- LOGIC ---------------------------------- */
function confidenceScore(buckets: Record<string, boolean>) {
  const hits = Object.values(buckets).filter(Boolean).length;
  return Math.min(100, hits * 10); // Adjusted for 10 buckets
}

function riskTargets(price: number, atrv: number, hvpVal: number) {
  const tpATR = hvpVal > 75 ? 3.5 : hvpVal > 65 ? 3.0 : 2.5;
  return { 
    tpATR, 
    longTP: price + tpATR * atrv, 
    shortTP: price - tpATR * atrv, 
    slLong: price - 1.5 * atrv, 
    slShort: price + 1.5 * atrv 
  };
}

function tfCooldownMinutes(tf: string, inputs: Inputs) {
  return inputs.cooldownByTF[tf] ?? 10;
}

/* ------------------------------ DB + TELEGRAM ------------------------------ */
async function hasSignalKey(uniqueKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("signals_state")
    .select("last_emitted_at")
    .eq("unique_key", uniqueKey)
    .maybeSingle();
    
  return !error && !!data;
}

async function markEmitted(symbol: string, tf: string, dir: "LONG" | "SHORT", uniqueKey: string) {
  await supabase.from("signals_state").upsert(
    { 
      symbol, 
      timeframe: tf, 
      direction: dir, 
      unique_key: uniqueKey,
      last_emitted_at: new Date().toISOString() 
    },
    { onConflict: "symbol,timeframe,direction" },
  );
}

async function saveSignal(payload: any) {
  const { error } = await supabase.from("signals").insert(payload);
  if (error) console.warn("signals insert error:", error.message);
}

async function sendTelegram(alertText: string) {
  // Use the telegram-bot function for proper signal formatting and delivery
  try {
    // Parse the alert text to extract signal data
    const lines = alertText.split('\n');
    const headerMatch = lines[0].match(/\*(\w+)\*.*\*(\w+)\* (\w+):(\w+) \*(\w+)\*/);
    const priceMatch = lines[1].match(/@ ([\d.,]+).*Score: \*([\d.]+)\*/);
    const indicatorsMatch = lines[2].match(/ADX: ([\d.]+).*HVP: ([\d.]+).*%K: ([\d.]+)/);
    const targetsMatch = lines[3].match(/SL: ([\d.,]+).*TP: ([\d.,]+)/);
    
    if (!headerMatch || !priceMatch) {
      console.warn('⚠️ Could not parse alert text for Telegram');
      return;
    }
    
    const [, algo, direction, exchange, symbol, timeframe] = headerMatch;
    const [, priceStr, scoreStr] = priceMatch;
    const price = parseFloat(priceStr.replace(/,/g, ''));
    const score = parseFloat(scoreStr);
    
    let indicators: any = {};
    let sl: number | undefined;
    let tp: number | undefined;
    
    if (indicatorsMatch) {
      const [, adxStr, hvpStr, kStr] = indicatorsMatch;
      indicators = {
        adx: parseFloat(adxStr),
        stoch_k: parseFloat(kStr),
        volume_spike: alertText.includes('OBV↑') || alertText.includes('OBV↓')
      };
    }
    
    if (targetsMatch) {
      const [, slStr, tpStr] = targetsMatch;
      sl = parseFloat(slStr.replace(/,/g, ''));
      tp = parseFloat(tpStr.replace(/,/g, ''));
    }
    
    const signal = {
      signal_id: `${symbol}_${timeframe}_${direction}_${Date.now()}`,
      token: symbol,
      direction: direction === 'LONG' ? 'LONG' : 'SHORT',
      entry_price: price,
      confidence_score: score,
      sl,
      tp,
      hvp: indicators.adx ? parseFloat(indicatorsMatch![2]) : undefined,
      indicators,
      is_premium: score >= 85
    };
    
    console.log('📤 Sending Telegram signal:', { symbol, direction, score });
    
    const { error } = await supabase.functions.invoke('telegram-bot', {
      body: { signal }
    });
    
    if (error) {
      await supabase.from("alerts_log").insert({ 
        channel: "telegram", 
        status: "error", 
        payload: alertText,
        error_msg: error.message 
      });
      console.error('❌ Telegram send error:', error);
    } else {
      await supabase.from("alerts_log").insert({ 
        channel: "telegram", 
        status: "sent", 
        payload: alertText 
      });
      console.log('✅ Telegram alert sent successfully');
    }
  } catch (err) {
    console.error('❌ Telegram function error:', err);
  }
}

/* --------------------------------- SERVER --------------------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let scanId: string | null = null;
  
  try {
    const body = req.method === "POST" ? await req.json() : {};
    const {
      exchange = "bybit",
      timeframe = "1h",
      relaxed_filters = false,
      symbols = DEFAULT_SYMBOLS,
      category = "linear",
    } = body ?? {};

    const inputs: Inputs = { ...CANONICAL, ...(relaxed_filters ? RELAXED : {}) };
    
    // Create scan record
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .insert({
        exchange,
        timeframe,
        status: 'running'
      })
      .select()
      .single();
      
    if (scanError) {
      console.warn('Failed to create scan record:', scanError);
    } else {
      scanId = scanData.id;
    }

    const results: any[] = [];
    let signalsFound = 0;
    let symbolsProcessed = 0;

    for (const symbol of symbols) {
      try {
        console.log(`🔍 Scanning ${symbol} ${timeframe}...`);
        
        // 1) Fetch data with retry/backoff
        const bars = await fetchBybitBars(symbol, timeframe, 600, category);
        if (bars.length < 250) {
          console.warn(`⚠️  Insufficient data for ${symbol}: ${bars.length} bars`);
          continue;
        }

        // 2) Bar-close only (avoid repaint)
        const now = Date.now();
        const tfMs = tfToMs(timeframe);
        const lastBar = bars[bars.length - 1];
        const barClosed = now >= lastBar.ts + tfMs;
        
        if (!barClosed) {
          bars.pop(); // Drop partial bar
          console.log(`⏰ Dropped partial bar for ${symbol} (bar not closed)`);
        }
        
        if (bars.length < 250) continue;

        // 3) Cross-check price
        await crossCheckPrice(symbol, lastBar.close);
        
        // 4) Persist candle batch for lineage
        const candleSetId = await persistCandleBatch(symbol, timeframe, bars.slice(-100)); // Last 100 bars

        // Evaluate on last CLOSED bar
        const lastIdx = bars.length - 1;
        const slice = bars.slice(0, lastIdx + 1);

        const close = slice.map(b => b.close);
        const high = slice.map(b => b.high);
        const low = slice.map(b => b.low);
        const open = slice.map(b => b.open);
        const vol = slice.map(b => b.volume);

        // 5) Indicators
        const ema21 = ema(close, inputs.emaLen);
        const sma200 = sma(close, inputs.smaLen);
        const ATR = atr(high, low, close, inputs.atrLen);
        const { plusDI, minusDI, ADX } = dmiAdx(high, low, close, inputs.atrLen);
        const { k, d } = stoch(high, low, close, inputs.stochLength, inputs.stochSmoothK, inputs.stochSmoothD);
        const volSMA21 = sma(vol, 21);
        const obvSeries = obv(close, vol);
        const obvEMA = ema(obvSeries, inputs.obvEmaLen);
        const HVP = hvp(close);

        const i = lastIdx;

        const trendUp = ema21[i] > sma200[i] && ema21[i] > ema21[i - 3];
        const trendDown = ema21[i] < sma200[i] && ema21[i] < ema21[i - 3];

        const adxOK = ADX[i] >= inputs.adxThreshold;
        const dmiBull = plusDI[i] > minusDI[i] && plusDI[i] > plusDI[i - 3];
        const dmiBear = minusDI[i] > plusDI[i] && minusDI[i] > minusDI[i - 3];

        const stochBull = k[i] > d[i] && k[i] < 35 && d[i] < 40;
        const stochBear = k[i] < d[i] && k[i] > 65 && d[i] > 60;

        const volSpike = vol[i] > inputs.volSpikeMult * (volSMA21[i] ?? Infinity);
        const obvBull = obvSeries[i] > obvEMA[i] && obvSeries[i] > obvSeries[i - 3];
        const obvBear = obvSeries[i] < obvEMA[i] && obvSeries[i] < obvSeries[i - 3];

        const hvpVal = HVP[i];
        const hvpOK = hvpVal >= inputs.hvpLower && hvpVal <= inputs.hvpUpper;

        const spreadPct = Math.abs(close[i] - open[i]) / Math.max(1e-9, open[i]) * 100;
        const spreadOK = spreadPct <= inputs.spreadMaxPct;

        const breakoutLong = close[i] > Math.max(...high.slice(i - inputs.breakoutLen, i));
        const breakoutShort = close[i] < Math.min(...low.slice(i - inputs.breakoutLen, i));

        // Buckets & score
        const longBuckets = {
          trend: trendUp,
          adx: adxOK,
          dmi: dmiBull,
          stoch: stochBull,
          volume: volSpike,
          obv: obvBull,
          hvp: hvpOK,
          spread: spreadOK,
          breakout: breakoutLong,
        };
        
        const shortBuckets = {
          trend: trendDown,
          adx: adxOK,
          dmi: dmiBear,
          stoch: stochBear,
          volume: volSpike,
          obv: obvBear,
          hvp: hvpOK,
          spread: spreadOK,
          breakout: breakoutShort,
        };

        const longPass = Object.values(longBuckets).every(Boolean);
        const shortPass = Object.values(shortBuckets).every(Boolean);
        const price = close[i];

        // 6) Cooldown & dedupe
        const barTime = slice[i].ts;
        
        if (longPass) {
          const uniqueKey = `${exchange}:${symbol}:${timeframe}:LONG:${barTime}`;
          const exists = await hasSignalKey(uniqueKey);
          
          if (!exists) {
            const { tpATR, longTP, slLong } = riskTargets(price, ATR[i], hvpVal);
            const score = confidenceScore(longBuckets as any);

            const payload = {
              algo: "AItradeX1",
              exchange,
              symbol,
              timeframe,
              direction: "LONG",
              bar_time: new Date(barTime).toISOString(),
              price,
              score,
              risk: { atr: ATR[i], tpATR, sl: slLong, tp: longTP },
              indicators: {
                adx: ADX[i], diPlus: plusDI[i], diMinus: minusDI[i],
                k: k[i], d: d[i], hvp: hvpVal, vol_spike: volSpike,
              },
              filters: longBuckets,
              relaxed_mode: relaxed_filters,
              candle_set_id: candleSetId,
              unique_key: uniqueKey
            };

            await saveSignal(payload);
            await markEmitted(symbol, timeframe, "LONG", uniqueKey);
            signalsFound++;

            // Enhanced Telegram format
            if (score >= 75) {
              const alertText = 
                `*AItradeX1* — *LONG* ${exchange.toUpperCase()}:${symbol} *${timeframe}*\n` +
                `@ ${price.toLocaleString()}   Score: *${score.toFixed(1)}*\n` +
                `ADX: ${ADX[i].toFixed(1)}  HVP: ${hvpVal.toFixed(0)}  %K: ${k[i].toFixed(0)}  OBV${obvBull ? '↑' : '↓'}\n` +
                `SL: ${slLong.toLocaleString()}  TP: ${longTP.toLocaleString()}\n` +
                `#aitradex1 #${exchange} #${timeframe.replace('m', 'min')} #long`;
              
              await sendTelegram(alertText);
            }

            results.push(payload);
          } else {
            console.log(`⏭️  Skipping duplicate LONG signal for ${symbol} (cooldown)`);
          }
        }

        if (shortPass) {
          const uniqueKey = `${exchange}:${symbol}:${timeframe}:SHORT:${barTime}`;
          const exists = await hasSignalKey(uniqueKey);
          
          if (!exists) {
            const { tpATR, shortTP, slShort } = riskTargets(price, ATR[i], hvpVal);
            const score = confidenceScore(shortBuckets as any);

            const payload = {
              algo: "AItradeX1",
              exchange,
              symbol,
              timeframe,
              direction: "SHORT",
              bar_time: new Date(barTime).toISOString(),
              price,
              score,
              risk: { atr: ATR[i], tpATR, sl: slShort, tp: shortTP },
              indicators: {
                adx: ADX[i], diPlus: plusDI[i], diMinus: minusDI[i],
                k: k[i], d: d[i], hvp: hvpVal, vol_spike: volSpike,
              },
              filters: shortBuckets,
              relaxed_mode: relaxed_filters,
              candle_set_id: candleSetId,
              unique_key: uniqueKey
            };

            await saveSignal(payload);
            await markEmitted(symbol, timeframe, "SHORT", uniqueKey);
            signalsFound++;

            if (score >= 75) {
              const alertText = 
                `*AItradeX1* — *SHORT* ${exchange.toUpperCase()}:${symbol} *${timeframe}*\n` +
                `@ ${price.toLocaleString()}   Score: *${score.toFixed(1)}*\n` +
                `ADX: ${ADX[i].toFixed(1)}  HVP: ${hvpVal.toFixed(0)}  %K: ${k[i].toFixed(0)}  OBV${obvBear ? '↓' : '↑'}\n` +
                `SL: ${slShort.toLocaleString()}  TP: ${shortTP.toLocaleString()}\n` +
                `#aitradex1 #${exchange} #${timeframe.replace('m', 'min')} #short`;
              
              await sendTelegram(alertText);
            }

            results.push(payload);
          } else {
            console.log(`⏭️  Skipping duplicate SHORT signal for ${symbol} (cooldown)`);
          }
        }
        
        symbolsProcessed++;
        
      } catch (err) {
        console.warn(`❌ Scan error for ${symbol}:`, (err as Error).message);
      }
    }
    
    // Update scan record
    if (scanId) {
      await supabase
        .from('scans')
        .update({
          status: 'completed',
          signals_found: signalsFound,
          symbols_processed: symbolsProcessed,
          completed_at: new Date().toISOString()
        })
        .eq('id', scanId);
    }

    const response = {
      success: true,
      exchange,
      timeframe,
      relaxed_filters,
      signals_found: signalsFound,
      symbols_processed: symbolsProcessed,
      items: results,
      scan_id: scanId,
      data_source: 'bybit_real_ohlcv',
      bar_close_only: true,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Live scan completed: ${signalsFound} signals from ${symbolsProcessed} symbols`);

    return new Response(JSON.stringify(response), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("❌ Live scanner error:", error?.message || error);
    
    // Update scan record with error
    if (scanId) {
      await supabase
        .from('scans')
        .update({
          status: 'error',
          error_message: error?.message || String(error),
          completed_at: new Date().toISOString()
        })
        .eq('id', scanId);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error),
      scan_id: scanId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});