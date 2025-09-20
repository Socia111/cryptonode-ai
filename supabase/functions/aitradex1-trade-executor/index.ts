import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { sendAlert } from '../_shared/alerts.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
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

// Utility functions for number rounding
function roundToStep(value: number, stepSize: number): number {
  return Math.floor(value / stepSize + 1e-12) * stepSize;
}

function roundToTick(value: number, tickSize: number): number {
  return Math.round(value / tickSize) * tickSize;
}

// Symbol validation - allow all symbols including digits
function isSymbolAllowed(symbol: string): boolean {
  const allowAll = (Deno.env.get("ALLOWED_SYMBOLS") || "*").trim();
  if (allowAll === "*") return true;

  const list = allowAll.split(",").map(s => s.trim().toUpperCase());
  return list.includes(symbol.toUpperCase());
}

// Instrument info types
type Instrument = {
  category: "spot" | "linear";
  symbol: string;
  tickSize: number;
  qtyStep: number;
  minOrderValue?: number;
  minOrderQty?: number;
  minOrderAmt?: number;
};

// Get instrument information from Bybit
async function getInstrument(symbol: string): Promise<Instrument> {
  const base = Deno.env.get("BYBIT_BASE")!;
  
  for (const category of ["linear", "spot"] as const) {
    const url = new URL("/v5/market/instruments-info", base);
    url.searchParams.set("category", category);
    url.searchParams.set("symbol", symbol);
    
    const r = await fetch(url.toString());
    const j = await r.json();

    if (j?.result?.list?.length) {
      const it = j.result.list[0];
      const tickSize = Number(it.priceFilter?.tickSize ?? 0.01);
      const qtyStep = Number(it.lotSizeFilter?.qtyStep ?? 0.000001);
      const minOrderValue = it.minOrderValue ? Number(it.minOrderValue) : undefined;
      const minOrderQty = it.lotSizeFilter?.minOrderQty ? Number(it.lotSizeFilter.minOrderQty) : undefined;
      const minOrderAmt = it.minOrderAmt ? Number(it.minOrderAmt) : undefined;

      return { category, symbol, tickSize, qtyStep, minOrderValue, minOrderQty, minOrderAmt };
    }
  }
  throw new Error(`Symbol ${symbol} not found on Bybit`);
}

// Get mark price from Bybit
async function getMarkPrice(symbol: string): Promise<number> {
  const base = Deno.env.get("BYBIT_BASE")!;
  
  for (const category of ["linear", "spot"] as const) {
    const url = new URL("/v5/market/tickers", base);
    url.searchParams.set("category", category);
    url.searchParams.set("symbol", symbol);
    
    const r = await fetch(url.toString());
    const j = await r.json();
    const p = Number(j?.result?.list?.[0]?.lastPrice);
    if (p > 0) return p;
  }
  throw new Error("Mark price unavailable");
}

