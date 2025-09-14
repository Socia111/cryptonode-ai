import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { bybitRequest, corsHeaders } from "../_shared/bybit-client.ts";

interface TradeRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  amountUSD: number;
  leverage?: number;
  orderType?: 'Market' | 'Limit';
  price?: number;
  testMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: TradeRequest = await req.json();
    console.log('🚀 Trade execution request:', body);

    // Validate required fields
    if (!body.symbol || !body.side || !body.amountUSD) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: symbol, side, amountUSD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const API_KEY = Deno.env.get("BYBIT_API_KEY");
    const API_SECRET = Deno.env.get("BYBIT_API_SECRET");
    const BASE_URL = Deno.env.get("BYBIT_BASE") || "https://api.bybit.com";
    const PAPER_TRADING = Deno.env.get("PAPER_TRADING") === "true";

    if (!API_KEY || !API_SECRET) {
      throw new Error("Missing BYBIT_API_KEY or BYBIT_API_SECRET");
    }

    // Check if paper trading mode
    if (PAPER_TRADING || body.testMode) {
      console.log("📝 Paper trading mode - simulating order");
      
      const mockResult = {
        success: true,
        mode: "paper_trading",
        orderId: `paper_${Date.now()}`,
        symbol: body.symbol,
        side: body.side,
        quantity: (body.amountUSD / 50000).toFixed(6), // Mock quantity
        executedAt: new Date().toISOString(),
        note: "This was a simulated trade"
      };

      return new Response(
        JSON.stringify(mockResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real trading execution
    console.log("💰 Executing real trade on Bybit...");

    // Get current price for the symbol
    const tickerRes = await fetch(`${BASE_URL}/v5/market/tickers?category=linear&symbol=${body.symbol}`);
    const tickerData = await tickerRes.json();
    const currentPrice = parseFloat(tickerData.result?.list?.[0]?.lastPrice || "0");

    if (!currentPrice) {
      throw new Error(`Could not get current price for ${body.symbol}`);
    }

    // Calculate quantity
    const leverage = body.leverage || parseInt(Deno.env.get("DEFAULT_LEVERAGE") || "5");
    const quantity = (body.amountUSD * leverage / currentPrice).toFixed(6);

    console.log("📊 Trade calculation:", {
      symbol: body.symbol,
      currentPrice,
      amountUSD: body.amountUSD,
      leverage,
      calculatedQty: quantity
    });

    // Step 1: Set position mode to one-way
    try {
      await bybitRequest("/v5/position/switch-mode", {
        category: "linear",
        symbol: body.symbol,
        mode: 0 // One-way mode
      }, API_KEY, API_SECRET, BASE_URL);
    } catch (error) {
      console.log("ℹ️ Position mode already set or not needed:", error.message);
    }

    // Step 2: Set leverage
    try {
      await bybitRequest("/v5/position/set-leverage", {
        category: "linear",
        symbol: body.symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
      }, API_KEY, API_SECRET, BASE_URL);
    } catch (error) {
      console.log("ℹ️ Leverage setting failed (may already be set):", error.message);
    }

    // Step 3: Create the order
    const orderResult = await bybitRequest("/v5/order/create", {
      category: "linear",
      symbol: body.symbol,
      side: body.side,
      orderType: body.orderType || "Market",
      qty: quantity,
      timeInForce: body.orderType === "Limit" ? "GTC" : "IOC"
    }, API_KEY, API_SECRET, BASE_URL);

    const result = {
      success: true,
      mode: "live_trading",
      orderId: orderResult.result?.orderId,
      symbol: body.symbol,
      side: body.side,
      quantity,
      leverage,
      currentPrice,
      executedAt: new Date().toISOString(),
      bybitResponse: orderResult.result
    };

    console.log("✅ Trade executed successfully:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Trade execution error:', error);
    
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
    );
  }
});