import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bybit API Helper
class BybitAPI {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor(apiKey: string, apiSecret: string, testnet = true) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.baseUrl = testnet 
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com'
  }

  async createSignature(params: string, timestamp: string): Promise<string> {
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

  async makeRequest(endpoint: string, params: any = {}) {
    const timestamp = Date.now().toString()
    const queryString = new URLSearchParams(params).toString()
    
    const signature = await this.createSignature(queryString, timestamp)
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    }

    const url = `${this.baseUrl}${endpoint}?${queryString}`
    const response = await fetch(url, { headers })
    
    return await response.json()
  }

  async getAccountBalance() {
    return await this.makeRequest('/v5/account/wallet-balance', {
      accountType: 'UNIFIED',
      coin: 'USDT'
    })
  }

  async getPositions() {
    return await this.makeRequest('/v5/position/list', {
      category: 'linear',
      settleCoin: 'USDT'
    })
  }

  async placeOrder(params: any) {
    const orderData = {
      category: 'linear',
      symbol: params.symbol,
      side: params.side,
      orderType: 'Market',
      qty: params.qty.toString(),
      ...params
    }

    return await this.makeRequest('/v5/order/create', orderData)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, signal, symbol, side, quantity } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API credentials
    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')
    const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true'

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing Bybit API credentials',
          details: 'BYBIT_API_KEY and BYBIT_API_SECRET must be set'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const bybit = new BybitAPI(apiKey, apiSecret, isTestnet)

    switch (action) {
      case 'balance':
        try {
          const balanceResponse = await bybit.getAccountBalance()
          console.log('Balance response:', balanceResponse)
          
          return new Response(
            JSON.stringify({
              success: true,
              balance: balanceResponse,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to fetch balance',
              details: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

      case 'positions':
        try {
          const positionsResponse = await bybit.getPositions()
          console.log('Positions response:', positionsResponse)
          
          return new Response(
            JSON.stringify({
              success: true,
              positions: positionsResponse,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to fetch positions',
              details: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

      case 'execute_trade':
        try {
          if (!signal) {
            throw new Error('Signal data is required for trade execution')
          }

          // Calculate position size (default to $100 USD)
          const usdAmount = 100
          const positionSize = usdAmount / signal.price

          const orderResponse = await bybit.placeOrder({
            symbol: signal.symbol,
            side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
            qty: positionSize.toFixed(6)
          })

          console.log('Order response:', orderResponse)

          // Log execution to database
          await supabaseClient.from('trading_executions').insert({
            symbol: signal.symbol,
            side: signal.direction.toLowerCase(),
            amount_usd: usdAmount,
            entry_price: signal.price,
            signal_id: signal.id,
            status: orderResponse.retCode === 0 ? 'executed' : 'failed',
            exchange_response: orderResponse,
            error_message: orderResponse.retCode !== 0 ? orderResponse.retMsg : null,
            executed_at: new Date().toISOString()
          })

          return new Response(
            JSON.stringify({
              success: orderResponse.retCode === 0,
              execution: orderResponse,
              signal_id: signal.id,
              symbol: signal.symbol,
              side: signal.direction,
              amount_usd: usdAmount,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Trade execution error:', error)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to execute trade',
              details: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

      case 'test_connection':
        try {
          const balanceResponse = await bybit.getAccountBalance()
          
          return new Response(
            JSON.stringify({
              success: true,
              connected: true,
              testnet: isTestnet,
              api_status: balanceResponse.retCode === 0 ? 'active' : 'error',
              message: balanceResponse.retCode === 0 ? 'Connection successful' : balanceResponse.retMsg,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              connected: false,
              error: 'Connection test failed',
              details: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

      default:
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid action',
            available_actions: ['balance', 'positions', 'execute_trade', 'test_connection']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Bybit Live Trading error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})