// Compute proper order quantity with exchange minimums and validation
function computeOrderQtyUSD(
  amountUSD: number, 
  leverage: number, 
  price: number, 
  inst: Instrument
) {
  // Validate inputs
  if (!amountUSD || amountUSD <= 0) {
    throw new Error('Invalid amount USD');
  }
  if (!price || price <= 0) {
    throw new Error('Invalid price');
  }
  if (!leverage || leverage <= 0) {
    leverage = 1; // Default to 1x leverage
  }
  
  const targetNotional = Math.max(5, amountUSD) * Math.max(1, leverage);
  
  let qty = targetNotional / price;
  
  // Apply quantity step rounding
  const qtyStep = inst.qtyStep || 0.000001;
  qty = roundToStep(qty, qtyStep);

  // Ensure exchange minimums for linear contracts
  if (inst.category === "linear") {
    if (inst.minOrderValue && inst.minOrderValue > 0) {
      const notional = qty * price;
      if (notional < inst.minOrderValue) {
        qty = Math.ceil(inst.minOrderValue / price / qtyStep) * qtyStep;
      }
    }
    
    // For linear contracts, ensure minimum is at least 0.001 USDT worth
    const minNotional = Math.max(inst.minOrderValue || 1, 1);
    if ((qty * price) < minNotional) {
      qty = Math.ceil(minNotional / price / qtyStep) * qtyStep;
    }
  }

  // Ensure exchange minimums for spot trading
  if (inst.category === "spot") {
    if (inst.minOrderAmt && inst.minOrderAmt > 0) {
      const notional = qty * price;
      if (notional < inst.minOrderAmt) {
        qty = Math.ceil(inst.minOrderAmt / price / qtyStep) * qtyStep;
      }
    }
    if (inst.minOrderQty && inst.minOrderQty > 0 && qty < inst.minOrderQty) {
      qty = Math.ceil(inst.minOrderQty / qtyStep) * qtyStep;
    }
  }

  // Final validation
  if (!qty || qty <= 0) {
    throw new Error(`Invalid calculated quantity: ${qty} for symbol ${inst.symbol}`);
  }

  return { qty, targetNotional };
}

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
    
    // Log initialization (without exposing secrets)
    console.log(`Bybit client initialized: ${this.baseURL} (testnet: ${credentials.testnet})`)
  }

  private async signRequest(method: string, path: string, params: any = {}): Promise<string> {
    const timestamp = Date.now().toString()
    const paramString = Object.keys(params).length 
      ? JSON.stringify(params)
      : ''

    const message = timestamp + this.apiKey + '5000' + paramString
    const signature = await this.hmacSha256(this.apiSecret, message)
    
    return signature
  }

  private async hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async signedRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString()
    const signature = await this.signRequest(method, endpoint, params)
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    }

    const url = `${this.baseURL}${endpoint}`
    const options: RequestInit = {
      method,
      headers,
      ...(method !== 'GET' && { body: JSON.stringify(params) })
    }

    const response = await fetch(url, options)
    const data = await response.json()
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }
    
    return data
  }

  // Get account position mode by checking unified account settings
  async getPositionMode(symbol: string, category: string): Promise<number | null> {
    try {
      if (category !== 'linear') {
        return null // Spot trading doesn't use position modes
      }

      // First check if account supports One-Way mode (most common)
      try {
        const accountData = await this.signedRequest('GET', '/v5/account/info', {})
        const accountType = accountData?.result?.accountType || 'UNIFIED'
        
        structuredLog('info', 'Account type detected', { 
          accountType,
          marginMode: accountData?.result?.marginMode || 'unknown' 
        })
        
        // Check current position mode for this symbol
        try {
          const positionData = await this.signedRequest('GET', '/v5/position/list', {
            category: 'linear',
            symbol
          })
          
          // If we have existing positions, use their positionIdx
          if (positionData?.result?.list?.length > 0) {
            const position = positionData.result.list[0]
            const currentIdx = Number(position.positionIdx)
            
            structuredLog('info', 'Found existing position, using its mode', { 
              symbol, 
              positionIdx: currentIdx,
              size: position.size,
              side: position.side
            })
            
            return currentIdx
          }
        } catch (posError) {
          structuredLog('warn', 'Could not check existing positions', { error: posError.message })
        }
        
        // For unified accounts with no existing positions, try One-Way mode first
        structuredLog('info', 'No existing positions, defaulting to One-Way mode', { symbol, accountType })
        return 0
        
      } catch (accountError) {
        structuredLog('warn', 'Account info not available, using safe default', { 
          symbol,
          error: accountError.message 
        })
        return 0
      }
      
    } catch (error) {
      structuredLog('error', 'Position mode detection completely failed', { 
        symbol, 
        category,
        error: error.message 
      })
      return null // Return null to indicate we should try without positionIdx
    }
  }
}

// =================== TRADING SIGNAL & CONFIG TYPES ===================

interface TradingSignal {
  symbol: string
  direction: 'BUY' | 'SELL'
  entry_price?: number
  stop_loss?: number
  take_profit?: number
  score: number
  leverage?: number
  notional?: number
  quantity?: number
}

interface TradingConfig {
  enabled: boolean
  maxPositionSize: number
  allowedSymbols: string[]
  riskLimits: {
    maxLeverage: number
    minRiskRewardRatio: number
    maxDailyLoss: number
  }
}

// =================== AUTO TRADING ENGINE ===================

class AutoTradingEngine {
  private supabase: any
  public client?: BybitV5Client
  private config?: TradingConfig

  constructor(supabase: any) {
    this.supabase = supabase
  }

  private async initializeClient(): Promise<void> {
    // Try multiple environment variable names for compatibility
    const apiKey = Deno.env.get('BYBIT_API_KEY') || Deno.env.get('BYBIT_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET') || Deno.env.get('BYBIT_SECRET') || Deno.env.get('BYBIT_SECRET_KEY')
    // Use testnet by default for testing to avoid insufficient balance issues
    const isTestnet = Deno.env.get('BYBIT_TESTNET') !== 'false'
    
    if (!apiKey || !apiSecret) {
      const availableKeys = Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('BYBIT') || key.includes('bybit')
      )
      throw new Error(`Bybit credentials not configured. Available env vars: ${availableKeys.join(', ')}`)
    }

