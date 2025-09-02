import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ---- CORS (one place, used everywhere)
const baseCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bapi-api-key, x-bapi-sign, x-bapi-timestamp, x-bapi-recv-window, x-bapi-sign-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const corsHeaders = baseCors; // alias for safety

// Small helpers
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });

const mask = (s?: string, n = 4) => (s ? s.slice(0, n) + "****" : "");

// (Optional) central secrets reader (no crash if env unset)
function readSecrets() {
  try {
    return {
      apiKey: Deno.env.get("BYBIT_API_KEY") ?? "",
      apiSecret: Deno.env.get("BYBIT_API_SECRET") ?? "",
      baseUrl: Deno.env.get("BYBIT_BASE_URL") ?? "https://api.bybit.com",
      recv: Deno.env.get("BYBIT_RECV_WINDOW") ?? "5000",
    };
  } catch {
    return { apiKey: "", apiSecret: "", baseUrl: "https://api.bybit.com", recv: "5000" };
  }
}

// HMAC SHA256 signature for Bybit V5
async function createSignature(params: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(params))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Make authenticated request to Bybit V5 API
async function bybitRequest(endpoint: string, method: string = 'GET', body?: any) {
  const config = readSecrets()
  
  if (!config.apiKey || !config.apiSecret) {
    const error = new Error('Bybit API credentials not configured')
    error.retCode = 'MISSING_CREDENTIALS'
    throw error
  }

  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  const queryStr = method === 'GET' && body ? new URLSearchParams(body).toString() : ''
  
  // Create signature payload according to Bybit V5 specs
  const payload = timestamp + config.apiKey + config.recv + 
    (method === 'GET' ? queryStr : bodyStr)
  
  const signature = await createSignature(payload, config.apiSecret)
  
  const headers = {
    'X-BAPI-API-KEY': config.apiKey,
    'X-BAPI-SIGN': signature,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': config.recv,
    'X-BAPI-SIGN-TYPE': '2',
    'Content-Type': 'application/json'
  }

  const url = method === 'GET' && queryStr 
    ? `${config.baseUrl}${endpoint}?${queryStr}`
    : `${config.baseUrl}${endpoint}`

  console.log(`[Bybit API] ${method} ${endpoint}`, { 
    hasBody: !!bodyStr, 
    queryParams: queryStr || 'none',
    timestamp,
    recvWindow: config.recv
  })

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : bodyStr
  })

  const responseData = await response.json()

  if (!response.ok) {
    const error = new Error(`Bybit API error: ${response.status} ${response.statusText}`)
    error.retCode = responseData.retCode
    error.retMsg = responseData.retMsg
    error.httpStatus = response.status
    throw error
  }

  // Check for Bybit-specific errors in successful HTTP responses
  if (responseData.retCode && responseData.retCode !== 0) {
    const error = new Error(responseData.retMsg || 'Bybit API error')
    error.retCode = responseData.retCode
    error.retMsg = responseData.retMsg
    throw error
  }

  return responseData
}

