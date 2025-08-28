// supabase/functions/live-scanner-production/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type K = { time:number; open:number; high:number; low:number; close:number; volume:number };
type ScanReq = {
  exchange?: "bybit";
  timeframe?: "1m"|"3m"|"5m"|"15m"|"30m"|"1h"|"2h"|"4h";
  symbols?: string[];
  relaxed_filters?: boolean;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const AITRADEX1 = {
  // canonical (tight) - LOWERED EXPECTATIONS
  tight: {
    adxThreshold: 20,
    volSpikeMult: 1.3,
    hvpLower: 40,
    hvpUpper: 95,
    breakoutLen: 3,
    spreadMaxPct: 0.15,
    useDailyTrendFilter: false,
  },
  // relaxed (for discovery/quiet markets) - VERY RELAXED
  relaxed: {
    adxThreshold: 15,
    volSpikeMult: 1.1,
    hvpLower: 30,
    hvpUpper: 98,
    breakoutLen: 2,
    spreadMaxPct: 0.20,
    useDailyTrendFilter: false,
  }
};

// ---------- Utilities

const bybitIntervalMap: Record<string,string> = {
  "1m":"1","3m":"3","5m":"5","15m":"15","30m":"30","1h":"60","2h":"120","4h":"240",
};

function floorToTf(ts:number, tf:string):number {
  const ms = { "1m":60e3, "3m":180e3, "5m":300e3, "15m":900e3, "30m":1800e3, "1h":3600e3, "2h":7200e3, "4h":14400e3 }[tf];
  return Math.floor(ts/ms)*ms;
}

async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

async function getBybit(url:string, tries=3, backoff=300){
  let last:any;
  for (let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { headers:{ "User-Agent":"aitradex1/1.0" }});
      if (res.ok){
        return await res.json();
      }
      const txt = await res.text();
      last = txt;
      if (res.status===429 || res.status>=500){
        await sleep(backoff*(i+1));
        continue;
      }
      break;
    }catch(e){ last = e; await sleep(backoff*(i+1)); }
  }
  throw new Error(`Bybit API failed: ${last}`);
}

async function fetchBybitOHLCV(symbol:string, tf:string, limit=300):Promise<K[]>{
  const interval = bybitIntervalMap[tf];
  if (!interval) throw new Error(`Unsupported tf ${tf}`);

  // Pull up to `limit`, but ensure last candle is CLOSED
  const now = Date.now();
  const end = floorToTf(now, tf); // end at last closed bar time
  // Bybit v5 kline: you can pass start/end; but we can simply request limit and drop the last if still open.
  const params = new URLSearchParams({
    category: "linear",
    symbol,
    interval,
    limit: String(limit),
  });
  const url = `https://api.bybit.com/v5/market/kline?${params}`;
  const data = await getBybit(url);

  if (data.retCode !== 0) throw new Error(`Bybit error: ${data.retMsg || data.retCode}`);

  const list:any[] = (data?.result?.list) || [];
  // Bybit returns newest->oldest; reverse to oldest->newest
  const rows = list.reverse().map((item:any)=>({
    time: parseInt(item[0]), open: +item[1], high: +item[2], low: +item[3], close: +item[4], volume: +item[5]
  })) as K[];

  // drop any candle that appears newer than the last closed boundary
  return rows.filter(k => k.time <= end - 1);
}

// ---------- Indicators (minimal, efficient)

