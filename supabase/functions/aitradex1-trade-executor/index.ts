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

// Simple logging utility
const log = (message: string, data?: any) => {
  console.log(message, data || '');
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

  async getAccountInfo(): Promise<any> {
    return await this.signedRequest('GET', '/v5/account/info', {})
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

    // Validate signal
    if (!isSymbolAllowed(signal.symbol)) {
      throw new Error(`Symbol ${signal.symbol} not whitelisted`)
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

    // For linear contracts, add position index
    if (inst.category === 'linear') {
      orderData.positionIdx = 0  // Use one-way mode
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
      console.error('Failed to log execution:', error.message)
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
    
    console.log('Trade executor called:', { action, symbol, side, amountUSD, leverage });

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

      console.log('Trade execution request:', {
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

        // For linear contracts, handle position mode with fallback logic
        if (inst.category === 'linear') {
          orderData.positionIdx = 0  // Default to one-way mode
          orderData.reduceOnly = false
          console.log(`Initial position config for ${symbol}: positionIdx=0 (OneWay), side=${side}`);
        }

        // Execute order with position mode fallback
        let result;
        try {
          console.log(`Attempting order execution for ${symbol}:`, orderData);
          result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
          console.log(`✅ Order executed successfully on first attempt for ${symbol}`);
        } catch (error) {
          console.log(`❌ First attempt failed for ${symbol}: ${error.message}`);
          
          // If position mode error, try hedge mode for linear contracts
          if (inst.category === 'linear' && error.message?.includes('position')) {
            console.log(`🔄 Retrying ${symbol} with hedge mode position index...`);
            
            // Try hedge mode: positionIdx 1 for Buy, 2 for Sell
            orderData.positionIdx = side === 'Buy' ? 1 : 2;
            console.log(`Hedge mode attempt: positionIdx=${orderData.positionIdx} for ${side} order`);
            
            try {
              result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
              console.log(`✅ Order executed successfully with hedge mode positionIdx=${orderData.positionIdx}`);
            } catch (secondError) {
              console.log(`❌ Hedge mode also failed for ${symbol}: ${secondError.message}`);
              
              // If hedge mode also fails, try the opposite hedge position
              const fallbackIdx = side === 'Buy' ? 2 : 1;
              orderData.positionIdx = fallbackIdx;
              console.log(`🔄 Final attempt with fallback positionIdx=${fallbackIdx}`);
              
              try {
                result = await engine.client!.signedRequest('POST', '/v5/order/create', orderData)
                console.log(`✅ Order executed successfully with fallback positionIdx=${fallbackIdx}`);
              } catch (finalError) {
                console.log(`💥 All position modes failed for ${symbol}:`, {
                  oneWay: 'position idx not match position mode',
                  hedge1: secondError.message,
                  hedge2: finalError.message
                });
                throw new Error(`All position modes failed. OneWay: position mismatch, Hedge(${side === 'Buy' ? 1 : 2}): ${secondError.message}, Hedge(${fallbackIdx}): ${finalError.message}`);
              }
            }
          } else {
            throw error;
          }
        }
        
        console.log('Order executed successfully:', { 
          symbol, 
          side, 
          qty, 
          category: inst.category,
          orderId: result?.result?.orderId 
        });

        return json({
          success: true,
          data: result
        });
      } catch (error) {
        console.error('Trade execution failed:', { 
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
    console.error('Execution error:', error.message);
    
    return json({
      success: false,
      message: error.message || 'Internal server error'
    }, 500);
  }
});