// ---- serve
serve(async (req) => {
  // Preflight must never fail and must reflect requested headers
  if (req.method === "OPTIONS") {
    const reqHdrs = req.headers.get("access-control-request-headers") ?? "";
    const headers = {
      ...baseCors,
      "Access-Control-Allow-Headers":
        `${baseCors["Access-Control-Allow-Headers"]}${reqHdrs ? `, ${reqHdrs}` : ""}`,
    };
    return new Response("ok", { status: 204, headers });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 0) /ping: fastest health check (no secrets required)
    if (pathname.endsWith("/ping")) {
      return json(200, { 
        ok: true,
        timestamp: new Date().toISOString(),
        service: 'bybit-broker'
      });
    }

    // 1) /env: safe, masked preview (must never throw)
    if (pathname.endsWith("/env")) {
      const { apiKey, apiSecret, baseUrl, recv } = readSecrets();
      return json(200, {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        baseUrl: baseUrl,
        recvWindow: recv,
        apiKeyPreview: mask(apiKey),
        secretPreview: mask(apiSecret)
      });
    }

    // 2) /test-connection: live signed call to prove V5 signer works
    if (pathname.endsWith("/test-connection")) {
      try {
        const { apiKey, apiSecret, baseUrl, recv } = readSecrets();
        if (!apiKey || !apiSecret) {
          return json(200, { ok: false, stage: "credentials", error: "Missing Bybit secrets" });
        }

        const isDebug = searchParams.has('debug');
        
        if (isDebug) {
          const timestamp = Date.now().toString()
          const payload = timestamp + apiKey + recv
          return json(200, {
            debug: true,
            timestamp,
            apiKey: mask(apiKey),
            recvWindow: recv,
            signaturePayload: payload,
            baseUrl: baseUrl,
            message: 'Debug info (no actual API call)'
          });
        }

        const serverTime = await bybitRequest('/v5/market/time')
        const balance = await bybitRequest('/v5/account/wallet-balance', 'GET', {
          accountType: 'UNIFIED'
        })
        
        return json(200, {
          ok: true,
          stage: "credentials",
          serverTime: serverTime.result?.timeSecond,
          hasBalance: !!balance.result,
          message: 'Bybit API connection successful'
        });
      } catch (error) {
        return json(200, {
          ok: false,
          stage: "credentials", 
          error: error.message,
          retCode: error.retCode || null,
          retMsg: error.retMsg || null
        });
      }
    }

    // GET endpoints with query parameters
    if (req.method === 'GET') {
      if (pathname.endsWith('/orders')) {
        const category = searchParams.get('category') || 'linear'
        const symbol = searchParams.get('symbol')
        const openOnly = searchParams.get('openOnly') === '1'
        
        const params: any = { category }
        if (symbol) params.symbol = symbol
        if (openOnly) params.openOnly = 1
        
        const result = await bybitRequest('/v5/order/realtime', 'GET', params)
        
        return json(200, {
          success: true,
          orders: result.result?.list || []
        });
      }

      if (pathname.endsWith('/positions')) {
        const category = searchParams.get('category') || 'linear'
        const symbol = searchParams.get('symbol')
        
        const params: any = { category }
        if (symbol) params.symbol = symbol
        
        const result = await bybitRequest('/v5/position/list', 'GET', params)
        
        return json(200, {
          success: true,
          positions: result.result?.list || []
        });
      }

      if (pathname.endsWith('/tickers')) {
        const category = searchParams.get('category') || 'linear'
        const symbol = searchParams.get('symbol')
        
        const params: any = { category }
        if (symbol) params.symbol = symbol
        
        const result = await bybitRequest('/v5/market/tickers', 'GET', params)
        
        return json(200, {
          success: true,
          tickers: result.result?.list || []
        });
      }
    }

    // 3) POST actions
    if (req.method === "POST") {
      let body: any = {};
      try { 
        if (req.headers.get("content-type")?.includes("application/json")) {
          body = await req.json(); 
        }
      } catch {}

      // Handle action-based routing (legacy support)
      if (body.action) {
        const { action, ...params } = body

        switch (action) {
          case 'status': {
            const balance = await bybitRequest('/v5/account/wallet-balance', 'GET', {
              accountType: 'UNIFIED'
            })
            const positions = await bybitRequest('/v5/position/list', 'GET', {
              category: 'linear'
            })
            
            return json(200, {
              success: true,
              balances: balance.result?.list || [],
              positions: positions.result?.list || []
            });
          }
        }
      }

      // Direct order placement
      if (pathname.endsWith('/order')) {
        const orderData: any = {
          category: body.category || 'linear',
          symbol: body.symbol,
          side: body.side,
          orderType: body.orderType || 'Market',
          qty: body.qty.toString()
        }

        if (body.price) orderData.price = body.price.toString()
        if (body.positionIdx !== undefined) orderData.positionIdx = body.positionIdx
        if (body.timeInForce) orderData.timeInForce = body.timeInForce
        if (body.stopLoss) orderData.stopLoss = body.stopLoss.toString()
        if (body.takeProfit) orderData.takeProfit = body.takeProfit.toString()

        const result = await bybitRequest('/v5/order/create', 'POST', orderData)
        
        return json(200, {
          success: true,
          orderId: result.result?.orderId,
          result: result.result
        });
      }

      // Cancel order
      if (pathname.endsWith('/cancel')) {
        const result = await bybitRequest('/v5/order/cancel', 'POST', {
          category: body.category || 'linear',
          symbol: body.symbol,
          orderId: body.orderId
        })
        
        return json(200, {
          success: true,
          result: result.result
        });
      }

      return json(400, { success: false, error: "Unknown action" });
    }

    return json(404, {
      error: 'Endpoint not found',
      path: pathname,
      method: req.method,
      availableEndpoints: {
        GET: ['/ping', '/env', '/test-connection', '/orders', '/positions', '/tickers'],
        POST: ['/order', '/cancel', '/ (with action: status)']
      }
    });

  } catch (error) {
    console.error('Bybit broker error:', error)
    
    return json(500, {
      error: error.message,
      retCode: error.retCode || null,
      retMsg: error.retMsg || null,
      timestamp: new Date().toISOString()
    });
  }
})