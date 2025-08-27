// AItradeX1 Configuration Endpoint
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Canonical AItradeX1 Configuration
const AITRADEX1_CONFIG = {
  name: "AItradeX1",
  version: "1.0.0",
  inputs: {
    emaLen: 21,
    smaLen: 200,
    adxThreshold: 28,
    stochLength: 14,
    stochSmoothK: 3,
    stochSmoothD: 3,
    volSpikeMult: 1.7,
    obvEmaLen: 21,
    hvpLower: 55,
    hvpUpper: 85,
    breakoutLen: 5,
    spreadMaxPct: 0.10,
    atrLen: 14,
    exitBars: 18,
    useDailyTrendFilter: true
  },
  relaxedMode: {
    adxThreshold: 22,
    volSpikeMult: 1.4,
    hvpLower: 50,
    hvpUpper: 90,
    breakoutLen: 3,
    useDailyTrendFilter: false
  },
  hvpFormula:
    "hvp = 100 * (σ21 / max252(σ21)), where σ21 = stdev(close%change, 21) * sqrt(252)",
  scoreBuckets: ["trend","adx","dmi","stoch","volume","obv","hvp","spread"]
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const relaxed = url.searchParams.get("relaxed_filters") === "true";

    const inputs = relaxed
      ? { ...AITRADEX1_CONFIG.inputs, ...AITRADEX1_CONFIG.relaxedMode }
      : AITRADEX1_CONFIG.inputs;

    console.log(`🔧 AItradeX1 Config requested — Relaxed: ${relaxed}`);

    return new Response(
      JSON.stringify({
        success: true,
        config: { ...AITRADEX1_CONFIG, inputs },
        relaxed_mode: relaxed,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("❌ Config Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});