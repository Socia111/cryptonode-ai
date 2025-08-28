// AItradeX1 Configuration Endpoint
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    adxThreshold: 20,
    stochLength: 14,
    stochSmoothK: 3,
    stochSmoothD: 3,
    volSpikeMult: 1.3,
    obvEmaLen: 21,
    hvpLower: 40,
    hvpUpper: 95,
    breakoutLen: 3,
    spreadMaxPct: 0.15,
    atrLen: 14,
    exitBars: 18,
    useDailyTrendFilter: false
  },
  relaxedMode: {
    adxThreshold: 15,
    volSpikeMult: 1.1,
    hvpLower: 30,
    hvpUpper: 98,
    breakoutLen: 2,
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get config from database first
    const { data: dbConfig } = await supabase
      .from('configs')
      .select('payload')
      .eq('name', 'AItradeX1')
      .eq('is_active', true)
      .single();

    const baseConfig = dbConfig?.payload || AITRADEX1_CONFIG;
    
    const inputs = relaxed
      ? { ...baseConfig.inputs, ...baseConfig.relaxedMode }
      : baseConfig.inputs;

    console.log(`🔧 AItradeX1 Config requested — Relaxed: ${relaxed}`);

    return new Response(
      JSON.stringify({
        success: true,
        config: { ...baseConfig, inputs },
        relaxed_mode: relaxed,
        source: dbConfig ? 'database' : 'default',
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