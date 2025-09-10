import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE = Deno.env.get("BYBIT_BASE") ?? "https://api-testnet.bybit.com";
const APIKEY = Deno.env.get("BYBIT_KEY")!;
const SECRET = Deno.env.get("BYBIT_SECRET")!;
const RECV = "5000";

// Rate limiting
const requestQueue: Map<string, number> = new Map();
const RATE_LIMIT = 600; // 600 requests per minute (Bybit limit)
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  
  // Clean old entries
  for (const [timestamp] of requestQueue) {
    if (parseInt(timestamp) < windowStart) {
      requestQueue.delete(timestamp);
    }
  }
  
  // Check if we're within rate limit
  if (requestQueue.size >= RATE_LIMIT) {
    return false;
  }
  
  requestQueue.set(now.toString(), now);
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

async function sign(msg: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", 
    new TextEncoder().encode(secret), 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function withCORS(req: Request, res: Response): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "content-type,authorization");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}

async function bybit(
  path: string, 
  method: "GET" | "POST", 
  body?: Record<string, unknown>, 
  key = APIKEY, 
  secret = SECRET
) {
  const ts = Date.now().toString();
  const url = BASE + path;
  let qs = "";
  let payload = "";

  if (method === "GET" && body) {
    qs = "?" + new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v)])
    ).toString();
  }
  if (method === "POST") {
    payload = JSON.stringify(body ?? {});
  }

  // Fixed Bybit V5 signature format: timestamp + apiKey + recvWindow + queryString + body
  let queryString = "";
  if (method === "GET" && qs) {
    queryString = qs.substring(1); // Remove the leading '?'
  }
  
  const presign = ts + key + RECV + queryString + payload;
  const sig = await sign(presign, secret);

  console.log(`🔗 Bybit API ${method} ${path}`, { 
    timestamp: ts, 
    payload: method === "POST" ? payload.substring(0, 200) : qs 
  });

  const response = await fetch(url + qs, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-BAPI-API-KEY": key,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": RECV,
      "X-BAPI-SIGN": sig,
    },
    body: method === "POST" ? payload : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  console.log(`📊 Bybit API Response:`, {
    status: response.status,
    retCode: data.retCode,
    retMsg: data.retMsg,
    hasResult: !!data.result
  });

  if (!response.ok) {
    throw new Response(
      JSON.stringify({ ok: false, status: response.status, data }), 
      { status: response.status }
    );
  }
  
  if (data.retCode !== 0) {
    throw new Response(
      JSON.stringify({ ok: false, status: 400, data }), 
      { status: 400 }
    );
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return withCORS(req, new Response(null, { status: 204 }));
  }

  try {
    // Check rate limit
    if (!checkRateLimit()) {
      return withCORS(req, new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Rate limit exceeded. Please wait before making more requests." 
        }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { pathname } = new URL(req.url);
    console.log(`🚀 Request: ${req.method} ${pathname}`);

    // 1) Health check + auth verification
    if (pathname.endsWith("/test") && req.method === "GET") {
      console.log("🔍 Testing Bybit API connection...");
      
      // Check server time
      const timeResponse = await fetch(`${BASE}/v5/market/time`);
      const time = await timeResponse.json();
      
      // Check API authentication
      const me = await bybit("/v5/user/query-api", "GET");
      
      console.log("✅ Bybit API test successful");
      return withCORS(req, new Response(
        JSON.stringify({ ok: true, time, me, base: BASE }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2) Place order
    if (pathname.endsWith("/order") && req.method === "POST") {
      const body = await req.json();
      console.log("📝 Placing order:", body);
      
      // Validate required fields
      if (!body.category || !body.symbol || !body.side || !body.orderType || !body.qty) {
        return withCORS(req, new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Missing required fields: category, symbol, side, orderType, qty" 
          }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Place order via Bybit API v5
      const result = await bybit("/v5/order/create", "POST", body);
      
      console.log("✅ Order placed successfully:", result.result?.orderId);
      return withCORS(req, new Response(
        JSON.stringify({ ok: true, result }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3) Cancel order
    if (pathname.endsWith("/cancel") && req.method === "POST") {
      const body = await req.json();
      console.log("❌ Cancelling order:", body);
      
      const result = await bybit("/v5/order/cancel", "POST", body);
      
      console.log("✅ Order cancelled successfully");
      return withCORS(req, new Response(
        JSON.stringify({ ok: true, result }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 4) Get positions
    if (pathname.endsWith("/positions") && req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || "linear";
      const symbol = url.searchParams.get("symbol");
      
      const params: Record<string, unknown> = { category };
      if (symbol) params.symbol = symbol;
      
      console.log("📊 Getting positions:", params);
      const result = await bybit("/v5/position/list", "GET", params);
      
      return withCORS(req, new Response(
        JSON.stringify({ ok: true, result }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5) Get account balance
    if (pathname.endsWith("/balance") && req.method === "GET") {
      const url = new URL(req.url);
      const accountType = url.searchParams.get("accountType") || "UNIFIED";
      const coin = url.searchParams.get("coin");
      
      const params: Record<string, unknown> = { accountType };
      if (coin) params.coin = coin;
      
      console.log("💰 Getting balance:", params);
      const result = await bybit("/v5/account/wallet-balance", "GET", params);
      
      return withCORS(req, new Response(
        JSON.stringify({ ok: true, result }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return withCORS(req, new Response(
      JSON.stringify({ error: "Endpoint not found" }), 
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error("❌ Error in bybit-order-execution:", error);
    
    if (error instanceof Response) {
      return withCORS(req, error);
    }
    
    return withCORS(req, new Response(
      JSON.stringify({ ok: false, error: String(error) }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});