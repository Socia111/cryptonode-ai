import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Enhanced Bybit API client with V5 compatibility and better error handling
class BybitV5Client {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor(isTestnet = false) {
    this.apiKey = Deno.env.get('BYBIT_API_KEY') || ''
    this.apiSecret = Deno.env.get('BYBIT_API_SECRET') || ''
    
    // Use mainnet for live trading (not testnet)
    this.baseUrl = 'https://api.bybit.com'
    
    console.log(`🔧 Bybit V2 Broker initialized:`)
    console.log(`  - Base URL: ${this.baseUrl}`)
    console.log(`  - API Key present: ${!!this.apiKey}`)
    console.log(`  - API Secret present: ${!!this.apiSecret}`)
    console.log(`  - API Key preview: ${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'MISSING'}`)
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('❌ Bybit API credentials not configured - please check BYBIT_API_KEY and BYBIT_API_SECRET')
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

    console.log(`📡 Making ${method} request to: ${url}`)

    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(params)
    })

    const data = await response.json()
    
    console.log(`📊 API Response (${data.retCode}): ${data.retMsg}`)
    
    if (data.retCode !== 0) {
      const errorMsg = `Bybit API error: ${data.retMsg} (Code: ${data.retCode})`
      console.error(`❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }

    return data
  }

  // Server time for testing connectivity
  async getServerTime() {
    return this.request('GET', '/v5/market/time')
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
    timeInForce?: string
  }) {
    return this.request('POST', '/v5/order/create', params)
  }

  async getOrders(category = 'linear', symbol?: string) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    return this.request('GET', '/v5/order/realtime', params)
  }

  // Market data
  async getTickers(category = 'linear', symbol?: string) {
    const params: any = { category }
    if (symbol) params.symbol = symbol
    return this.request('GET', '/v5/market/tickers', params)
  }

  async getKlines(category = 'linear', symbol: string, interval = '15', limit = 200) {
    return this.request('GET', '/v5/market/kline', {
      category,
      symbol,
      interval,
      limit
    })
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()
    
    // Initialize Bybit client (always mainnet for live trading)
    const client = new BybitV5Client(false)
    
    console.log(`🚀 Bybit Broker V2 - Action: ${action}`)

    switch (action) {
      case 'test_connection':
        console.log('🔌 Testing Bybit API connection...')
        const serverTime = await client.getServerTime()
        const accountInfo = await client.getAccountInfo()
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Bybit API connection successful',
          server_time: serverTime.result,
          account_status: accountInfo.result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'get_balance':
        console.log('💰 Getting wallet balance...')
        const balance = await client.getWalletBalance('UNIFIED')
        
        return new Response(JSON.stringify({
          success: true,
          balance: balance.result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'place_order':
        console.log(`📋 Placing ${params.side} order for ${params.symbol}`)
        const order = await client.placeOrder({
          category: 'linear',
          symbol: params.symbol,
          side: params.side,
          orderType: 'Market',
          qty: params.qty.toString(),
          timeInForce: 'IOC'
        })
        
        return new Response(JSON.stringify({
          success: true,
          order: order.result,
          message: `${params.side} order placed successfully`,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'get_positions':
        console.log('📊 Getting current positions...')
        const positions = await client.getPositions('linear', params.symbol)
        
        return new Response(JSON.stringify({
          success: true,
          positions: positions.result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'get_tickers':
        console.log('💹 Getting market tickers...')
        const tickers = await client.getTickers('linear', params.symbol)
        
        return new Response(JSON.stringify({
          success: true,
          tickers: tickers.result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'ping':
        console.log('🏓 Ping test...')
        const pingTime = await client.getServerTime()
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Bybit Broker V2 is operational',
          server_time: pingTime.result,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}. Available actions: test_connection, get_balance, place_order, get_positions, get_tickers, ping`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('❌ Bybit Broker V2 Error:', error)
    
    // Check if it's an API key issue
    const isAPIKeyError = error.message.includes('API key') || 
                         error.message.includes('invalid') || 
                         error.message.includes('10003') ||
                         error.message.includes('authentication')
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      error_type: isAPIKeyError ? 'API_KEY_INVALID' : 'GENERAL_ERROR',
      details: error.stack,
      timestamp: new Date().toISOString(),
      suggestion: isAPIKeyError ? 
        'Please check your Bybit API key and secret are correct and have trading permissions' :
        'Check system logs for more details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})