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

function roundToTick(price: number, tick: string | number): number {
  const tickSize = Number(tick);
  return Math.round(price / tickSize) * tickSize;
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

// Compute proper order quantity with exchange minimums
function computeOrderQtyUSD(
  amountUSD: number, 
  leverage: number, 
  price: number, 
  inst: Instrument
) {
  const targetNotional = Math.max(1, amountUSD) * Math.max(1, leverage);
  
  let qty = targetNotional / price;
  qty = roundToStep(qty, inst.qtyStep || 0.000001);

  // Ensure exchange minimums
  if (inst.category === "linear" && inst.minOrderValue) {
    const notional = qty * price;
    if (notional + 1e-12 < inst.minOrderValue) {
      qty = roundToStep(inst.minOrderValue / price, inst.qtyStep);
    }
  }

  if (inst.category === "spot") {
    if (inst.minOrderAmt) {
      const notional = qty * price;
      if (notional + 1e-12 < inst.minOrderAmt) {
        qty = roundToStep(inst.minOrderAmt / price, inst.qtyStep);
      }
    }
    if (inst.minOrderQty && qty + 1e-12 < inst.minOrderQty) {
      qty = roundToStep(inst.minOrderQty, inst.qtyStep);
    }
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

  // Get account position mode (OneWay vs Hedge)
  async getPositionMode(symbol: string, category: string): Promise<number> {
    try {
      // First, try to get account info to check position mode
      const accountData = await this.signedRequest('GET', '/v5/account/info', {})
      
      // For unified account, we need to check position mode specifically
      if (category === 'linear') {
        // Try to get position info for this symbol to determine mode
        const positionData = await this.signedRequest('GET', '/v5/position/list', {
          category,
          symbol,
          limit: 1
        })
        
        // If we get positions back, use their positionIdx
        if (positionData?.result?.list?.length > 0) {
          const positionIdx = Number(positionData.result.list[0].positionIdx) || 0
          structuredLog('info', 'Found existing position, using its positionIdx', { 
            symbol, 
            positionIdx,
            mode: positionIdx === 0 ? 'OneWay' : 'Hedge'
          })
          return positionIdx
        }
        
        // No existing positions - try both modes to see which works
        // Default to One-Way mode (0) which is most common
        structuredLog('info', 'No existing positions, defaulting to OneWay mode', { symbol })
        return 0
      }
      
      // For spot trading, always return 0 (no position modes)
      return 0
    } catch (error) {
      structuredLog('warn', 'Failed to determine position mode, defaulting to OneWay', { 
        symbol, 
        category,
        error: error.message 
      })
      return 0
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
  private client?: BybitV5Client
  private config?: TradingConfig

  constructor(supabase: any) {
    this.supabase = supabase
  }

  private async initializeClient(): Promise<void> {
    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')
    
    if (!apiKey || !apiSecret) {
      throw new Error('Bybit credentials not configured')
    }

    this.client = new BybitV5Client({
      apiKey,
      apiSecret,
      testnet: false
    })
  }

  async executeSignal(signal: TradingSignal): Promise<any> {
    await this.initializeClient()
    
    if (!this.client) {
      throw new Error('Trading client not initialized')
    }

    // Validate minimum notional
    const minNotional = 1;
    const notional = signal.amountUSD * signal.leverage;
    if (notional < minNotional) {
      throw new Error(`Order notional $${notional.toFixed(2)} < $${minNotional}`);
    }

    // Validate signal
    if (!isSymbolAllowed(signal.symbol)) {
      throw new Error(`Symbol ${signal.symbol} not whitelisted`)
    }

    // Get instrument info and calculate proper size
    const inst = await getInstrument(signal.symbol)
    const price = await getMarkPrice(signal.symbol)
    
    const orderQty = computeOrderQtyUSD(
      signal.amountUSD, 
      signal.leverage, 
      price, 
      inst
    )

    if (!orderQty || orderQty <= 0) {
      throw new Error('Invalid quantity calculation')
    }

    // Extract TP/SL from signal and round to tick size
    const { takeProfit, stopLoss } = signal.prices || {};
    const tickSize = inst.tickSize;
    const roundedTP = takeProfit ? roundToTick(takeProfit, tickSize) : null;
    const roundedSL = stopLoss ? roundToTick(stopLoss, tickSize) : null;
    
    console.log(`🎯 TP/SL: ${roundedTP ? `TP=${roundedTP}` : 'No TP'}, ${roundedSL ? `SL=${roundedSL}` : 'No SL'} (tick=${tickSize})`);

    // For linear contracts, handle position mode and TP/SL
    let positionIdx = 0;
    if (inst.category === 'linear') {
      positionIdx = await this.client.getPositionMode(signal.symbol, inst.category);
    }

    // Build order data with proper TP/SL
    const orderData: any = {
      category: inst.category,
      symbol: signal.symbol,
      side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: String(orderQty),
      timeInForce: 'IOC'
    }

    // Add position-specific fields for linear
    if (inst.category === 'linear') {
      orderData.positionIdx = positionIdx;
      orderData.reduceOnly = false;

      // Add TP/SL if provided - properly formatted for Bybit v5
      if (roundedTP || roundedSL) {
        orderData.tpslMode = positionIdx === 0 ? 'Full' : 'Partial';
        if (roundedTP) {
          orderData.takeProfit = String(roundedTP);
          orderData.tpTriggerBy = 'LastPrice';
        }
        if (roundedSL) {
          orderData.stopLoss = String(roundedSL);
          orderData.slTriggerBy = 'LastPrice';
        }
      }
    }

    try {
      // First attempt with TP/SL inline
      const result = await this.client.signedRequest('POST', '/v5/order/create', orderData);
      
      // Check if TP/SL were actually attached in the response
      const needAttachTpsl = inst.category === 'linear' && 
        (roundedTP || roundedSL) && 
        (!result?.result?.takeProfit || !result?.result?.stopLoss);

      if (needAttachTpsl) {
        console.log('🔄 Order successful but TP/SL missing, setting via position/trading-stop...');
        try {
          const tpslData: any = {
            category: 'linear',
            symbol: signal.symbol,
            positionIdx,
            tpslMode: positionIdx === 0 ? 'Full' : 'Partial'
          };
          
          if (roundedTP) {
            tpslData.takeProfit = String(roundedTP);
            tpslData.tpTriggerBy = 'LastPrice';
          }
          if (roundedSL) {
            tpslData.stopLoss = String(roundedSL);
            tpslData.slTriggerBy = 'LastPrice';
          }
          
          await this.client.signedRequest('POST', '/v5/position/trading-stop', tpslData);
          console.log('✅ TP/SL attached to position successfully');
        } catch (tpslError) {
          console.warn('⚠️ Failed to attach TP/SL to position:', tpslError);
        }
      }
      
      console.log('✅ Order executed successfully:', result);
      
      // Log to database
      await this.logExecution(signal, result, {
        calculatedQty: orderQty,
        instrumentInfo: inst,
        markPrice: price,
        tpslAttached: !needAttachTpsl,
        tpslSetSeparately: needAttachTpsl
      });

      return result;

    } catch (error: any) {
      // Check if TP/SL caused the failure
      if ((roundedTP || roundedSL) && /TP|SL|takeProfit|stopLoss|price/i.test(error.message || '')) {
        console.log('🔄 TP/SL rejected on order create, placing order first then setting TP/SL...');
        
        // Place order without TP/SL
        const noTpslOrder = { ...orderData };
        delete noTpslOrder.takeProfit;
        delete noTpslOrder.stopLoss;
        delete noTpslOrder.tpslMode;
        delete noTpslOrder.tpTriggerBy;
        delete noTpslOrder.slTriggerBy;
        
        const placed = await this.client.signedRequest('POST', '/v5/order/create', noTpslOrder);
        console.log('✅ Order placed without TP/SL:', placed);
        
        // Now set TP/SL on the position
        if (inst.category === 'linear' && (roundedTP || roundedSL)) {
          try {
            const tpslData: any = {
              category: 'linear',
              symbol: signal.symbol,
              positionIdx,
              tpslMode: positionIdx === 0 ? 'Full' : 'Partial'
            };
            
            if (roundedTP) {
              tpslData.takeProfit = String(roundedTP);
              tpslData.tpTriggerBy = 'LastPrice';
            }
            if (roundedSL) {
              tpslData.stopLoss = String(roundedSL);
              tpslData.slTriggerBy = 'LastPrice';
            }
            
            await this.client.signedRequest('POST', '/v5/position/trading-stop', tpslData);
            console.log('✅ TP/SL set on position successfully');
          } catch (tpslError) {
            console.warn('⚠️ Failed to set TP/SL on position:', tpslError);
          }
        }
        
        // Log to database
        await this.logExecution(signal, placed, {
          calculatedQty: orderQty,
          instrumentInfo: inst,
          markPrice: price,
          tpslAttached: false,
          tpslSetSeparately: true
        });

        return placed;
      } else {
        throw error;
      }
    }
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
        
        // Calculate proper quantity
        const { qty } = computeOrderQtyUSD(amountUSD, leverage || 1, price, inst);
        
        if (!qty || qty <= 0) {
          return json({
            success: false,
            message: 'Size calculation failed'
          }, 400);
        }

        // Create order data
        const orderData: any = {
          category: inst.category,
          symbol,
          side: side === 'Buy' ? 'Buy' : 'Sell',
          orderType: 'Market',
          qty: String(qty),
          timeInForce: 'IOC'
        }

        // Initialize trading engine and client once
        const engine = new AutoTradingEngine(supabase);
        await engine.initializeClient();

        // For linear contracts, handle position mode correctly
        if (inst.category === 'linear') {
          // Try to determine the correct position mode
          let positionIdx = 0; // Default to OneWay mode
          
          try {
            // Check if account has any existing positions to determine mode
            const accountInfo = await engine.client!.signedRequest('GET', '/v5/account/info', {})
            structuredLog('info', 'Account info retrieved', { 
              accountType: accountInfo?.result?.accountType || 'unknown'
            })
            
            // For unified accounts, we need to be more careful about position mode
            // Try to get existing positions first
            try {
              const positionData = await engine.client!.signedRequest('GET', '/v5/position/list', {
                category: 'linear',
                symbol,
                limit: 1
              })
              
              if (positionData?.result?.list?.length > 0) {
                positionIdx = Number(positionData.result.list[0].positionIdx) || 0
                structuredLog('info', 'Using positionIdx from existing position', { positionIdx })
              }
            } catch (posError) {
              structuredLog('warn', 'Could not get position info', { error: posError.message })
            }
          } catch (accountError) {
            structuredLog('warn', 'Could not get account info', { error: accountError.message })
          }
          
          orderData.positionIdx = positionIdx
          orderData.reduceOnly = false
          
          structuredLog('info', 'Position configuration set', {
            symbol,
            category: inst.category,
            positionIdx,
            mode: positionIdx === 0 ? 'OneWay' : 'Hedge'
          })
        }

        // Execute the order with retry logic for position mode
        let result;
        let lastError;
        
        // Try the detected position mode first
        try {
          result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
        } catch (error) {
          lastError = error;
          structuredLog('warn', 'First attempt failed, trying alternative position mode', { 
            error: error.message,
            originalPositionIdx: orderData.positionIdx 
          })
          
          // If it's a position mode error and we're in linear category, try the opposite mode
          if (inst.category === 'linear' && error.message?.includes('position')) {
            const alternativeIdx = orderData.positionIdx === 0 ? 1 : 0
            orderData.positionIdx = alternativeIdx
            
            try {
              structuredLog('info', 'Retrying with alternative positionIdx', { 
                symbol,
                newPositionIdx: alternativeIdx
              })
              result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
            } catch (secondError) {
              // If both modes fail, throw the original error
              structuredLog('error', 'Both position modes failed', {
                originalError: error.message,
                secondError: secondError.message
              })
              throw error
            }
          } else {
            throw error
          }
        }

        structuredLog('info', 'Order executed successfully', { 
          symbol, 
          side, 
          qty, 
          category: inst.category, 
          positionIdx: orderData.positionIdx,
          orderId: result?.result?.orderId 
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
        return json({
          success: false,
          message: error.message
        }, 500);
      }
    }

    // Unknown action
    return json({
      success: false,
      message: `Unknown action: ${action}`
    }, 400);

  } catch (error) {
    structuredLog('error', 'Execution error', { error: error.message });
    
    return json({
      success: false,
      message: error.message || 'Internal server error'
    }, 500);
  }
});