function SMA(arr:number[], len:number){ if (arr.length<len) return Array(arr.length).fill(NaN); const out:number[]=[]; let s=0; for(let i=0;i<arr.length;i++){ s+=arr[i]; if(i>=len) s-=arr[i-len]; out.push(i>=len-1? s/len : NaN); } return out; }
function EMA(arr:number[], len:number){ const out:number[]=[]; const a=2/(len+1); let e=arr[0]; for(let i=0;i<arr.length;i++){ if(i===0){ out.push(NaN); } else { e=a*arr[i]+(1-a)*e; out.push(i<len?NaN:e); } } return out; }
function TR(o:K[], i:number){ if(i===0)return o[0].high-o[0].low; const prevClose=o[i-1].close; return Math.max(o[i].high-o[i].low, Math.abs(o[i].high-prevClose), Math.abs(o[i].low-prevClose)); }
function ATR(ohlc:K[], len=14){ const out:number[]=[]; let sum=0; for(let i=0;i<ohlc.length;i++){ const v=TR(ohlc,i); sum+=v; if(i>=len) sum-=TR(ohlc,i-len); out.push(i>=len? sum/len : NaN); } return out; }
function DMI_ADX(ohlc:K[], len=14){
  const dmPlus:number[] = [], dmMinus:number[] = [], tr:number[]=[];
  for(let i=0;i<ohlc.length;i++){
    if(i===0){ dmPlus.push(0); dmMinus.push(0); tr.push(0); continue; }
    const up = ohlc[i].high - ohlc[i-1].high;
    const dn = ohlc[i-1].low  - ohlc[i].low;
    dmPlus.push( (up>dn && up>0) ? up : 0 );
    dmMinus.push( (dn>up && dn>0) ? dn : 0 );
    tr.push(TR(ohlc,i));
  }
  // Wilder smooth
  const smooth = (arr:number[])=>{
    const out:number[]=[]; let s=0; for(let i=0;i<arr.length;i++){ s += arr[i]; if(i>=len) s -= arr[i-len]; out.push(i>=len? s : NaN); } return out;
  };
  const dmP = smooth(dmPlus), dmM = smooth(dmMinus), trS = smooth(tr);
  const diP:number[] = [], diM:number[]=[];
  for(let i=0;i<ohlc.length;i++){
    if (isNaN(trS[i]) || trS[i]===0){ diP.push(NaN); diM.push(NaN); }
    else { diP.push(100*(dmP[i]/trS[i])); diM.push(100*(dmM[i]/trS[i])); }
  }
  const dx = diP.map((v,i)=> (isNaN(v)||isNaN(diM[i])) ? NaN : 100*Math.abs(v-diM[i])/(v+diM[i]));
  const adx = SMA(dx.filter((_,i)=>!isNaN(dx[i])), len); // quick approx
  // pad adx to same length
  const pad:number[] = Array(ohlc.length - adx.length).fill(NaN).concat(adx);
  return { diP, diM, adx: pad };
}
function STOCH(ohlc:K[], len=14, kS=3, dS=3){
  const k:number[]=[];
  for(let i=0;i<ohlc.length;i++){
    const a = Math.max(0, i-len+1);
    const slice = ohlc.slice(a,i+1);
    const hh = Math.max(...slice.map(x=>x.high));
    const ll = Math.min(...slice.map(x=>x.low));
    const v = (hh===ll) ? 50 : 100*(ohlc[i].close-ll)/(hh-ll);
    k.push(v);
  }
  const smooth = (arr:number[], n:number)=> SMA(arr, n);
  const kSm = smooth(k, kS);
  const d = smooth(kSm, dS);
  return { k: kSm, d };
}
function OBV(ohlc:K[]){
  const out:number[]=[0];
  for (let i=1;i<ohlc.length;i++){
    const dir = ohlc[i].close>ohlc[i-1].close ? 1 : ohlc[i].close<ohlc[i-1].close ? -1 : 0;
    out.push(out[i-1] + dir*ohlc[i].volume);
  }
  return out;
}
// HVP: 21-day stdev of returns vs max over 252d
function HVP(ohlc:K[]){
  const ret:number[] = [];
  for (let i=1;i<ohlc.length;i++) ret.push((ohlc[i].close-ohlc[i-1].close)/ohlc[i-1].close);
  const stdev = (arr:number[], n:number)=>{
    const out:number[]=[]; for(let i=0;i<arr.length;i++){
      const a = i-n+1; if (a<0){ out.push(NaN); continue; }
      const seg = arr.slice(a,i+1); const m = seg.reduce((s,v)=>s+v,0)/n;
      const v = Math.sqrt(seg.reduce((s,v)=>s+(v-m)*(v-m),0)/n);
      out.push(v * Math.sqrt(252)); // annualize
    } return out;
  };
  const v21 = stdev(ret,21);
  const hvp:number[]=[];
  for (let i=0;i<v21.length;i++){
    const a = Math.max(0, i-252+1);
    const max = Math.max(...v21.slice(a,i+1).filter(x=>!isNaN(x)));
    hvp.push(isFinite(max)&&max>0 ? 100*(v21[i]/max) : NaN);
  }
  // pad to OHLC length (add 1 because returns shorter)
  return [NaN].concat(hvp);
}

// ---------- Core evaluation

