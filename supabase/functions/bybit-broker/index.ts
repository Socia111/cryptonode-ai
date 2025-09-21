// supabase/functions/bybit-broker/index.ts
// Deno edge function: Bybit broker (V5)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ---------- CORS (always on) ----------
const baseCors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",                  // or reflect Origin if you prefer
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bapi-api-key, x-bapi-sign, x-bapi-timestamp, x-bapi-recv-window, x-bapi-sign-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};
const corsHeaders = baseCors;

// ---------- tiny utils ----------
type JsonLike = Record<string, unknown> | unknown[];
type AnyError = Error & Record<string, unknown>;

function json(status: number, body: JsonLike) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}
const mask = (s?: string, n = 4) => (s ? s.slice(0, n) + "****" : "");

// Build qs from a plain object (sorted & no empty values)
function buildQS(query: Record<string, unknown> = {}) {
  return Object.entries(query)
    .filter(([,v]) => v !== undefined && v !== null && v !== "")
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

// Secrets reader (no crash if not present)
function readSecrets() {
  try {
    return {
      apiKey: Deno.env.get("BYBIT_KEY") ?? "",
      apiSecret: Deno.env.get("BYBIT_SECRET") ?? "",
      baseUrl: Deno.env.get("BYBIT_BASE") ?? "https://api.bybit.com",
      recv: Deno.env.get("BYBIT_RECV_WINDOW") ?? "5000",
    };
  } catch {
    return {
      apiKey: "",
      apiSecret: "",
      baseUrl: "https://api.bybit.com",
      recv: "5000",
    };
  }
}

// ---------- V5 HMAC ----------
async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Core V5 request (supports GET query + POST body). Signs per spec:
// toSign = ts + apiKey + recv + (GET ? qs : jsonBody)
async function bybitRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  query: Record<string, unknown> = {},
  body?: Record<string, unknown>,
) {
  const { apiKey, apiSecret, baseUrl, recv } = readSecrets();

  // Public endpoints work unsigned, but if creds exist we still sign.
  const isAuth = !!apiKey && !!apiSecret;

  const ts = Date.now().toString();
  const qs = buildQS(query);
  const url = `${baseUrl}${endpoint}${qs ? `?${qs}` : ""}`;
  const jsonBody = body ? JSON.stringify(body) : "";

  let headers: Record<string,string> = { "Content-Type": "application/json" };

  if (isAuth) {
    const toSign = method === "GET" ? `${ts}${apiKey}${recv}${qs}` : `${ts}${apiKey}${recv}${jsonBody}`;
    const sign = await hmacSha256Hex(toSign, apiSecret);
    headers = {
      ...headers,
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": recv,
      "X-BAPI-SIGN": sign,
      "X-BAPI-SIGN-TYPE": "2",
    };
  }

  console.log(`[Bybit API] ${method} ${endpoint}`, {
    query: qs || "(none)",
    hasBody: !!jsonBody,
    isAuth,
  });

  const res = await fetch(url, { method, headers, body: method === "GET" ? undefined : jsonBody });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error(`Bybit HTTP ${res.status}`);
    err.retCode = data?.retCode; err.retMsg = data?.retMsg; err.httpStatus = res.status;
    throw err;
  }
  if (data?.retCode !== 0) {
    const errorMsg = data?.retMsg || "Bybit API error";
    console.error('❌ Bybit API error:', { retCode: data?.retCode, retMsg: data?.retMsg, data });
    const err: any = new Error(errorMsg);
    err.retCode = data?.retCode; 
    err.retMsg = data?.retMsg;
    throw err;
  }
  return data;
}

