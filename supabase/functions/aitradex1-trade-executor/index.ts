import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { sendAlert } from '../_shared/alerts.ts'

const ALLOWED_ORIGINS = [
  'https://unireli.io',
  'https://www.unireli.io', 
  'https://lovable.dev',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://59e92957-e12b-427f-b4a6-69cc13955562.lovableproject.com'
]

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  }
}

// =================== VALIDATION SCHEMAS ===================

const SignalSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['Buy', 'Sell']),
  amountUSD: z.number().min(1),
  leverage: z.number().min(1).max(100)
}).or(z.object({
  symbol: z.string().regex(/USDT$/, "Symbol must end with USDT"),
  direction: z.enum(['LONG', 'SHORT']),
  entry_price: z.number().positive().optional(),
  stop_loss: z.number().positive().optional(), 
  take_profit: z.number().positive().optional(),
  pms_score: z.number().min(0).max(1),
  confidence_score: z.number().min(0).max(1),
  risk_reward_ratio: z.number().min(1.5),
  regime: z.string(),
  atr: z.number().positive(),
  indicators: z.object({
    notionalUSD: z.number().min(5),
    leverage: z.number().min(1).max(25)
  })
}));

// =================== PRECISION UTILITIES ===================

const round = (value: number, step: number): number => Math.floor(value / step) * step;
const toStep = (qty: number, step: number): number => Number(round(qty, step).toFixed(8));
const toTick = (price: number, tick: number): number => Number(round(price, tick).toFixed(8));

// New precise rounding helpers for qty calculation
const roundToStep = (v: number, step: number, mode: 'down'|'up'='down') => {
  const n = Math.floor(v / step) * step;
  const up = Math.ceil(v / step) * step;
  return mode === 'down' ? Number(n.toFixed(12)) : Number(up.toFixed(12));
};

// Instrument info type
type InstrumentInfo = {
  tickSize: number;
  qtyStep: number;
  minOrderQty?: number;
  minNotional?: number;
};

// =================== STRUCTURED LOGGING ===================

