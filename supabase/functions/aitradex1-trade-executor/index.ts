import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://unireli.io',
  'https://www.unireli.io', 
  'http://localhost:3000',
  'http://localhost:5173'
]

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-aix-sign',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
}

// =================== BYBIT V5 API INTEGRATION ===================

interface BybitCredentials {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

class BybitV5Client {
  private baseURL: string
  private apiKey: string
  private apiSecret: string

  constructor(credentials: BybitCredentials) {
    this.baseURL = credentials.testnet 
      ? 'https://api-testnet.bybit.com' 
      : 'https://api.bybit.com'
    this.apiKey = credentials.apiKey
    this.apiSecret = credentials.apiSecret
  }

  private async sign(params: Record<string, any>): Promise<string> {
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    
    const signaturePayload = timestamp + this.apiKey + recvWindow + queryString
    
    const encoder = new TextEncoder()
    const data = encoder.encode(signaturePayload)
    const key = encoder.encode(this.apiSecret)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async request(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    
    let queryString = ''
    let body = ''
    
    if (method === 'GET') {
      queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')
    } else {
      body = JSON.stringify(params)
      queryString = body
    }
    
    const signature = await this.sign(params)
    
    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json'
    }
    
    const requestUrl = method === 'GET' && queryString 
      ? `${url}?${queryString}` 
      : url
    
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: method === 'POST' ? body : undefined
    })
    
    const result = await response.json()
    
    if (result.retCode !== 0) {
      throw new Error(`Bybit API Error: ${result.retMsg} (Code: ${result.retCode})`)
    }
    
