import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    throw new Error('Bybit API credentials not configured')
  }

  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  const queryStr = method === 'GET' && body ? new URLSearchParams(body).toString() : ''
  
  // Create signature payload
  const payload = timestamp + config.apiKey + config.recvWindow + 
    (method === 'GET' ? queryStr : bodyStr)
  
  const signature = await createSignature(payload, config.apiSecret)
  
  const headers = {
    'X-BAPI-API-KEY': config.apiKey,
    'X-BAPI-SIGN': signature,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': config.recvWindow,
    'Content-Type': 'application/json'
  }

  const url = method === 'GET' && queryStr 
    ? `${config.baseUrl}${endpoint}?${queryStr}`
    : `${config.baseUrl}${endpoint}`

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : bodyStr
  })

  if (!response.ok) {
    throw new Error(`Bybit API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Health check
    if (path === 'ping') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'bybit-broker'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Environment check (masked for security)
    if (path === 'env') {
      const config = getBybitConfig()
      return new Response(JSON.stringify({
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret,
        baseUrl: config.baseUrl,
        recvWindow: config.recvWindow,
        apiKeyPreview: config.apiKey ? config.apiKey.slice(0, 8) + '...' : null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test connection
    if (path === 'test-connection') {
      const serverTime = await bybitRequest('/v5/market/time')
      return new Response(JSON.stringify({
        success: true,
        serverTime: serverTime.result?.timeSecond,
        message: 'Bybit API connection successful'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Main trading operations
    if (req.method === 'POST') {
      const body = await req.json()
      const { action, ...params } = body

      switch (action) {
        case 'status': {
          // Get account balance and wallet info
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

        case 'place-order': {
          const { symbol, side, orderType, qty, price, category = 'spot' } = params
          
          const orderData: any = {
            category,
            symbol,
            side,
            orderType,
            qty: qty.toString()
          }

          if (price) {
            orderData.price = price.toString()
          }

          const result = await bybitRequest('/v5/order/create', 'POST', orderData)
          
          return new Response(JSON.stringify({
            success: true,
            orderId: result.result?.orderId,
            result: result.result
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'get-orders': {
          const { symbol, category = 'spot' } = params
          const result = await bybitRequest('/v5/order/realtime', 'GET', {
            category,
            symbol
          })
          
          return new Response(JSON.stringify({
            success: true,
            orders: result.result?.list || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'cancel-order': {
          const { orderId, symbol, category = 'spot' } = params
          const result = await bybitRequest('/v5/order/cancel', 'POST', {
            category,
            symbol,
            orderId
          })
          
          return new Response(JSON.stringify({
            success: true,
            result: result.result
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        default:
          return new Response(JSON.stringify({
            error: 'Unknown action',
            supportedActions: ['status', 'place-order', 'get-orders', 'cancel-order']
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed',
      supportedMethods: ['GET', 'POST'],
      endpoints: ['/ping', '/env', '/test-connection']
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Bybit broker error:', error)
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})