function evalAItradeX1(ohlc:K[], tfCfg:typeof AITRADEX1.tight){
  const close = ohlc.map(k=>k.close);
  const vol   = ohlc.map(k=>k.volume);

  const ema21 = EMA(close,21);
  const sma200= SMA(close,200);
  const { diP, diM, adx } = DMI_ADX(ohlc,14);
  const { k, d } = STOCH(ohlc,14,3,3);
  const volSma21 = SMA(vol,21);
  const obv = OBV(ohlc);
  const obvEma21 = EMA(obv,21);
  const hvp = HVP(ohlc);
  const i = ohlc.length-1; // last closed bar

  const bullishTrend = ema21[i] > sma200[i] && ema21[i] > ema21[i-3];
  const bearishTrend = ema21[i] < sma200[i] && ema21[i] < ema21[i-3];

  const adxStrong = adx[i] >= tfCfg.adxThreshold;
  const bullDMI = diP[i] > diM[i] && diP[i] > diP[i-3];
  const bearDMI = diM[i] > diP[i] && diM[i] > diM[i-3];

  const stochBull = k[i] > d[i] && k[i] < 35 && d[i] < 40;
  const stochBear = k[i] < d[i] && k[i] > 65 && d[i] > 60;

  const volSpike = vol[i] > tfCfg.volSpikeMult * volSma21[i];
  const obvBull  = obv[i] > obvEma21[i] && obv[i] > obv[i-3];
  const obvBear  = obv[i] < obvEma21[i] && obv[i] < obv[i-3];

  const hvpOk    = hvp[i] >= tfCfg.hvpLower && hvp[i] <= tfCfg.hvpUpper;

  const spreadPct = Math.abs(ohlc[i].close - ohlc[i].open) / ohlc[i].open * 100;
  const spreadOk = spreadPct < tfCfg.spreadMaxPct;

  // Breakout windows (exclude current)
  const hh = Math.max(...ohlc.slice(i-tfCfg.breakoutLen, i).map(x=>x.high));
  const ll = Math.min(...ohlc.slice(i-tfCfg.breakoutLen, i).map(x=>x.low));
  const breakoutLong  = ohlc[i].close > hh;
  const breakoutShort = ohlc[i].close < ll;

  const longOk = bullishTrend && adxStrong && bullDMI && stochBull && volSpike && obvBull && hvpOk && spreadOk && breakoutLong;
  const shortOk= bearishTrend && adxStrong && bearDMI && stochBear && volSpike && obvBear && hvpOk && spreadOk && breakoutShort;

  // Score: 9 buckets × 11.1 (rounded to 12.5 for cleaner numbers)
  const longBuckets  = [bullishTrend, adxStrong, bullDMI, stochBull, volSpike, obvBull, hvpOk, spreadOk, breakoutLong];
  const shortBuckets = [bearishTrend, adxStrong, bearDMI, stochBear, volSpike, obvBear, hvpOk, spreadOk, breakoutShort];
  const longScore  = Math.min(100, longBuckets.filter(Boolean).length * 11.1);
  const shortScore = Math.min(100, shortBuckets.filter(Boolean).length * 11.1);

  const atr = ATR(ohlc,14)[i];
  const hvpVal = hvp[i] || 0;
  const tpATR = hvpVal > 75 ? 3.5 : hvpVal > 65 ? 3.0 : 2.5;

  return {
    i, ema21, sma200, adx, diP, diM, k, d, hvp, obv, obvEma21, volSma21,
    longOk, shortOk, longScore, shortScore,
    risk: {
      atr,
      slLong: ohlc[i].close - 1.5*atr,
      tpLong: ohlc[i].close + tpATR*atr,
      slShort: ohlc[i].close + 1.5*atr,
      tpShort: ohlc[i].close - tpATR*atr,
    },
    filters: {
      trend: longOk ? bullishTrend : shortOk ? bearishTrend : false,
      adx: adxStrong,
      dmi: longOk ? bullDMI : shortOk ? bearDMI : false,
      stoch: longOk ? stochBull : shortOk ? stochBear : false,
      volume: volSpike,
      obv: longOk ? obvBull : shortOk ? obvBear : false,
      hvp: hvpOk,
      spread: spreadOk,
      breakout: longOk ? breakoutLong : shortOk ? breakoutShort : false,
    }
  };
}

