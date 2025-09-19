import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const LIVE = "https://api.bybit.com";
const TEST = "https://api-testnet.bybit.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const base = Deno.env.get("BYBIT_IS_LIVE") === "true" ? LIVE : TEST;
  const url = `${base}/v5/market/time`;
  
  try {
    const r = await fetch(url, { method: "GET" });
    const txt = await r.text();
    
    return new Response(JSON.stringify({ 
      ok: r.ok, 
      status: r.status, 
      body: txt.slice(0, 500),
      endpoint: url,
      mode: Deno.env.get("BYBIT_IS_LIVE") === "true" ? "LIVE" : "TESTNET"
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e),
      endpoint: url,
      mode: Deno.env.get("BYBIT_IS_LIVE") === "true" ? "LIVE" : "TESTNET"
    }), { 
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});