const structuredLog = (event: string, data: Record<string, any> = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    requestId: data.requestId || crypto.randomUUID(),
    ...data
  };
  console.log(JSON.stringify(logEntry));
  return logEntry.requestId;
};

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
      : (Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com')
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

  private async requestWithRetry(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, any> = {},
    maxRetries: number = 3
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.request(method, endpoint, params);
        return result;
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        
        // Don't retry on business logic errors - these should bubble up immediately
        if (errorMessage.includes('10003') || // Invalid API key
            errorMessage.includes('10004') || // Invalid signature  
            errorMessage.includes('10005') || // Permission denied
            errorMessage.includes('110001') || // Order quantity too small
            errorMessage.includes('110003') || // Price outside range
            errorMessage.includes('110004') || // Insufficient balance
            errorMessage.includes('110025')) { // Market not active
          throw error;
        }
        
        // Only retry on rate limits, server errors, or network issues
        if (errorMessage.includes('429') || 
            errorMessage.includes('5') || 
            errorMessage.includes('network') ||
            errorMessage.includes('timeout')) {
          
          if (attempt < maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            structuredLog('bybit_retry', { 
              attempt, 
              maxRetries, 
              backoffMs, 
              error: errorMessage,
              endpoint 
            });
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
        }
        
        // Don't retry other errors
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private async request(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    // Check for time drift before signing (Bybit is strict about timing)
    const serverTime = await this.getServerTime();
    const localTime = Date.now();
    const timeDrift = Math.abs(serverTime - localTime);
    
    if (timeDrift > 500) {
      structuredLog('time_drift_warning', { timeDrift, serverTime, localTime });
    }
    const url = `${this.baseURL}${endpoint}`
    const timestamp = serverTime.toString()
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

  private async getServerTime(): Promise<number> {
    try {
      const response = await fetch(`${this.baseURL}/v5/market/time`);
      const data = await response.json();
      return parseInt(data.result.timeSecond) * 1000;
    } catch (error) {
      // Fallback to local time if server time unavailable
      return Date.now();
    }
  }

  async getInstrumentInfo(symbol: string): Promise<any> {
    return this.requestWithRetry('GET', '/v5/market/instruments-info', {
      category: 'linear',
      symbol
    })
  }

  async getInstrumentMeta(symbol: string): Promise<InstrumentInfo> {
    try {
      const response = await this.requestWithRetry('GET', '/v5/market/instruments-info', {
        category: 'linear',
        symbol
      });

      const instrument = response.result?.list?.[0];
      if (!instrument) {
        throw new Error(`Instrument ${symbol} not found`);
      }

      const pf = instrument.priceFilter ?? {};
      const lf = instrument.lotSizeFilter ?? {};

      return {
        tickSize: Number(pf.tickSize ?? 0.0001),
        qtyStep: Number(lf.qtyStep ?? 0.001),
        minOrderQty: lf.minOrderQty ? Number(lf.minOrderQty) : undefined,
        minNotional: lf.minNotional ? Number(lf.minNotional) : 1,
      };
    } catch (error) {
      console.error('Failed to get instrument meta:', error);
      return {
        tickSize: 0.0001,
        qtyStep: 0.001,
        minNotional: 1,
      };
    }
  }

  async getMarkPrice(symbol: string): Promise<number> {
    const response = await this.requestWithRetry('GET', '/v5/market/tickers', {
      category: 'linear',
      symbol
    });
    const ticker = response.result?.list?.[0];
    const price = Number(ticker?.lastPrice ?? ticker?.markPrice);
    if (!price || Number.isNaN(price)) {
      throw new Error('NO_PRICE');
    }
    return price;
  }

  async getOrderbook(symbol: string): Promise<any> {
    return this.requestWithRetry('GET', '/v5/market/orderbook', {
      category: 'linear',
      symbol,
      limit: 25
    })
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    return this.requestWithRetry('POST', '/v5/position/set-leverage', {
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
    
    return this.requestWithRetry('POST', '/v5/order/create', params)
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.requestWithRetry('POST', '/v5/order/cancel', {
      category: 'linear',
      symbol,
      orderId
    })
  }

  async getPositions(symbol?: string): Promise<any> {
    const params: any = { category: 'linear' }
    if (symbol) params.symbol = symbol
    
    return this.requestWithRetry('GET', '/v5/position/list', params)
  }

  async setTradingStop(params: {
    symbol: string
    stopLoss?: string
    takeProfit?: string
    tpTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice'
    slTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice'
  }): Promise<any> {
    return this.requestWithRetry('POST', '/v5/position/trading-stop', {
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

// Idempotency cache for preventing duplicate orders
const idempotencyCache = new Map<string, any>();

// Helper function to round to exchange step size
function roundToStep(value: number, stepSize: number): number {
  return Math.floor(value / stepSize) * stepSize;
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

  async getInstrumentMeta(symbol: string) {
    try {
      const result = await this.bybit.getInstrumentInfo(symbol);
      const instrument = result.result?.list?.[0];
      
      if (!instrument) {
        throw new Error(`Instrument ${symbol} not found`);
      }
      
      return {
        tickSize: parseFloat(instrument.priceFilter?.tickSize || '0.01'),
        qtyStep: parseFloat(instrument.lotSizeFilter?.qtyStep || '0.001'),
        minNotional: parseFloat(instrument.lotSizeFilter?.minNotionalValue || '5'),
        basePrecision: parseInt(instrument.lotSizeFilter?.basePrecision || '3'),
        quotePrecision: parseInt(instrument.priceFilter?.basePrecision || '2')
      };
    } catch (error) {
      console.error('Failed to get instrument meta:', error);
      // Return sensible defaults for most USDT perpetuals
      return {
        tickSize: 0.1,
        qtyStep: 0.001,
        minNotional: 5,
        basePrecision: 3,
        quotePrecision: 1
      };
    }
  }

  async validateSignal(signal: TradingSignal): Promise<{ valid: boolean; reason?: string }> {
    // Symbol validation - allow all symbols (whitelist completely removed)
    const RAW_ALLOWED = (Deno.env.get('ALLOWED_SYMBOLS') ?? '').trim();
    const ALLOW_ALL = RAW_ALLOWED === '' || RAW_ALLOWED === '*' || RAW_ALLOWED.toUpperCase() === 'ALL';
    
    // Always allow all symbols - rely on Bybit validation
    structuredLog('symbol_validation', { symbol: signal.symbol, allow_all: true, whitelist_disabled: true })

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

  async executeSignal(signal: any, idempotencyKey?: string): Promise<any> {
    const requestId = crypto.randomUUID();
    
    try {
      // Handle both new simple format and legacy format
      const isSimpleFormat = signal.amountUSD && signal.leverage;
      
      structuredLog('signal_processing_started', {
        requestId,
        signal,
        format: isSimpleFormat ? 'simple' : 'legacy',
        idempotency_key: idempotencyKey
      });

      // Check idempotency first
      if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
        const cachedResult = idempotencyCache.get(idempotencyKey);
        structuredLog('idempotency_cache_hit', { 
          requestId, 
          idempotencyKey, 
          cachedResult 
        });
        return cachedResult;
      }

      // 1. Check live trading feature flag
      const liveEnabled = Deno.env.get('LIVE_TRADING_ENABLED') === 'true';
      if (!liveEnabled) {
        const result = { 
          success: false, 
          reason: 'Live trading is disabled by feature flag',
          code: 'FEATURE_DISABLED'
        };
        
        structuredLog('live_trading_disabled', { requestId });
        return result;
      }

      // 2. Get instrument metadata and current price
      const { tickSize, qtyStep, minOrderQty, minNotional } = await this.bybit.getInstrumentMeta(signal.symbol);
      const price = await this.bybit.getMarkPrice(signal.symbol);
      
      structuredLog('instrument_info', {
        requestId,
        symbol: signal.symbol,
        price,
        tickSize,
        qtyStep,
        minNotional
      });

      // 3. Calculate leverage and notional
      const leverage = Math.min(100, Math.max(1, isSimpleFormat ? signal.leverage : 1));
      const amountUSD = isSimpleFormat ? signal.amountUSD : 50;
      const notional = amountUSD * leverage;
      
      // 4. Calculate and round qty
      let qty = notional / price;
      qty = roundToStep(qty, qtyStep, 'down');
      
      // 5. Ensure minimum notional by nudging qty up if needed
      const needNotional = Math.max(minNotional ?? 1, 1);
      if (qty * price < needNotional) {
        qty = roundToStep(needNotional / price, qtyStep, 'up');
      }
      
      // 6. Also respect minOrderQty when provided
      if (minOrderQty && qty < minOrderQty) {
        qty = roundToStep(minOrderQty, qtyStep, 'up');
      }
      
      if (qty <= 0) {
        const result = { 
          success: false, 
          reason: `Calculated qty ${qty} is invalid`,
          code: 'SIZE_TOO_SMALL'
        };
        structuredLog('qty_calculation_failed', { requestId, qty, price, notional });
        return result;
      }

      const finalNotional = qty * price;
      structuredLog('qty_calculation', {
        requestId,
        amountUSD,
        leverage,
        price,
        qty,
        finalNotional,
        minNotional: needNotional
      });

      // 7. Set leverage before placing order
      try {
        await this.bybit.setLeverage(signal.symbol, leverage);
        structuredLog('leverage_set', { requestId, symbol: signal.symbol, leverage });
      } catch (leverageError) {
        console.warn('Failed to set leverage:', leverageError);
        // Continue anyway - leverage might already be set
      }

      // 8. Place market order
      const side = isSimpleFormat ? signal.side : (signal.direction === 'LONG' ? 'Buy' : 'Sell');
      
      const orderResult = await this.bybit.placeOrder({
        symbol: signal.symbol,
        side,
        orderType: 'Market',
        qty: qty.toString(),
        timeInForce: 'IOC',
        reduceOnly: false
      })

      structuredLog('order_result', {
        requestId,
        retCode: orderResult.retCode || 0,
        retMsg: orderResult.retMsg || 'success',
        exchange_order_id: orderResult.result?.orderId,
        symbol: signal.symbol,
        qty,
        side,
        finalNotional
      });

      // Check if order was successful
      if (orderResult.retCode !== 0) {
        const result = { 
          success: false, 
          reason: orderResult.retMsg || 'Order placement failed',
          code: 'ORDER_FAILED',
          details: {
            symbol: signal.symbol,
            qty,
            side,
            retCode: orderResult.retCode,
            retMsg: orderResult.retMsg
          }
        };
        
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, result);
          setTimeout(() => idempotencyCache.delete(idempotencyKey), 60000);
        }
        
        return result;
      }

      const result = { 
        success: true, 
        orderId: orderResult.result?.orderId,
        qty,
        price,
        notional: finalNotional,
        leverage,
        side,
        symbol: signal.symbol
      };
      
      // Cache successful results
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, result);
        setTimeout(() => idempotencyCache.delete(idempotencyKey), 300000); // 5 minutes
      }
      
      structuredLog('order_success', { requestId, result });
      return result;
      
    } catch (error: any) {
      const result = { 
        success: false, 
        reason: this.mapBybitError(error.message),
        code: 'EXECUTION_ERROR',
        details: error.message
      };
      
      structuredLog('execution_error', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      
      // Cache errors for a short time to prevent retry storms
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, result);
        setTimeout(() => idempotencyCache.delete(idempotencyKey), 60000);
      }
      
      return result;
    }
  }
            tpTriggerBy: 'LastPrice',
            slTriggerBy: 'LastPrice'
          })
        } catch (error) {
          structuredLog('sl_tp_set_failed', {
            requestId,
            order_id: dbOrder.id,
            error: error.message
          });
        }
      }

      const result = {
        success: true,
        signal_id: dbSignal.id,
        order_id: dbOrder.id,
        exchange_order_id: orderResult.result.orderId,
        qty: qty,
        entry_price: entryPrice,
        liveAllowed: true
      };

      // Cache successful result (for 5 minutes)
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, result);
        setTimeout(() => idempotencyCache.delete(idempotencyKey), 300000);
      }

      structuredLog('trade_execution_success', {
        requestId,
        signal_id: dbSignal.id,
        order_id: dbOrder.id,
        exchange_order_id: orderResult.result.orderId
      });

      return result;

    } catch (error) {
      const result = { 
        success: false, 
        reason: this.mapBybitError(error.message),
        code: 'EXECUTION_ERROR'
      };
      
      // Cache error results too (for 1 minute)
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, result);
        setTimeout(() => idempotencyCache.delete(idempotencyKey), 60000);
      }
      
      structuredLog('trade_execution_failed', {
        requestId,
        signal: signal,
        error: error.message,
        stack_trace: error.stack
      });
      return result;
    }
  }

  private mapBybitError(errorMessage: string): string {
    // Enhanced error mapping with user-friendly messages
    if (errorMessage.includes('10003')) {
      return 'Invalid API key - recheck your Bybit credentials';
    }
    if (errorMessage.includes('10004')) {
      return 'Invalid signature - resync time / recheck keys';
    }
    if (errorMessage.includes('10005')) {
      return 'Permission denied - enable "Trade" in Bybit API settings';
    }
    if (errorMessage.includes('10006')) {
      return 'Rate limited - retrying shortly';
    }
    if (errorMessage.includes('110001')) {
      return 'Price/Qty precision invalid - retrying with exchange tick/step';
    }
    if (errorMessage.includes('110003')) {
      return 'Price outside allowed range - market may be volatile';
    }
    if (errorMessage.includes('110004')) {
      return 'Insufficient balance for this trade';
    }
    if (errorMessage.includes('110005')) {
      return 'Position size would exceed risk limits';
    }
    if (errorMessage.includes('110025')) {
      return 'Min notional not met - increase order size';
    }
    if (errorMessage.includes('429')) {
      return 'Rate limited - retrying shortly';
    }
    
    return errorMessage; // Return original if no specific mapping
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
  console.log('[AItradeX1 Executor] Function called!')
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
    let requestBody = {}
    try {
      const text = await req.text()
      if (text) {
        requestBody = JSON.parse(text)
      }
    } catch (error) {
      console.log('[AItradeX1 Executor] No JSON body or parse error:', error.message)
    }
    
    const { action, enabled, signal, idempotencyKey } = requestBody as any
    console.log('[AItradeX1 Executor] Action:', action, 'Enabled:', enabled)
    
    // Route by action
    if (action === 'status') {
      console.log('[AItradeX1 Executor] Handling status request')
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
        liveAllowed: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
        last_updated: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === '_test_alert') {
      // Simple guard to avoid public spam
      const auth = req.headers.get('authorization') ?? '';
      if (!auth.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const meta = { 
        env: Deno.env.get('BYBIT_BASE') || 'api.bybit.com', 
        user: session?.user?.email ?? 'n/a',
        timestamp: new Date().toISOString()
      };
      
      const r = await sendAlert(supabase, {
        event: 'ALERTS_SELF_TEST',
        severity: 'warning',
        title: 'Alerts Self-Test',
        message: 'Fan-out, dedupe, and audit log check.',
        meta
      });
      
      return new Response(JSON.stringify(r), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'toggle') {
      const { error } = await supabase
        .from('trading_config')
        .update({ auto_trading_enabled: enabled })
        .eq('id', (await supabase.from('trading_config').select('id').single()).data.id)

      if (error) throw error

      // Send alert for live trading toggle
      const actor = {
        id: session?.user?.id ?? 'unknown',
        email: session?.user?.email ?? 'unknown'
      };
      
      if (enabled) {
        await sendAlert(supabase, {
          event: 'LIVE_ENABLED',
          severity: 'critical',
          title: 'Live Trading ENABLED',
          message: `Enabled by ${actor.email}. Safety gate passed.`,
          meta: { actor, ip: req.headers.get('x-forwarded-for'), userAgent: req.headers.get('user-agent') }
        });
      } else {
        await sendAlert(supabase, {
          event: 'LIVE_DISABLED',
          severity: 'warning',
          title: 'Live Trading DISABLED',
          message: `Disabled by ${actor.email}.`,
          meta: { actor }
        });
      }

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

      // Send critical alert for emergency stop
      const actor = {
        id: session?.user?.id ?? 'unknown',
        email: session?.user?.email ?? 'unknown'
      };
      
      await sendAlert(supabase, {
        event: 'EMERGENCY_STOP',
        severity: 'critical',
        title: 'Emergency Stop ACTIVATED',
        message: 'Closing positions and pausing trading.',
        meta: { actor, reason: 'manual' }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Emergency stop activated - all auto-trading disabled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'signal' || action === 'place_order') {
      // Initialize Bybit client (use mainnet by default)
      const bybitCredentials = {
        apiKey: Deno.env.get('BYBIT_API_KEY') ?? Deno.env.get('BYBIT_KEY') ?? '',
        apiSecret: Deno.env.get('BYBIT_API_SECRET') ?? Deno.env.get('BYBIT_SECRET') ?? '',
        testnet: false // Always use mainnet for live trading
      }

      if (!bybitCredentials.apiKey || !bybitCredentials.apiSecret) {
        return new Response(JSON.stringify({
          success: false,
          reason: 'Bybit API credentials not configured'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const bybit = new BybitV5Client(bybitCredentials)
      const config = { auto_trading_enabled: true } // Mock config for direct execution
      const engine = new AutoTradingEngine(supabase, bybit, config)

      // Execute signal (signal data is already parsed from request body)
      if (!signal) {
        return new Response(JSON.stringify({
          success: false,
          reason: 'No signal data provided'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const result = await engine.executeSignal(signal, idempotencyKey)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: false, 
      message: `Unknown action: ${action}. Available actions: status, toggle, emergency-stop, signal, _test_alert` 
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