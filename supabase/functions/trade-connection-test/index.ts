import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { bybitRequest, corsHeaders } from "../_shared/bybit-client.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧪 Starting Bybit connection test...");

    // Get environment variables
    const API_KEY = Deno.env.get("BYBIT_API_KEY");
    const API_SECRET = Deno.env.get("BYBIT_API_SECRET");
    const BASE_URL = Deno.env.get("BYBIT_BASE") || "https://api.bybit.com";

    if (!API_KEY || !API_SECRET) {
      throw new Error("Missing BYBIT_API_KEY or BYBIT_API_SECRET in environment");
    }

    // Test 1: Get server time (no auth needed)
    console.log("📡 Testing server time...");
    const timeRes = await fetch(`${BASE_URL}/v5/market/time`);
    const timeData = await timeRes.json();
    
    if (!timeRes.ok || timeData.retCode !== 0) {
      throw new Error(`Server time test failed: ${timeData.retMsg}`);
    }

    // Test 2: Get account info (requires auth)
    console.log("🔐 Testing authenticated API call...");
    const accountInfo = await bybitRequest(
      "/v5/account/wallet-balance",
      { accountType: "UNIFIED" },
      API_KEY,
      API_SECRET,
      BASE_URL
    );

    // Test 3: Get instrument info for BTCUSDT
    console.log("📊 Testing instrument info...");
    const instrumentRes = await fetch(`${BASE_URL}/v5/market/instruments-info?category=linear&symbol=BTCUSDT`);
    const instrumentData = await instrumentRes.json();

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        server_time: {
          status: "✅ PASS",
          server_time: timeData.result?.timeSecond,
          response_time: timeData.time
        },
        authentication: {
          status: "✅ PASS", 
          account_type: accountInfo.result?.list?.[0]?.accountType,
          total_wallet_balance: accountInfo.result?.list?.[0]?.totalWalletBalance
        },
        instrument_info: {
          status: instrumentRes.ok ? "✅ PASS" : "❌ FAIL",
          symbol: instrumentData.result?.list?.[0]?.symbol,
          status: instrumentData.result?.list?.[0]?.status
        }
      },
      environment: {
        base_url: BASE_URL,
        api_key_prefix: API_KEY.substring(0, 8) + "...",
        paper_trading: Deno.env.get("PAPER_TRADING"),
        live_trading: Deno.env.get("LIVE_TRADING_ENABLED")
      }
    };

    console.log("✅ Connection test completed successfully:", result);

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Connection test failed:", error);

    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: {
        has_api_key: !!Deno.env.get("BYBIT_API_KEY"),
        has_api_secret: !!Deno.env.get("BYBIT_API_SECRET"),
        base_url: Deno.env.get("BYBIT_BASE"),
        paper_trading: Deno.env.get("PAPER_TRADING")
      }
    };

    return new Response(
      JSON.stringify(errorResult, null, 2),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});