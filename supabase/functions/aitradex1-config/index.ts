// AItradeX1 Configuration Endpoint
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Canonical AItradeX1 Configuration
const AITRADEX1_CONFIG = {
  "name": "AItradeX1",
  "version": "1.0.0",
  "inputs": {
    "emaLen": 21,
    "smaLen": 200,
    "adxThreshold": 28,
    "stochLength": 14,
    "stochSmoothK": 3,
    "stochSmoothD": 3,
    "volSpikeMult": 1.7,
    "obvEmaLen": 21,
    "hvpLower": 55,
    "hvpUpper": 85,
    "breakoutLen": 5,
    "spreadMaxPct": 0.10,
    "atrLen": 14,
    "exitBars": 18,
    "useDailyTrendFilter": true
  },
  "long": {
    "trend": "ema21 > sma200 && ema21 > ema21[3]",
    "dmiAdx": "adx >= 28 && diPlus > diMinus && diPlus > diPlus[3]",
    "stoch": "k > d && k < 35 && d < 40",
    "volume": "vol > volSpikeMult * sma(vol,21)",
    "obv": "obv > ema(obv,21) && obv > obv[3]",
    "hvp": "hvp >= hvpLower && hvp <= hvpUpper",
    "spread": "abs(close - open) / open * 100 < spreadMaxPct",
    "breakout": "close > highest(high, breakoutLen)",
    "dailyConfirm": "emaD21 > smaD200 (prev bar) // if useDailyTrendFilter"
  },
  "short": {
    "trend": "ema21 < sma200 && ema21 < ema21[3]",
    "dmiAdx": "adx >= 28 && diMinus > diPlus && diMinus > diMinus[3]",
    "stoch": "k < d && k > 65 && d > 60",
    "volume": "vol > volSpikeMult * sma(vol,21)",
    "obv": "obv < ema(obv,21) && obv < obv[3]",
    "hvp": "hvp >= hvpLower && hvp <= hvpUpper",
    "spread": "abs(close - open) / open * 100 < spreadMaxPct",
    "breakout": "close < lowest(low, breakoutLen)",
    "dailyConfirm": "emaD21 < smaD200 (prev bar) // if useDailyTrendFilter"
  },
  "risk": {
    "atrLen": 14,
    "stopATR": 1.5,
    "tpATR_by_HVP": [
      { "minHVP": 76, "tpATR": 3.5 },
      { "minHVP": 66, "tpATR": 3.0 },
      { "minHVP": 0,  "tpATR": 2.5 }
    ],
    "trailATR_low": 1.3,
    "trailATR_high": 1.8,
    "trailSwitchHVP": 70,
    "exitBars": 18,
    "stochProfitExit": { "longCrossUnder": 85, "shortCrossOver": 15 }
  },
  "scoreBuckets": [
    "trend", "adx", "dmi", "stoch", "volume", "obv", "hvp", "spread"
  ],
  "relaxedMode": {
    "adxThreshold": 22,
    "volSpikeMult": 1.4,
    "hvpLower": 50,
    "hvpUpper": 90,
    "breakoutLen": 3,
    "useDailyTrendFilter": false
  },
  "hvpFormula": "hvp = 100 * (σ₍21₎ / max₍252₎(σ₍21₎)), where σ₍21₎ = stdev(close%change, 21) * √252",
  "confidenceScoring": "Add 12.5 points for each satisfied bucket: trend+slope, ADX, DMI dominance, Stoch alignment, Volume spike, OBV alignment, HVP in band, Spread OK. Clamp to 100.",
  "pseudocode": {
    "long": "ema21 > sma200 && ema21 > ema21_3ago && adx >= 28 && diPlus > diMinus && diPlus > diPlus_3ago && k > d && k < 35 && d < 40 && vol > 1.7 * smaVol21 && obv > emaOBV21 && obv > obv_3ago && hvp >= 55 && hvp <= 85 && spreadPct < 0.10 && close > highestHigh_5 && (!useDailyFilter || emaD21_prev > smaD200_prev)",
    "short": "Mirror of long with inverted conditions"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const relaxed = url.searchParams.get('relaxed_filters') === 'true';
    
    const config = relaxed 
      ? { ...AITRADEX1_CONFIG, inputs: { ...AITRADEX1_CONFIG.inputs, ...AITRADEX1_CONFIG.relaxedMode } }
      : AITRADEX1_CONFIG;

    console.log(`🔧 AItradeX1 Config requested - Relaxed: ${relaxed}`);

    return new Response(
      JSON.stringify({
        success: true,
        config,
        timestamp: new Date().toISOString(),
        relaxed_mode: relaxed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Config Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});