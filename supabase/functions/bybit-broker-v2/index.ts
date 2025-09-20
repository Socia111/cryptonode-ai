import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Enhanced Bybit API client with V5 compatibility
class BybitV5Client {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor(isTestnet = false) {
    this.apiKey = Deno.env.get('BYBIT_API_KEY') || ''
    this.apiSecret = Deno.env.get('BYBIT_API_SECRET') || ''
    this.baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Bybit API credentials not configured')
    }
  }

  private async signRequest(params: string, timestamp: string): Promise<string> {
    const message = timestamp + this.apiKey + '5000' + params
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async request(method: string, endpoint: string, params: any = {}) {
    const timestamp = Date.now().toString()
    const paramString = method === 'GET' 
      ? new URLSearchParams(params).toString()
      : JSON.stringify(params)
    
    const signature = await this.signRequest(paramString, timestamp)
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    }

    const url = method === 'GET' && paramString
      ? `${this.baseUrl}${endpoint}?${paramString}`
      : `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(params)
    })

    const data = await response.json()
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg} (${data.retCode})`)
    }

    return data
  }

  // Account methods
  async getAccountInfo() {
    return this.request('GET', '/v5/account/info')
  }

  async getWalletBalance(accountType = 'UNIFIED') {
    return this.request('GET', '/v5/account/wallet-balance', { accountType })
  }

  // Position methods
  async getPositions(category = 'linear', symbol?: string) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    return this.request('GET', '/v5/position/list', params)
  }

  // Order methods
  async placeOrder(params: {
    category: string
    symbol: string
    side: 'Buy' | 'Sell'
    orderType: 'Market' | 'Limit'
    qty: string
    price?: string
    positionIdx?: number
    timeInForce?: string
  }) {
    return this.request('POST', '/v5/order/create', {
      timeInForce: 'GTC',
      ...params
    })
  }

  async cancelOrder(category: string, symbol: string, orderId: string) {
    return this.request('POST', '/v5/order/cancel', {
      category,
      symbol,
      orderId
    })
  }

  async getOrders(category = 'linear', symbol?: string, openOnly?: boolean) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    if (openOnly !== undefined) params.openOnly = openOnly ? 1 : 0
    return this.request('GET', '/v5/order/realtime', params)
  }

  // Market data methods
  async getTickers(category = 'linear', symbol?: string) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    return this.request('GET', '/v5/market/tickers', params)
  }

  async getInstruments(category = 'linear', symbol?: string) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    return this.request('GET', '/v5/market/instruments-info', params)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/bybit-broker-v2', '')
    
    // Initialize client
    const isTestnet = url.searchParams.get('testnet') === '1'
    const client = new BybitV5Client(isTestnet)

    // Route handling
    switch (path) {
      case '/ping':
        return Response.json({ ok: true, timestamp: Date.now() }, { headers: corsHeaders })

      case '/status':
        const accountInfo = await client.getAccountInfo()
        const balance = await client.getWalletBalance()
        return Response.json({
          success: true,
          account: accountInfo.result,
          balance: balance.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/balance':
        const balanceData = await client.getWalletBalance()
        return Response.json({
          success: true,
          data: balanceData.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/positions':
        const category = url.searchParams.get('category') || 'linear'
        const symbol = url.searchParams.get('symbol') || undefined
        const positions = await client.getPositions(category, symbol)
        return Response.json({
          success: true,
          data: positions.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/orders':
        const orderCategory = url.searchParams.get('category') || 'linear'
        const orderSymbol = url.searchParams.get('symbol') || undefined
        const openOnly = url.searchParams.get('openOnly') === '1'
        const orders = await client.getOrders(orderCategory, orderSymbol, openOnly)
        return Response.json({
          success: true,
          data: orders.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/tickers':
        const tickerCategory = url.searchParams.get('category') || 'linear'
        const tickerSymbol = url.searchParams.get('symbol') || undefined
        const tickers = await client.getTickers(tickerCategory, tickerSymbol)
        return Response.json({
          success: true,
          data: tickers.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/order':
        if (req.method !== 'POST') {
          return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
        }
        const orderParams = await req.json()
        const orderResult = await client.placeOrder(orderParams)
        return Response.json({
          success: true,
          data: orderResult.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      case '/cancel':
        if (req.method !== 'POST') {
          return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
        }
        const cancelParams = await req.json()
        const cancelResult = await client.cancelOrder(
          cancelParams.category,
          cancelParams.symbol,
          cancelParams.orderId
        )
        return Response.json({
          success: true,
          data: cancelResult.result,
          timestamp: Date.now()
        }, { headers: corsHeaders })

      default:
        return Response.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders })
    }

  } catch (error: any) {
    console.error('Bybit broker error:', error)
    return Response.json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})