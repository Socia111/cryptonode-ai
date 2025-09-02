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

// Sorted query builder (Bybit expects sorted keys for signing on GET)
function buildQueryString(params: Record<string, unknown>) {
  const usp = new URLSearchParams();
  Object.keys(params)
    .sort()
    .forEach((k) => {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
    });
  return usp.toString();
}

// Secrets reader (no crash if not present)
function readSecrets() {
  try {
    return {
      apiKey: Deno.env.get("BYBIT_API_KEY") ?? "",
      apiSecret: Deno.env.get("BYBIT_API_SECRET") ?? "",
      baseUrl: Deno.env.get("BYBIT_BASE_URL") ?? "https://api.bybit.com",
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

// ---------- V5 request (signed when needed) ----------
async function bybitRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  query: Record<string, unknown> = {},
  body: Record<string, unknown> | null = null,
) {
  const { apiKey, apiSecret, baseUrl, recv } = readSecrets();

  const ts = Date.now().toString();
  const qs = buildQueryString(query);
  const url = `${baseUrl}${endpoint}${qs ? `?${qs}` : ""}`;
  const jsonBody = body ? JSON.stringify(body) : "";

  // detect if endpoint requires auth — we'll sign for all private endpoints
  const needsAuth = endpoint.startsWith("/v5/account") ||
                    endpoint.startsWith("/v5/order") ||
                    endpoint.startsWith("/v5/position");

  let headers: Record<string, string> = { "content-type": "application/json" };

  if (needsAuth) {
    if (!apiKey || !apiSecret) {
      const e = new Error("Bybit API credentials not configured") as AnyError;
      e.retCode = "MISSING_CREDENTIALS";
      throw e;
    }
    // V5 sign string:
    // GET:    ts + api_key + recv_window + queryString
    // POST:   ts + api_key + recv_window + jsonBody
    const signBase = method === "GET" ? qs : jsonBody;
    const payload = ts + apiKey + recv + signBase;
    const sign = await hmacSha256Hex(payload, apiSecret);
    headers = {
      ...headers,
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-SIGN": sign,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": recv,
      "X-BAPI-SIGN-TYPE": "2",
    };
  }

  console.log(`[Bybit API] ${method} ${endpoint}`, {
    query: qs || "(none)",
    hasBody: !!jsonBody,
    needsAuth,
  });

  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : jsonBody,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // keep raw
  }

  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}`) as AnyError;
    e.httpStatus = res.status;
    e.response = data;
    throw e;
  }
  if (data?.retCode !== undefined && data.retCode !== 0) {
    const e = new Error(data?.retMsg || "Bybit error") as AnyError;
    e.retCode = data.retCode;
    e.retMsg = data.retMsg;
    e.response = data;
    throw e;
  }

  return data;
}

// ---------- HTTP entry ----------
serve(async (req) => {
  // Preflight: never fail, reflect additional requested headers
  if (req.method === "OPTIONS") {
    const reqHdrs = req.headers.get("access-control-request-headers") ?? "";
    const headers = {
      ...baseCors,
      "Access-Control-Allow-Headers": `${baseCors["Access-Control-Allow-Headers"]}${reqHdrs ? `, ${reqHdrs}` : ""}`,
    };
    return new Response("ok", { status: 204, headers });
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
    }

    // ------- POST actions -------
    if (req.method === "POST") {
      let body: any = {};
      if (req.headers.get("content-type")?.includes("application/json")) {
        try { body = await req.json(); } catch { body = {}; }
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
        if (!body?.spotMarginMode) return json(400, { success:false, error:"spotMarginMode required (\"1\" or \"0\")" });
        const r = await bybitRequest("/v5/spot-margin-trade/switch-mode", "POST", {}, { spotMarginMode: String(body.spotMarginMode) });
        return json(200, { success: true, ...r });
      }

      return json(400, { success: false, error: "Unknown action or path" });
    }

    // Fallback 404
    return json(404, {
      error: "Endpoint not found",
      path: pathname,
      method: req.method,
      availableEndpoints: {
        GET: ["/ping", "/env", "/test-connection", "/orders", "/positions", "/tickers", "/affiliate/users", "/affiliate/user-info", "/spot-margin/data", "/spot-margin/collateral", "/spot-margin/interest-rate-history"],
        POST: ["/order", "/cancel", "/spot-margin/switch-mode", "/ (with action: status)"],
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