    structuredLog('info', 'Initializing Bybit client', {
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      testnet: isTestnet,
      baseUrl: isTestnet ? 'https://api-testnet.bybit.com' : (Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com')
    })

    this.client = new BybitV5Client({
      apiKey,
      apiSecret,
      testnet: isTestnet
    })
  }

  async executeSignal(signal: TradingSignal): Promise<any> {
    await this.initializeClient()
    
    if (!this.client) {
      throw new Error('Trading client not initialized')
    }

    // Validate signal
    if (!isSymbolAllowed(signal.symbol)) {
      throw new Error(`Symbol ${signal.symbol} not whitelisted`)
    }

    // Check account balance first
    try {
      const balance = await this.client.signedRequest('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED'
      })
      
      const usdtBalance = balance?.result?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT')
      const availableBalance = parseFloat(usdtBalance?.availableToWithdraw || '0')
      
      structuredLog('info', 'Account balance check', {
        availableBalance,
        requestedAmount: signal.notional || 10
      })
      
      if (availableBalance < (signal.notional || 10)) {
        throw new Error(`Insufficient balance. Available: ${availableBalance} USDT, Required: ${signal.notional || 10} USDT`)
      }
    } catch (balanceError) {
      structuredLog('warn', 'Balance check failed', { error: balanceError.message })
      throw new Error(`Balance check failed: ${balanceError.message}`)
    }

    // Get instrument info and calculate proper size
    const inst = await getInstrument(signal.symbol)
    const price = await getMarkPrice(signal.symbol)
    
    const { qty } = computeOrderQtyUSD(
      signal.notional || 10, 
      signal.leverage || 1, 
      price, 
      inst
    )

    if (!qty || qty <= 0) {
      throw new Error('Invalid quantity calculation')
    }

    // Place order
    const orderData: any = {
      category: inst.category,
      symbol: signal.symbol,
      side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: String(qty),
      timeInForce: 'IOC'
    }

    // For linear contracts, we need to handle position mode correctly
    if (inst.category === 'linear') {
      // Get the appropriate positionIdx based on account mode
      const positionIdx = await this.client.getPositionMode(signal.symbol, inst.category)
      orderData.positionIdx = positionIdx
      orderData.reduceOnly = false
    }

    const result = await this.client.signedRequest('POST', '/v5/order/create', orderData)
    
    // Log to database
    await this.logExecution(signal, result, {
      calculatedQty: qty,
      instrumentInfo: inst,
      markPrice: price
    })

    return result
  }

  private async logExecution(signal: TradingSignal, result: any, metadata: any): Promise<void> {
    try {
      await this.supabase.from('trade_executions').insert({
        signal_data: signal,
        execution_result: result,
        metadata,
        executed_at: new Date().toISOString()
      })
    } catch (error) {
      structuredLog('error', 'Failed to log execution', { error: error.message })
    }
  }
}

