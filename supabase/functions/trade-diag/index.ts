import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/bybit-client.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        paper_trading: Deno.env.get("PAPER_TRADING"),
        live_trading_enabled: Deno.env.get("LIVE_TRADING_ENABLED"), 
        bybit_testnet: Deno.env.get("BYBIT_TESTNET"),
        bybit_base: Deno.env.get("BYBIT_BASE"),
        has_api_key: !!Deno.env.get("BYBIT_API_KEY"),
        has_api_secret: !!Deno.env.get("BYBIT_API_SECRET"),
        api_key_length: Deno.env.get("BYBIT_API_KEY")?.length || 0,
        supabase_url: Deno.env.get("SUPABASE_URL"),
        allowed_symbols: Deno.env.get("ALLOWED_SYMBOLS"),
        default_leverage: Deno.env.get("DEFAULT_LEVERAGE"),
        default_trade_amount: Deno.env.get("DEFAULT_TRADE_AMOUNT")
      },
      status: "healthy"
    };

    console.log("🔍 Trade diagnostics:", diagnostics);

    return new Response(
      JSON.stringify(diagnostics, null, 2), 
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("❌ Diagnostics error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        status: "error"
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});