// ---------- HTTP entry ----------
serve(async (req) => {
  // Preflight: never fail, reflect additional requested headers
  if (req.method === "OPTIONS") {
    try {
      const reqHdrs = req.headers.get("access-control-request-headers") ?? "";
      const headers = {
        ...baseCors,
        "Access-Control-Allow-Headers": `${baseCors["Access-Control-Allow-Headers"]}${reqHdrs ? `, ${reqHdrs}` : ""}`,
      };
      return new Response("ok", { status: 204, headers });
    } catch (error) {
      console.error('OPTIONS request error:', error);
      return new Response("ok", { status: 204, headers: baseCors });
    }
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const sp = url.searchParams;

    // 0) ping
    if (pathname.endsWith("/ping")) {
      return json(200, { ok: true, service: "bybit-broker", ts: Date.now() });
    }

    // 1) env (masked)
    if (pathname.endsWith("/env")) {
      const { apiKey, apiSecret, baseUrl, recv } = readSecrets();
      return json(200, {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        apiKeyPreview: mask(apiKey),
        secretPreview: mask(apiSecret),
        baseUrl,
        recvWindow: recv,
      });
    }

    // 2) test-connection (supports ?debug=1)
    if (pathname.endsWith("/test-connection")) {
      try {
        const { apiKey, apiSecret, recv } = readSecrets();
        if (!apiKey || !apiSecret) {
          return json(200, { ok: false, stage: "credentials", error: "Missing Bybit secrets" });
        }
        if (sp.has("debug")) {
          const ts = Date.now().toString();
          return json(200, {
            debug: true,
            timestamp: ts,
            recvWindow: recv,
            signaturePayloadGET: `${ts}${apiKey}${recv}`, // + <sortedQuery>
            signaturePayloadPOST: `${ts}${apiKey}${recv}`, // + <jsonBody>
            tips: [
              "For GET: append sorted query string (e.g., accountType=UNIFIED).",
              "For POST: append exact JSON body string.",
            ],
          });
        }

        // public time (no auth)
        const time = await bybitRequest("/v5/market/time", "GET");
        // private balance (auth)
        const bal = await bybitRequest("/v5/account/wallet-balance", "GET", { accountType: "UNIFIED" });

        return json(200, {
          ok: true,
          stage: "credentials",
          serverTime: time?.result?.timeSecond ?? null,
          hasBalance: !!bal?.result,
          message: "Bybit API connection successful",
        });
      } catch (e) {
        const err = e as AnyError;
        return json(200, {
          ok: false,
          stage: "credentials",
          error: err.message,
          retCode: err.retCode ?? null,
          retMsg: err.retMsg ?? null,
          httpStatus: err.httpStatus ?? null,
          response: err.response ?? null,
        });
      }
    }

    // ------- GET helpers -------
    if (req.method === "GET") {
      if (pathname.endsWith("/orders")) {
        const query: Record<string, unknown> = {
          category: sp.get("category") ?? "linear",
        };
        if (sp.get("symbol")) query.symbol = sp.get("symbol")!;
        if (sp.get("openOnly") === "1") query.openOnly = 1;

        const r = await bybitRequest("/v5/order/realtime", "GET", query);
        return json(200, { success: true, orders: r?.result?.list ?? [] });
      }

      if (pathname.endsWith("/positions")) {
        const query: Record<string, unknown> = {
          category: sp.get("category") ?? "linear",
        };
        if (sp.get("symbol")) query.symbol = sp.get("symbol")!;
        const r = await bybitRequest("/v5/position/list", "GET", query);
        return json(200, { success: true, positions: r?.result?.list ?? [] });
      }

      if (pathname.endsWith("/tickers")) {
        const query: Record<string, unknown> = {
          category: sp.get("category") ?? "linear",
        };
        if (sp.get("symbol")) query.symbol = sp.get("symbol")!;
        const r = await bybitRequest("/v5/market/tickers", "GET", query);
        return json(200, { success: true, tickers: r?.result?.list ?? [] });
      }

      // Affiliate endpoints
      if (pathname.endsWith("/affiliate/users")) {
        const query: Record<string, unknown> = {};
        ["cursor","size","needDeposit","need30","need365"].forEach(k => {
          const v = sp.get(k); if (v !== null) query[k] = v;
        });
        const r = await bybitRequest("/v5/affiliate/aff-user-list", "GET", query);
        return json(200, { success: true, ...r });
      }

      if (pathname.endsWith("/affiliate/user-info")) {
        const uid = sp.get("uid");
        if (!uid) return json(400, { success: false, error: "uid required" });
        const r = await bybitRequest("/v5/user/aff-customer-info", "GET", { uid });
        return json(200, { success: true, ...r });
      }

      // Spot Margin endpoints
      if (pathname.endsWith("/spot-margin/data")) {
        const query: Record<string, unknown> = {};
        ["vipLevel","currency"].forEach(k => { const v = sp.get(k); if (v) query[k] = v; });
        const r = await bybitRequest("/v5/spot-margin-trade/data", "GET", query);
        return json(200, { success: true, ...r });
      }

      if (pathname.endsWith("/spot-margin/collateral")) {
        const query: Record<string, unknown> = {};
        const c = sp.get("currency"); if (c) query.currency = c;
        const r = await bybitRequest("/v5/spot-margin-trade/collateral", "GET", query);
        return json(200, { success: true, ...r });
      }

      if (pathname.endsWith("/spot-margin/interest-rate-history")) {
        const query: Record<string, unknown> = {};
        ["currency","vipLevel","startTime","endTime"].forEach(k => { const v = sp.get(k); if (v) query[k] = v; });
        const r = await bybitRequest("/v5/spot-margin-trade/interest-rate-history", "GET", query);
        return json(200, { success: true, ...r });
      }

      if (pathname.endsWith("/spot-margin/state")) {
        const r = await bybitRequest("/v5/spot-margin-trade/state", "GET");
        return json(200, { success: true, state: r.result });
      }

      // Crypto Loan - Common endpoints
      if (pathname.endsWith("/crypto-loan/common/loanable-data")) {
        const r = await bybitRequest("/v5/crypto-loan-common/loanable-data", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/common/collateral-data")) {
        const r = await bybitRequest("/v5/crypto-loan-common/collateral-data", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/common/max-collateral-amount")) {
        const currency = sp.get("currency");
        if (!currency) return json(400, { success:false, error:"currency required" });
        const r = await bybitRequest("/v5/crypto-loan-common/max-collateral-amount", "GET", { currency });
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/common/adjustment-history")) {
        const r = await bybitRequest("/v5/crypto-loan-common/adjustment-history", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/common/position")) {
        const r = await bybitRequest("/v5/crypto-loan-common/position", "GET");
        return json(200, { success: true, ...r.result });
      }

      // Crypto Loan - Flexible endpoints
      if (pathname.endsWith("/crypto-loan/flexible/ongoing-coin")) {
        const r = await bybitRequest("/v5/crypto-loan-flexible/ongoing-coin", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/flexible/borrow-history")) {
        const r = await bybitRequest("/v5/crypto-loan-flexible/borrow-history", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/flexible/repayment-history")) {
        const r = await bybitRequest("/v5/crypto-loan-flexible/repayment-history", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      // Crypto Loan - Fixed endpoints
      if (pathname.endsWith("/crypto-loan/fixed/supply-order-quote")) {
        const r = await bybitRequest("/v5/crypto-loan-fixed/supply-order-quote", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/fixed/borrow-order-quote")) {
        const r = await bybitRequest("/v5/crypto-loan-fixed/borrow-order-quote", "GET", Object.fromEntries(sp.entries()));
        return json(200, { success: true, ...r.result });
      }
    }

    // ------- POST actions -------
    if (req.method === "POST") {
      let body: any = {};
      if (req.headers.get("content-type")?.includes("application/json")) {
        try { body = await req.json(); } catch { body = {}; }
      }

      // Handle order placement - check if this is an order request (has symbol, side, etc.)
      if (body.symbol && body.side) {
        console.log('📦 Processing order request:', JSON.stringify(body, null, 2));
        
        // Validate required fields
        if (!body.qty) {
          return json(400, { success: false, error: 'qty is required for order placement' });
        }
        
        const payload: Record<string, unknown> = {
          category: body.category ?? "linear",
          symbol: body.symbol,
          side: body.side,
          orderType: body.orderType ?? "Market",
          qty: String(body.qty),
        };
        if (body.price) payload.price = String(body.price);
        if (body.positionIdx !== undefined) payload.positionIdx = body.positionIdx;
        if (body.timeInForce) payload.timeInForce = body.timeInForce;
        if (body.stopLoss) payload.stopLoss = String(body.stopLoss);
        if (body.takeProfit) payload.takeProfit = String(body.takeProfit);

        console.log('🔄 Sending to Bybit API:', JSON.stringify(payload, null, 2));
        const r = await bybitRequest("/v5/order/create", "POST", {}, payload);
        console.log('✅ Bybit API response:', JSON.stringify(r, null, 2));
        return json(200, { success: true, orderId: r?.result?.orderId ?? null, result: r?.result ?? null });
      }

      // legacy: action=status
      if (body?.action === "status") {
        const bal = await bybitRequest("/v5/account/wallet-balance", "GET", { accountType: "UNIFIED" });
        const pos = await bybitRequest("/v5/position/list", "GET", { category: "linear" });
        return json(200, {
          success: true,
          balances: bal?.result ?? null,
          positions: pos?.result?.list ?? [],
        });
      }

      // place order
      if (pathname.endsWith("/order")) {
        const payload: Record<string, unknown> = {
          category: body.category ?? "linear",
          symbol: body.symbol,
          side: body.side,
          orderType: body.orderType ?? "Market",
          qty: String(body.qty),
        };
        if (body.price) payload.price = String(body.price);
        if (body.positionIdx !== undefined) payload.positionIdx = body.positionIdx;
        if (body.timeInForce) payload.timeInForce = body.timeInForce;
        if (body.stopLoss) payload.stopLoss = String(body.stopLoss);
        if (body.takeProfit) payload.takeProfit = String(body.takeProfit);

        const r = await bybitRequest("/v5/order/create", "POST", {}, payload);
        return json(200, { success: true, orderId: r?.result?.orderId ?? null, result: r?.result ?? null });
      }

      // cancel order
      if (pathname.endsWith("/cancel")) {
        const payload: Record<string, unknown> = {
          category: body.category ?? "linear",
          symbol: body.symbol,
          orderId: body.orderId,
        };
        const r = await bybitRequest("/v5/order/cancel", "POST", {}, payload);
        return json(200, { success: true, result: r?.result ?? null });
      }

      // Spot margin mode switch
      if (pathname.endsWith("/spot-margin/switch-mode")) {
        if (!body?.spotMarginMode) return json(400, { success:false, error:"spotMarginMode required ('1' or '0')" });
        const r = await bybitRequest("/v5/spot-margin-trade/switch-mode", "POST", {}, { spotMarginMode: String(body.spotMarginMode) });
        return json(200, { success: true, ...r.result });
      }

      // Spot margin set leverage
      if (pathname.endsWith("/spot-margin/set-leverage")) {
        if (!body?.leverage) return json(400, { success:false, error:"leverage required (2..10)" });
        const r = await bybitRequest("/v5/spot-margin-trade/set-leverage", "POST", {}, { leverage: String(body.leverage) });
        return json(200, { success: true });
      }

      // Crypto Loan - Common endpoints
      if (pathname.endsWith("/crypto-loan/common/adjust-ltv")) {
        for (const k of ["currency","amount","direction"]) if (!body?.[k]) return json(400, { success:false, error:`${k} required` });
        const r = await bybitRequest("/v5/crypto-loan-common/adjust-ltv", "POST", {}, {
          currency: String(body.currency), amount: String(body.amount), direction: String(body.direction)
        });
        return json(200, { success: true, ...r.result });
      }

      // Crypto Loan - Flexible endpoints
      if (pathname.endsWith("/crypto-loan/flexible/borrow")) {
        for (const k of ["loanCurrency","loanAmount"]) if (!body?.[k]) return json(400, { success:false, error:`${k} required` });
        const r = await bybitRequest("/v5/crypto-loan-flexible/borrow", "POST", {}, {
          loanCurrency: String(body.loanCurrency),
          loanAmount: String(body.loanAmount),
          ...(body.collateralList ? { collateralList: body.collateralList } : {})
        });
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/flexible/repay")) {
        for (const k of ["loanCurrency","amount"]) if (!body?.[k]) return json(400, { success:false, error:`${k} required` });
        const r = await bybitRequest("/v5/crypto-loan-flexible/repay", "POST", {}, {
          loanCurrency: String(body.loanCurrency), amount: String(body.amount)
        });
        return json(200, { success: true, ...r.result });
      }

      // Crypto Loan - Fixed endpoints
      if (pathname.endsWith("/crypto-loan/fixed/borrow")) {
        for (const k of ["orderCurrency","orderAmount","annualRate","term"]) if (!body?.[k]) return json(400, { success:false, error:`${k} required` });
        const r = await bybitRequest("/v5/crypto-loan-fixed/borrow", "POST", {}, {
          orderCurrency: String(body.orderCurrency),
          orderAmount: String(body.orderAmount),
          annualRate: String(body.annualRate),
          term: String(body.term),
          ...(body.autoRepay ? { autoRepay: String(body.autoRepay) } : {}),
          ...(body.collateralList ? { collateralList: body.collateralList } : {})
        });
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/fixed/supply")) {
        for (const k of ["orderCurrency","orderAmount","annualRate","term"]) if (!body?.[k]) return json(400, { success:false, error:`${k} required` });
        const r = await bybitRequest("/v5/crypto-loan-fixed/supply", "POST", {}, {
          orderCurrency: String(body.orderCurrency),
          orderAmount: String(body.orderAmount),
          annualRate: String(body.annualRate),
          term: String(body.term)
        });
        return json(200, { success: true, ...r.result });
      }

      if (pathname.endsWith("/crypto-loan/fixed/borrow-order-cancel")) {
        if (!body?.orderId) return json(400, { success:false, error:"orderId required" });
        const r = await bybitRequest("/v5/crypto-loan-fixed/borrow-order-cancel", "POST", {}, { orderId: String(body.orderId) });
        return json(200, { success: true });
      }

      if (pathname.endsWith("/crypto-loan/fixed/supply-order-cancel")) {
        if (!body?.orderId) return json(400, { success:false, error:"orderId required" });
        const r = await bybitRequest("/v5/crypto-loan-fixed/supply-order-cancel", "POST", {}, { orderId: String(body.orderId) });
        return json(200, { success: true });
      }

      return json(400, { success: false, error: "Unknown action or path" });
    }

    // Fallback 404
    return json(404, {
      error: "Endpoint not found",
      path: pathname,
      method: req.method,
      availableEndpoints: {
        GET: ["/ping", "/env", "/test-connection", "/orders", "/positions", "/tickers", "/affiliate/users", "/affiliate/user-info", "/spot-margin/data", "/spot-margin/collateral", "/spot-margin/interest-rate-history", "/spot-margin/state", "/crypto-loan/common/loanable-data", "/crypto-loan/common/collateral-data", "/crypto-loan/common/max-collateral-amount", "/crypto-loan/common/adjustment-history", "/crypto-loan/common/position", "/crypto-loan/flexible/ongoing-coin", "/crypto-loan/flexible/borrow-history", "/crypto-loan/flexible/repayment-history", "/crypto-loan/fixed/supply-order-quote", "/crypto-loan/fixed/borrow-order-quote"],
        POST: ["/order", "/cancel", "/spot-margin/switch-mode", "/spot-margin/set-leverage", "/crypto-loan/common/adjust-ltv", "/crypto-loan/flexible/borrow", "/crypto-loan/flexible/repay", "/crypto-loan/fixed/borrow", "/crypto-loan/fixed/supply", "/crypto-loan/fixed/borrow-order-cancel", "/crypto-loan/fixed/supply-order-cancel", "/ (with action: status)"],
      },
    });
  } catch (e) {
    const err = e as AnyError;
    console.error("Bybit broker error:", err);
    return json(500, {
      error: err.message,
      retCode: err.retCode ?? null,
      retMsg: err.retMsg ?? null,
      httpStatus: err.httpStatus ?? null,
      timestamp: new Date().toISOString(),
    });
  }
});