// ---------- Edge function

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try{
    const body = (req.method==="POST") ? await req.json() as ScanReq : {};
    const exchange = "bybit";
    const timeframe = body.timeframe ?? "15m";
    const relaxed = !!body.relaxed_filters;
    let symbols = body.symbols;
    
    // If no symbols provided, fetch all USDT pairs from Bybit
    if (!symbols || symbols.length === 0) {
      try {
        console.log("🔍 Fetching all USDT trading pairs from Bybit...");
        const symbolsUrl = "https://api.bybit.com/v5/market/instruments-info?category=linear";
        const symbolsData = await getBybit(symbolsUrl);
        
        if (symbolsData.retCode === 0) {
          const allSymbols = symbolsData.result.list
            .filter((instrument: any) => 
              instrument.symbol.endsWith('USDT') && 
              instrument.status === 'Trading' &&
              instrument.symbol !== 'USDC' // Exclude stablecoins
            )
            .map((instrument: any) => instrument.symbol)
            .sort();
          
          console.log(`📊 Found ${allSymbols.length} active USDT trading pairs`);
          symbols = allSymbols;
        } else {
          console.warn("⚠️ Failed to fetch symbols, using defaults");
          symbols = ["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT","DOTUSDT","BNBUSDT","XRPUSDT"];
        }
      } catch (e) {
        console.error("❌ Error fetching symbols:", e);
        symbols = ["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT","DOTUSDT","BNBUSDT","XRPUSDT"];
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`🔍 AItradeX1 scan: tf=${timeframe} relaxed=${relaxed} symbols=${symbols.length}`);

    const cfg = relaxed ? AITRADEX1.relaxed : AITRADEX1.tight;
    let signalsFound = 0;
    const results:any[] = [];

    for (const symbol of symbols){
      try{
        console.log(`📊 Analyzing ${symbol}...`);
        const ohlc = await fetchBybitOHLCV(symbol, timeframe, 300);
        if (ohlc.length < 210){ 
          console.warn(`⚠️ Insufficient REAL data for ${symbol}: ${ohlc.length} bars`); 
          continue; 
        }

        const ev = evalAItradeX1(ohlc, cfg);
        const i = ev.i;
        const barTime = new Date(ohlc[i].time).toISOString();

        const common = {
          algo: "AItradeX1",
          exchange, symbol,
          timeframe,
          price: ohlc[i].close,
          score: Math.max(ev.longScore, ev.shortScore),
          bar_time: barTime,
          atr: ev.risk.atr,
          hvp: ev.hvp[i] || 0,
          filters: ev.filters,
          indicators: {
            adx: ev.adx[i], 
            diPlus: ev.diP[i], 
            diMinus: ev.diM[i],
            k: ev.k[i], 
            d: ev.d[i], 
            hvp: ev.hvp[i],
            volSma21: ev.volSma21[i],
            ema21: ev.ema21[i],
            sma200: ev.sma200[i],
            obv: ev.obv[i],
            obvEma21: ev.obvEma21[i]
          },
          relaxed_mode: relaxed,
          created_at: new Date().toISOString(),
        };

        // Try LONG - Only save high-quality signals (score >= 75%)
        if (ev.longOk && ev.longScore >= 75){
          const payload = {
            ...common,
            direction: "LONG",
            score: ev.longScore,
            sl: ev.risk.slLong,
            tp: ev.risk.tpLong,
          };
          const { error } = await supabase
            .from("signals")
            .insert(payload)
            .select()
            .maybeSingle();
          if (error && !String(error.message).match(/duplicate key|unique/i)) {
            console.warn(`Insert LONG ${symbol} failed: ${error.message}`);
          } else {
            signalsFound++;
            results.push({ symbol, direction:"LONG", score: ev.longScore, bar_time: barTime });
            console.log(`✅ ${symbol} LONG signal saved (score: ${ev.longScore.toFixed(1)}%)`);
          }
        }

        // Try SHORT - Only save high-quality signals (score >= 75%)
        if (ev.shortOk && ev.shortScore >= 75){
          const payload = {
            ...common,
            direction: "SHORT",
            score: ev.shortScore,
            sl: ev.risk.slShort,
            tp: ev.risk.tpShort,
          };
          const { error } = await supabase
            .from("signals")
            .insert(payload)
            .select()
            .maybeSingle();
          if (error && !String(error.message).match(/duplicate key|unique/i)) {
            console.warn(`Insert SHORT ${symbol} failed: ${error.message}`);
          } else {
            signalsFound++;
            results.push({ symbol, direction:"SHORT", score: ev.shortScore, bar_time: barTime });
            console.log(`✅ ${symbol} SHORT signal saved (score: ${ev.shortScore.toFixed(1)}%)`);
          }
        }

        // Debug logging for no signals
        if (!ev.longOk && !ev.shortOk) {
          const passedFilters = Object.values(ev.filters).filter(Boolean).length;
          console.log(`[DEBUG] ${symbol} no-signal (${passedFilters}/9 filters passed)`);
        }

      }catch(e){
        console.error(`❌ ${symbol}:`, e);
        
        // Log errors to database
        await supabase.from('errors_log').insert({
          where_at: 'live-scanner-production',
          symbol,
          details: { error: e.message, stack: e.stack }
        });
      }

      // modest pacing to avoid rate limits
      await sleep(150);
    }

    console.log(`✅ Production scan completed: ${signalsFound} signals found, 0 processed, 0 cooldown-skipped`);

    const resp = {
      success: true,
      algorithm: 'AItradeX1-Production-RealData',
      exchange, 
      timeframe, 
      relaxed_filters: relaxed,
      symbols_scanned: symbols.length,
      signals_found: signalsFound,
      signals_processed: signalsFound,
      cooldown_skipped: 0,
      results,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(resp), { 
      headers: { ...cors, "Content-Type":"application/json" }
    });
  }catch(e:any){
    console.error("Scanner error:", e);
    return new Response(JSON.stringify({ 
      success:false, 
      error:String(e?.message||e) 
    }), { 
      status:500, 
      headers: { ...cors, "Content-Type":"application/json" }
    });
  }
});