    return result
  }

  async getInstrumentInfo(symbol: string): Promise<any> {
    return this.request('GET', '/v5/market/instruments-info', {
      category: 'linear',
      symbol
    })
  }

  async getOrderbook(symbol: string): Promise<any> {
    return this.request('GET', '/v5/market/orderbook', {
      category: 'linear',
      symbol,
      limit: 25
    })
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    return this.request('POST', '/v5/position/set-leverage', {
      category: 'linear',
      symbol,
      buyLeverage: leverage.toString(),
      sellLeverage: leverage.toString()
    })
  }

  async placeOrder(orderParams: {
    symbol: string
    side: 'Buy' | 'Sell'
    orderType: 'Market' | 'Limit'
    qty: string
    price?: string
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly'
    reduceOnly?: boolean
    stopLoss?: string
    takeProfit?: string
  }): Promise<any> {
    const params = {
      category: 'linear',
      ...orderParams,
      orderLinkId: `AIX1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    return this.request('POST', '/v5/order/create', params)
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.request('POST', '/v5/order/cancel', {
      category: 'linear',
      symbol,
      orderId
    })
  }

  async getPositions(symbol?: string): Promise<any> {
    const params: any = { category: 'linear' }
    if (symbol) params.symbol = symbol
    
    return this.request('GET', '/v5/position/list', params)
  }

  async setTradingStop(params: {
    symbol: string
    stopLoss?: string
    takeProfit?: string
    tpTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice'
    slTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice'
  }): Promise<any> {
    return this.request('POST', '/v5/position/trading-stop', {
      category: 'linear',
      ...params
    })
  }
}

// =================== TRADING LOGIC ===================

interface TradingSignal {
  symbol: string
  direction: 'LONG' | 'SHORT'
  entry_price: number
  stop_loss: number
  take_profit: number
  pms_score: number
  confidence_score: number
  regime: string
  risk_reward_ratio: number
  atr: number
  indicators: Record<string, any>
}

interface TradingConfig {
  auto_trading_enabled: boolean
  paper_mode: boolean
  risk_per_trade_pct: number
  max_open_risk_pct: number
  daily_loss_limit_pct: number
  max_positions: number
  maker_only: boolean
  default_leverage: number
  slippage_tolerance_bps: number
  min_confidence_score: number
  min_risk_reward_ratio: number
  funding_rate_limit_pct: number
  symbol_whitelist: string[]
}

class AutoTradingEngine {
  private supabase: any
  private bybit: BybitV5Client
  private config: TradingConfig

  constructor(supabase: any, bybit: BybitV5Client, config: TradingConfig) {
    this.supabase = supabase
    this.bybit = bybit
    this.config = config
  }

  async validateSignal(signal: TradingSignal): Promise<{ valid: boolean; reason?: string }> {
    // 1. Check whitelist
    if (!this.config.symbol_whitelist.includes(signal.symbol)) {
      return { valid: false, reason: 'Symbol not in whitelist' }
    }

    // 2. Check confidence and PMS thresholds
    if (signal.confidence_score < this.config.min_confidence_score) {
      return { valid: false, reason: `Confidence score ${signal.confidence_score} < ${this.config.min_confidence_score}` }
    }

    if (Math.abs(signal.pms_score) < 0.70) {
      return { valid: false, reason: `PMS score ${signal.pms_score} < 0.70 threshold` }
    }

    // 3. Check risk-reward ratio
    if (signal.risk_reward_ratio < this.config.min_risk_reward_ratio) {
      return { valid: false, reason: `Risk-reward ratio ${signal.risk_reward_ratio} < ${this.config.min_risk_reward_ratio}` }
    }

    // 4. Check regime (only trending for now)
    if (signal.regime !== 'trending') {
      return { valid: false, reason: 'Only trending regime signals allowed' }
    }

    // 5. Check liquidity (simplified - would need orderbook data)
    try {
      const instrumentInfo = await this.bybit.getInstrumentInfo(signal.symbol)
      if (!instrumentInfo.result?.list?.[0]) {
        return { valid: false, reason: 'Symbol not found on exchange' }
      }
    } catch (error) {
      return { valid: false, reason: `Exchange validation failed: ${error.message}` }
    }

    // 6. Check daily loss limit
    const { data: riskState } = await this.supabase
      .from('trading_risk_state')
      .select('daily_pnl, kill_switch_triggered')
      .eq('trading_date', new Date().toISOString().split('T')[0])
      .single()

    if (riskState?.kill_switch_triggered) {
      return { valid: false, reason: 'Kill switch triggered' }
    }

    if (riskState?.daily_pnl && riskState.daily_pnl < this.config.daily_loss_limit_pct) {
      return { valid: false, reason: 'Daily loss limit exceeded' }
    }

    return { valid: true }
  }

  calculatePositionSize(signal: TradingSignal, accountEquity: number): number {
    const riskAmount = accountEquity * (this.config.risk_per_trade_pct / 100)
    const stopDistance = Math.abs(signal.entry_price - signal.stop_loss)
    const contractValue = signal.entry_price // For USDT perpetuals
    
    const quantity = riskAmount / (stopDistance * contractValue)
    
    // Round to appropriate precision (would need instrument info for exact precision)
    return Math.floor(quantity * 1000000) / 1000000
  }

  async executeSignal(signal: TradingSignal): Promise<any> {
    try {
      await this.logExecution('info', 'signal', `Processing signal: ${signal.symbol} ${signal.direction}`, {
        signal_id: null,
        signal: signal
      })

      // 1. Validate signal
      const validation = await this.validateSignal(signal)
      if (!validation.valid) {
        await this.logExecution('warning', 'signal', `Signal rejected: ${validation.reason}`, {
          signal: signal,
          rejection_reason: validation.reason
        })
        return { success: false, reason: validation.reason }
      }

      // 2. Check position limits
      const { data: existingPositions } = await this.supabase
        .from('trading_positions')
        .select('id')
        .eq('status', 'open')

      if (existingPositions?.length >= this.config.max_positions) {
        return { success: false, reason: 'Maximum positions limit reached' }
      }

      // 3. Calculate position size (simplified - would need actual account balance)
      const accountEquity = 10000 // Placeholder - should fetch from Bybit
      const qty = this.calculatePositionSize(signal, accountEquity)

      if (qty <= 0) {
        return { success: false, reason: 'Position size too small' }
      }

      // 4. Set leverage
      await this.bybit.setLeverage(signal.symbol, this.config.default_leverage)

      // 5. Get optimal entry price for maker order
      const orderbook = await this.bybit.getOrderbook(signal.symbol)
      const bestBid = parseFloat(orderbook.result.b[0][0])
      const bestAsk = parseFloat(orderbook.result.a[0][0])
      
      let entryPrice: number
      if (signal.direction === 'LONG') {
        entryPrice = bestBid // Try to get filled as maker
      } else {
        entryPrice = bestAsk
      }

      // 6. Store signal in database
      const { data: dbSignal, error: signalError } = await this.supabase
        .from('trading_signals')
        .insert({
          symbol: signal.symbol,
          direction: signal.direction,
          pms_score: signal.pms_score,
          confidence_score: signal.confidence_score,
          regime: signal.regime,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          risk_reward_ratio: signal.risk_reward_ratio,
          atr: signal.atr,
          indicators: signal.indicators,
          status: 'validated',
          auto_trade_eligible: true,
          processed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (signalError) throw signalError

      // 7. Place order on Bybit
      const orderResult = await this.bybit.placeOrder({
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
        orderType: this.config.maker_only ? 'Limit' : 'Market',
        qty: qty.toString(),
        price: this.config.maker_only ? entryPrice.toString() : undefined,
        timeInForce: this.config.maker_only ? 'PostOnly' : 'GTC',
        reduceOnly: false
      })

      // 8. Store order in database
      const { data: dbOrder, error: orderError } = await this.supabase
        .from('trading_orders')
        .insert({
          signal_id: dbSignal.id,
          exchange_order_id: orderResult.result.orderId,
          client_order_id: orderResult.result.orderLinkId,
          exchange: 'bybit',
          symbol: signal.symbol,
          side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
          order_type: this.config.maker_only ? 'Limit' : 'Market',
          qty: parseFloat(qty.toString()),
          price: this.config.maker_only ? entryPrice : null,
          time_in_force: this.config.maker_only ? 'PostOnly' : 'GTC',
          leverage: this.config.default_leverage,
          status: 'new',
          raw_response: orderResult
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 9. Set stop loss and take profit
      if (orderResult.result.orderId) {
        try {
          await this.bybit.setTradingStop({
            symbol: signal.symbol,
            stopLoss: signal.stop_loss.toString(),
            takeProfit: signal.take_profit.toString(),
            tpTriggerBy: 'LastPrice',
            slTriggerBy: 'LastPrice'
          })
        } catch (error) {
          await this.logExecution('warning', 'order', `Failed to set SL/TP: ${error.message}`, {
            order_id: dbOrder.id
          })
        }
      }

      await this.logExecution('info', 'order', `Order placed successfully: ${orderResult.result.orderId}`, {
        signal_id: dbSignal.id,
        order_id: dbOrder.id,
        exchange_order_id: orderResult.result.orderId
      })

      return {
        success: true,
        signal_id: dbSignal.id,
        order_id: dbOrder.id,
        exchange_order_id: orderResult.result.orderId,
        qty: qty,
        entry_price: entryPrice
      }

    } catch (error) {
      await this.logExecution('error', 'system', `Trade execution failed: ${error.message}`, {
        signal: signal,
        error: error.message,
        stack_trace: error.stack
      })
      return { success: false, reason: error.message }
    }
  }

  private async logExecution(level: string, scope: string, message: string, metadata: any = {}) {
    try {
      await this.supabase
        .from('trading_execution_log')
        .insert({
          level,
          scope,
          message,
          metadata,
          signal_id: metadata.signal_id || null,
          order_id: metadata.order_id || null
        })
    } catch (error) {
      console.error('Failed to log execution:', error)
    }
  }
}

// =================== MAIN HANDLER ===================

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log(`[AItradeX1 Executor] ${req.method} ${req.url}`)

    // Parse request body for action routing
    const { action, enabled } = await req.json().catch(() => ({}))
    
    // Route by action
    if (action === 'status') {
      // Get trading status
      const { data: config } = await supabase
        .from('trading_config')
        .select('*')
        .single()

      const { data: riskState } = await supabase
        .from('trading_risk_state')
        .select('*')
        .eq('trading_date', new Date().toISOString().split('T')[0])
        .single()

      const { data: positions } = await supabase
        .from('trading_positions')
        .select('*')
        .eq('status', 'open')

      const { data: orders } = await supabase
        .from('trading_orders')
        .select('*')
        .in('status', ['pending', 'new', 'partiallyFilled'])
        .limit(10)

      return new Response(JSON.stringify({
        success: true,
        config,
        risk_state: riskState,
        open_positions: positions?.length || 0,
        pending_orders: orders?.length || 0,
        last_updated: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'toggle') {
      const { error } = await supabase
        .from('trading_config')
        .update({ auto_trading_enabled: enabled })
        .eq('id', (await supabase.from('trading_config').select('id').single()).data.id)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        auto_trading_enabled: enabled
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'emergency-stop') {
      // Cancel all pending orders and disable auto-trading
      const { error: configError } = await supabase
        .from('trading_config')
        .update({ auto_trading_enabled: false })
        .eq('id', (await supabase.from('trading_config').select('id').single()).data.id)

      const { error: riskError } = await supabase
        .from('trading_risk_state')
        .upsert({
          trading_date: new Date().toISOString().split('T')[0],
          kill_switch_triggered: true,
          kill_switch_reason: 'Manual emergency stop',
          auto_trading_enabled: false
        })

      return new Response(JSON.stringify({
        success: true,
        message: 'Emergency stop activated - all auto-trading disabled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'signal') {
      // Get trading config
      const { data: config } = await supabase
        .from('trading_config')
        .select('*')
        .single()

      if (!config?.auto_trading_enabled) {
        return new Response(JSON.stringify({
          success: false,
          reason: 'Auto-trading disabled'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Initialize Bybit client
      const bybitCredentials = {
        apiKey: Deno.env.get('BYBIT_API_KEY') ?? '',
        apiSecret: Deno.env.get('BYBIT_API_SECRET') ?? '',
        testnet: config.paper_mode
      }

      const bybit = new BybitV5Client(bybitCredentials)
      const engine = new AutoTradingEngine(supabase, bybit, config)

      // Execute signal (signal data would be passed in the request body)
      const { signal } = await req.json().catch(() => ({}))
      const result = await engine.executeSignal(signal)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: false, 
      message: `Unknown action: ${action}. Available actions: status, toggle, emergency-stop, signal` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[AItradeX1 Executor] Error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})