// =================== MAIN HANDLER ===================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require auth (since verify_jwt=true)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ success: false, code: "AUTH", message: "Missing authorization header" }, 401);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const requestBody = await req.json();
    const { action, symbol, side, amountUSD, leverage } = requestBody;
    
    structuredLog('info', 'Trade executor called', { action, symbol, side, amountUSD, leverage });

    // Handle status requests
    if (action === 'status') {
      return json({
        ok: true,
        status: 'operational',
        trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
        allowed_symbols: Deno.env.get('ALLOWED_SYMBOLS') || '*',
        timestamp: new Date().toISOString()
      });
    }

    // Handle place order requests
    if (action === 'place_order' || action === 'signal') {
      if (!symbol || !side || !amountUSD) {
        return json({
          success: false,
          message: 'Missing required fields: symbol, side, amountUSD'
        }, 400);
      }

      structuredLog('info', 'Trade execution request', {
        symbol,
        side,
        amountUSD,
        leverage: leverage || 1
      });

      try {
        // Get instrument info and price
        const inst = await getInstrument(symbol);
        const price = await getMarkPrice(symbol);
        
        // Calculate proper quantity with validation
        let orderQty;
        try {
          const { qty } = computeOrderQtyUSD(amountUSD, leverage || 1, price, inst);
          orderQty = qty;
        } catch (qtyError) {
          return json({
            success: false,
            message: `Quantity calculation failed: ${qtyError.message}`,
            details: { symbol, price, amountUSD, leverage }
          }, 400);
        }
        
        if (!orderQty || orderQty <= 0) {
          return json({
            success: false,
            message: 'Invalid calculated quantity',
            details: { calculatedQty: orderQty, symbol, price, amountUSD }
          }, 400);
        }

        // Ensure proper side formatting for Bybit
        const normalizedSide = side === 'Buy' || side === 'BUY' || side.toLowerCase() === 'buy' ? 'Buy' : 'Sell';
        
        // Create order data with proper formatting
        const orderData: any = {
          category: inst.category,
          symbol: symbol.toUpperCase(),
          side: normalizedSide,
          orderType: 'Market',
          qty: orderQty.toFixed(8).replace(/\.?0+$/, ''), // Remove trailing zeros
          timeInForce: 'IOC'
        }

        // Initialize trading engine and client once
        const engine = new AutoTradingEngine(supabase);
        await engine.initializeClient();

        // Check account balance before placing order
        try {
          const balance = await engine.client!.signedRequest('GET', '/v5/account/wallet-balance', {
            accountType: 'UNIFIED'
          });
          
          const usdtBalance = balance?.result?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT');
          const availableBalance = parseFloat(usdtBalance?.availableToWithdraw || '0');
          
          structuredLog('info', 'Account balance check', {
            availableBalance,
            requestedAmount: amountUSD,
            hasEnoughBalance: availableBalance >= amountUSD
          });
          
          if (availableBalance < amountUSD) {
            return json({
              success: false,
              message: `Insufficient balance: Available ${availableBalance.toFixed(2)} USDT, Required ${amountUSD} USDT`,
              error_code: 'INSUFFICIENT_BALANCE',
              details: {
                availableBalance: availableBalance.toFixed(2),
                requiredAmount: amountUSD,
                symbol,
                timestamp: new Date().toISOString()
              }
            }, 400);
          }
        } catch (balanceError) {
          structuredLog('warn', 'Balance check failed', { error: balanceError.message });
          return json({
            success: false,
            message: `Balance verification failed: ${balanceError.message}`,
            error_code: 'BALANCE_CHECK_FAILED',
            details: {
              symbol,
              amountUSD,
              timestamp: new Date().toISOString()
            }
          }, 500);
        }

        // For linear contracts, handle position mode correctly
        if (inst.category === 'linear') {
          try {
            // Get the appropriate position mode
            const positionIdx = await engine.client!.getPositionMode(symbol, inst.category)
            
            if (positionIdx !== null) {
              orderData.positionIdx = positionIdx
              
              structuredLog('info', 'Position configuration set', {
                symbol,
                category: inst.category,
                positionIdx,
                mode: positionIdx === 0 ? 'OneWay' : 'Hedge'
              })
            } else {
              structuredLog('info', 'No position mode required', { symbol })
            }
            
            orderData.reduceOnly = false
            
          } catch (positionError) {
            structuredLog('warn', 'Position mode detection failed, will try multiple approaches', { 
              error: positionError.message,
              symbol 
            })
            // Don't set positionIdx initially - let the retry logic handle it
          }
        }

        // Execute the order with comprehensive retry logic
        let result;
        let lastError;
        
        // Validate order data before submission
        if (!orderData.qty || parseFloat(orderData.qty) <= 0) {
          throw new Error('Invalid order quantity');
        }
        
        structuredLog('info', 'Executing order', {
          symbol,
          category: orderData.category,
          side: orderData.side,
          qty: orderData.qty,
          positionIdx: orderData.positionIdx
        });
        
        // Execute order with comprehensive error handling
        try {
          result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
          structuredLog('info', 'Order executed successfully', {
            orderId: result?.result?.orderId,
            symbol,
            side: orderData.side,
            qty: orderData.qty,
            positionIdx: orderData.positionIdx
          })
        } catch (error) {
          lastError = error;
          const errorMsg = error.message?.toLowerCase() || '';
          
          structuredLog('warn', 'Order execution failed', { 
            error: error.message,
            symbol,
            side: orderData.side,
            qty: orderData.qty,
            positionIdx: orderData.positionIdx
          })
          
          // For linear contracts, try alternative approaches
          if (inst.category === 'linear') {
            
            // Case 1: Position mode issues - try systematic approach
            if (errorMsg.includes('position') || errorMsg.includes('mode') || errorMsg.includes('idx')) {
              
              structuredLog('info', 'Position mode error detected, trying systematic fixes', { 
                symbol,
                originalError: error.message,
                currentPositionIdx: orderData.positionIdx
              })
              
              // Strategy 1: Try without positionIdx (for some unified accounts)
              try {
                const orderDataNoIdx = { ...orderData }
                delete orderDataNoIdx.positionIdx
                
                structuredLog('info', 'Trying without positionIdx', { symbol })
                result = await engine.client!.signedRequest('POST', '/v5/order/create', orderDataNoIdx)
                structuredLog('info', 'Success without positionIdx', { symbol })
                
              } catch (noIdxError) {
                structuredLog('warn', 'Without positionIdx failed', { 
                  symbol, 
                  error: noIdxError.message 
                })
                
                // Strategy 2: Try with positionIdx = 0 (One-Way mode)
                try {
                  orderData.positionIdx = 0
                  structuredLog('info', 'Trying with positionIdx = 0 (One-Way)', { symbol })
                  result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
                  structuredLog('info', 'Success with One-Way mode', { symbol })
                  
                } catch (oneWayError) {
                  structuredLog('warn', 'One-Way mode failed', { 
                    symbol, 
                    error: oneWayError.message 
                  })
                  
                  // Strategy 3: Try with positionIdx = 1 (Hedge mode - Buy side)
                  try {
                    orderData.positionIdx = orderData.side === 'Buy' ? 1 : 2
                    structuredLog('info', 'Trying with Hedge mode', { 
                      symbol, 
                      positionIdx: orderData.positionIdx,
                      side: orderData.side
                    })
                    result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
                    structuredLog('info', 'Success with Hedge mode', { symbol })
                    
                  } catch (hedgeError) {
                    structuredLog('error', 'All position strategies failed', {
                      symbol,
                      originalError: error.message,
                      noIdxError: noIdxError.message,
                      oneWayError: oneWayError.message,
                      hedgeError: hedgeError.message
                    })
                    throw new Error(`Position mode configuration error. Check your Bybit account position mode settings. Try switching between One-Way and Hedge mode in your Bybit account. Original error: ${error.message}`)
                  }
                }
              }
              
            // Case 2: Quantity issues  
            } else if (errorMsg.includes('qty') || errorMsg.includes('quantity') || errorMsg.includes('lot')) {
              
              // Try with minimum allowed quantity
              const minQty = inst.minOrderQty || inst.qtyStep || 0.000001
              const adjustedQty = Math.max(minQty, roundToStep(parseFloat(orderData.qty) * 1.1, inst.qtyStep))
              orderData.qty = String(adjustedQty)
              
              try {
                structuredLog('info', 'Retrying with adjusted quantity', { 
                  symbol,
                  originalQty: parseFloat(orderData.qty),
                  adjustedQty,
                  minQty
                })
                result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
              } catch (qtyError) {
                throw new Error(`Quantity validation failed: ${error.message}. Minimum qty: ${minQty}`)
              }
              
            // Case 3: Balance or margin issues
            } else if (errorMsg.includes('balance') || errorMsg.includes('margin') || errorMsg.includes('insufficient')) {
              throw new Error('Insufficient balance or margin. Please check your Bybit account balance.')
              
            // Case 4: Other errors
            } else {
              throw new Error(`Bybit API error: ${error.message}`)
            }
            
          } else {
            // For spot trading, throw the original error
            throw new Error(`Spot trading error: ${error.message}`)
          }
        }

        structuredLog('info', 'Final order execution successful', { 
          symbol, 
          side: orderData.side, 
          qty: orderData.qty, 
          category: inst.category, 
          positionIdx: orderData.positionIdx,
          orderId: result?.result?.orderId,
          markPrice: price,
          notionalValue: parseFloat(orderData.qty) * price
        });

        return json({
          success: true,
          data: result
        });
      } catch (error) {
        structuredLog('error', 'Trade execution failed', { 
          error: error.message, 
          symbol, 
          side, 
          amountUSD, 
          leverage 
        });
        // Send alert for failed trades
        await sendAlert({
          type: 'error',
          title: 'Trade Execution Failed',
          message: `Failed to execute ${side} order for ${symbol}: ${error.message}`,
          metadata: {
            symbol,
            side,
            amountUSD,
            leverage,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        })

        return json({
          success: false,
          message: error.message,
          error_code: 'TRADE_EXECUTION_FAILED',
          details: {
            symbol,
            side,
            amountUSD,
            leverage,
            timestamp: new Date().toISOString()
          }
        }, 500);
      }
    }

    // Unknown action
    return json({
      success: false,
      message: `Unknown action: ${action}. Supported actions: status, place_order, signal`,
      available_actions: ['status', 'place_order', 'signal']
    }, 400);

  } catch (error) {
    structuredLog('error', 'Execution error', { error: error.message });
    
    return json({
      success: false,
      message: error.message || 'Internal server error'
    }, 500);
  }
});