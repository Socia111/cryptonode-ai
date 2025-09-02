import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bapi-api-key, x-bapi-sign, x-bapi-timestamp, x-bapi-recv-window, x-bapi-sign-type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
}

// Bybit V5 API Configuration
const getBybitConfig = () => ({
  apiKey: Deno.env.get("BYBIT_API_KEY"),
  apiSecret: Deno.env.get("BYBIT_API_SECRET"),
  baseUrl: Deno.env.get("BYBIT_BASE_URL") || "https://api.bybit.com",
  recvWindow: Deno.env.get("BYBIT_RECV_WINDOW") || "5000"
})

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
  const config = getBybitConfig()
  
  if (!config.apiKey || !config.apiSecret) {
    const error = new Error('Bybit API credentials not configured')
    error.retCode = 'MISSING_CREDENTIALS'
    throw error
  }

  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  const queryStr = method === 'GET' && body ? new URLSearchParams(body).toString() : ''
  
  // Create signature payload according to Bybit V5 specs
  const payload = timestamp + config.apiKey + config.recvWindow + 
    (method === 'GET' ? queryStr : bodyStr)
  
  const signature = await createSignature(payload, config.apiSecret)
  
  const headers = {
    'X-BAPI-API-KEY': config.apiKey,
    'X-BAPI-SIGN': signature,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': config.recvWindow,
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
    recvWindow: config.recvWindow
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('access-control-request-headers') ?? '';
    const headers = {
      ...corsHeaders,
      'Access-Control-Allow-Headers': `${corsHeaders['Access-Control-Allow-Headers']}${reqHeaders ? `, ${reqHeaders}` : ''}`,
    };
    return new Response('ok', { 
      status: 204,
      headers 
    })
  }

  try {
    const url = new URL(req.url)
    const pathname = url.pathname
    const searchParams = url.searchParams
    const isDebug = searchParams.has('debug')

    // Route handling - match specific paths
    if (pathname.endsWith('/ping')) {
      return new Response(JSON.stringify({ 
        ok: true,
        timestamp: new Date().toISOString(),
        service: 'bybit-broker'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/env')) {
      const config = getBybitConfig()
      return new Response(JSON.stringify({
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret,
        baseUrl: config.baseUrl,
        recvWindow: config.recvWindow,
        apiKeyPreview: config.apiKey ? config.apiKey.slice(0, 8) + '...' : null,
        secretPreview: config.apiSecret ? config.apiSecret.slice(0, 8) + '...' : null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/test-connection')) {
      try {
        const config = getBybitConfig()
        
        if (isDebug) {
          const timestamp = Date.now().toString()
          const payload = timestamp + config.apiKey + config.recvWindow
          return new Response(JSON.stringify({
            debug: true,
            timestamp,
            apiKey: config.apiKey?.slice(0, 8) + '...',
            recvWindow: config.recvWindow,
            signaturePayload: payload,
            baseUrl: config.baseUrl,
            message: 'Debug info (no actual API call)'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const serverTime = await bybitRequest('/v5/market/time')
        const balance = await bybitRequest('/v5/account/wallet-balance', 'GET', {
          accountType: 'UNIFIED'
        })
        
        return new Response(JSON.stringify({
          success: true,
          serverTime: serverTime.result?.timeSecond,
          hasBalance: !!balance.result,
          message: 'Bybit API connection successful'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        return new Response(JSON.stringify({
          error: error.message,
          retCode: error.retCode || null,
          retMsg: error.retMsg || null
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
        
        return new Response(JSON.stringify({
          success: true,
          orders: result.result?.list || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (pathname.endsWith('/positions')) {
        const category = searchParams.get('category') || 'linear'
        const symbol = searchParams.get('symbol')
        
        const params: any = { category }
        if (symbol) params.symbol = symbol
        
        const result = await bybitRequest('/v5/position/list', 'GET', params)
        
        return new Response(JSON.stringify({
          success: true,
          positions: result.result?.list || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (pathname.endsWith('/tickers')) {
        const category = searchParams.get('category') || 'linear'
        const symbol = searchParams.get('symbol')
        
        const params: any = { category }
        if (symbol) params.symbol = symbol
        
        const result = await bybitRequest('/v5/market/tickers', 'GET', params)
        
        return new Response(JSON.stringify({
          success: true,
          tickers: result.result?.list || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // POST endpoints
    if (req.method === 'POST') {
      const body = await req.json()

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
            
            return new Response(JSON.stringify({
              success: true,
              balances: balance.result?.list || [],
              positions: positions.result?.list || []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
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
        
        return new Response(JSON.stringify({
          success: true,
          orderId: result.result?.orderId,
          result: result.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Cancel order
      if (pathname.endsWith('/cancel')) {
        const result = await bybitRequest('/v5/order/cancel', 'POST', {
          category: body.category || 'linear',
          symbol: body.symbol,
          orderId: body.orderId
        })
        
        return new Response(JSON.stringify({
          success: true,
          result: result.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Root POST with action (fallback)
      if (pathname.endsWith('/bybit-broker') && body.action === 'status') {
        const balance = await bybitRequest('/v5/account/wallet-balance', 'GET', {
          accountType: 'UNIFIED'
        })
        
        return new Response(JSON.stringify({
          success: true,
          balance: balance.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      path: pathname,
      method: req.method,
      availableEndpoints: {
        GET: ['/ping', '/env', '/test-connection', '/orders', '/positions', '/tickers'],
        POST: ['/order', '/cancel', '/ (with action: status)']
      }
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Bybit broker error:', error)
    
    return new Response(JSON.stringify({
      error: error.message,
      retCode: error.retCode || null,
      retMsg: error.retMsg || null,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})