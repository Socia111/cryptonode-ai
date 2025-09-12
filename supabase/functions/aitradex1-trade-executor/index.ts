import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

class BybitV5Client {
  private baseURL: string
  private apiKey: string
  private apiSecret: string

  constructor(apiKey: string, apiSecret: string) {
    this.baseURL = Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com'
    this.apiKey = apiKey
    this.apiSecret = apiSecret
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
}

// =================== UTILITY FUNCTIONS ===================

// Utility functions for number rounding
function roundToStep(value: number, stepSize: number): number {
  return Math.floor(value / stepSize + 1e-12) * stepSize;
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
  const base = Deno.env.get("BYBIT_BASE") || 'https://api.bybit.com';
  
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
  const base = Deno.env.get("BYBIT_BASE") || 'https://api.bybit.com';
  
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
  // For very small scalping orders, use minimal notional
  const minNotional = Math.max(1, amountUSD); // Absolute minimum $1
  const targetNotional = minNotional * Math.max(1, leverage);
  
  let qty = targetNotional / price;
  qty = roundToStep(qty, inst.qtyStep || 0.000001);

  // For scalping, use minimal exchange requirements
  if (inst.category === "linear" && inst.minOrderValue) {
    const notional = qty * price;
    if (notional < inst.minOrderValue) {
      // For scalping, try to meet minimum but keep it small
      qty = Math.max(qty, roundToStep(inst.minOrderValue / price, inst.qtyStep));
    }
  }

  if (inst.category === "spot") {
    if (inst.minOrderAmt) {
      const notional = qty * price;
      if (notional < inst.minOrderAmt) {
        qty = Math.max(qty, roundToStep(inst.minOrderAmt / price, inst.qtyStep));
      }
    }
    if (inst.minOrderQty && qty < inst.minOrderQty) {
      qty = Math.max(qty, roundToStep(inst.minOrderQty, inst.qtyStep));
    }
  }

  // For scalping, cap the qty to avoid balance issues
  const maxScalpQty = 0.1; // Max 0.1 units for scalping
  if (targetNotional <= 25) { // If this looks like a scalp trade
    qty = Math.min(qty, maxScalpQty);
  }

  return { qty, targetNotional };
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

    // Parse request
    const requestBody = await req.json();
    const { action, symbol, side, amountUSD, leverage, scalpMode } = requestBody;
    
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

      // For scalping, use very small minimum order size to avoid balance issues
      const minOrderSize = scalpMode ? 1 : 5  // Scalp: $1 min | Normal: $5 min
      const finalAmountUSD = Math.max(amountUSD, minOrderSize)

      structuredLog('info', 'Trade execution request', {
        symbol,
        side,
        originalAmount: amountUSD,
        finalAmount: finalAmountUSD,
        leverage: leverage || 1
      });

      try {
        // Initialize Bybit client
        const apiKey = Deno.env.get('BYBIT_API_KEY')
        const apiSecret = Deno.env.get('BYBIT_API_SECRET')
        
        if (!apiKey || !apiSecret) {
          throw new Error('Bybit credentials not configured')
        }

        const client = new BybitV5Client(apiKey, apiSecret)

        // Get instrument info and price
        const inst = await getInstrument(symbol);
        const price = await getMarkPrice(symbol);
        
        // Calculate proper quantity - smaller for scalping to avoid balance issues
        const scaledLeverage = isScalping ? Math.min(leverage || 10, 25) : (leverage || 1);
        const { qty } = computeOrderQtyUSD(finalAmountUSD, scaledLeverage, price, inst);
        
        if (!qty || qty <= 0) {
          return json({
            success: false,
            message: `Size calculation failed. Amount: ${finalAmountUSD}, Price: ${price}, Qty: ${qty}`
          }, 400);
        }

        structuredLog('info', 'Order size calculated', {
          finalAmount: finalAmountUSD,
          price,
          qty,
          leverage: scaledLeverage,
          mode: isScalping ? 'scalping' : 'normal'
        })

        // =================== SCALPING VS NORMAL RISK MANAGEMENT ===================
        
        const isScalping = scalpMode === true;
        
        // Micro TP/SL for scalping with better risk-reward
        const stopLossPercent = isScalping ? 0.0015 : 0.02;  // Scalp: 0.15% | Normal: 2%
        const takeProfitPercent = isScalping ? 0.005 : 0.04; // Scalp: 0.5% | Normal: 4%
        // This gives 3.33:1 R:R for scalping (0.5%:0.15%)
        
        let stopLoss: number;
        let takeProfit: number;
        
        if (side === 'Buy') {
          stopLoss = price * (1 - stopLossPercent); // 2% below entry
          takeProfit = price * (1 + takeProfitPercent); // 4% above entry
        } else {
          stopLoss = price * (1 + stopLossPercent); // 2% above entry for short
          takeProfit = price * (1 - takeProfitPercent); // 4% below entry for short
        }
        
        // Round prices to tick size
        stopLoss = roundToStep(stopLoss, inst.tickSize);
        takeProfit = roundToStep(takeProfit, inst.tickSize);
        
        structuredLog('info', 'Risk management prices calculated', {
          entryPrice: price,
          stopLoss,
          takeProfit,
          mode: isScalping ? 'scalping' : 'normal',
          stopLossPercent: ((side === 'Buy' ? price - stopLoss : stopLoss - price) / price * 100).toFixed(3) + '%',
          takeProfitPercent: ((side === 'Buy' ? takeProfit - price : price - takeProfit) / price * 100).toFixed(3) + '%'
        });

        // =================== MARKET ENTRY ORDER (NO TP/SL YET) ===================
        // Create clean market order without TP/SL (Bybit doesn't support TP/SL in market orders)
        const orderData: any = {
          category: inst.category,
          symbol,
          side: side === 'Buy' ? 'Buy' : 'Sell',
          orderType: 'Market',
          qty: String(qty),
          timeInForce: 'IOC'
          // NOTE: TP/SL will be set as separate conditional orders after position opens
        }

        // For linear contracts, always open new positions (not reduce-only)
        if (inst.category === 'linear') {
          structuredLog('info', 'Setting up linear contract order', {
            symbol,
            category: inst.category,
            side: orderData.side
          })
          
          // Force new position, not reduce-only
          orderData.reduceOnly = false
          
          // Important: Remove any position constraints to let API handle mode
          // This avoids "position idx not match position mode" errors
        }

        // Execute the order with comprehensive fallback logic
        let result;
        
        // Try different approaches in order of likelihood to succeed
        const attemptOrder = async (approach: string, orderConfig: any) => {
          structuredLog('info', `Attempting order with ${approach}`, orderConfig)
          return await client.signedRequest('POST', '/v5/order/create', orderConfig)
        }
        
        try {
          // Attempt 1: Clean order without position constraints (most likely to work)
          const cleanOrder = { ...orderData }
          delete cleanOrder.positionIdx // Remove any position index
          result = await attemptOrder('clean order (no position idx)', cleanOrder)
        } catch (error1) {
          try {
            // Attempt 2: With positionIdx = 0 (OneWay mode)
            const orderOneWay = { ...orderData, positionIdx: 0 }
            result = await attemptOrder('OneWay mode (0)', orderOneWay)
          } catch (error2) {
            try {
              // Attempt 3: With positionIdx = 1 (Buy hedge mode)
              const orderHedgeBuy = { ...orderData, positionIdx: 1 }
              result = await attemptOrder('Hedge Buy mode (1)', orderHedgeBuy)
            } catch (error3) {
              try {
                // Attempt 4: With positionIdx = 2 (Sell hedge mode)
                const orderHedgeSell = { ...orderData, positionIdx: 2 }
                result = await attemptOrder('Hedge Sell mode (2)', orderHedgeSell)
              } catch (error4) {
                // Log all failures for debugging
                structuredLog('error', 'All order attempts failed', {
                  cleanOrder: error1.message,
                  oneWayMode: error2.message,
                  hedgeBuyMode: error3.message,
                  hedgeSellMode: error4.message
                })
                throw new Error(`Order failed after all attempts. Last error: ${error4.message}`)
              }
            }
          }
        }

        structuredLog('info', 'Main order executed successfully', { 
          symbol, 
          side, 
          qty, 
          category: inst.category, 
          orderId: result?.result?.orderId 
        });

        // =================== AUTOMATIC TP/SL PLACEMENT ===================
        // Place stop loss and take profit as separate conditional orders
        let slOrderId = null;
        let tpOrderId = null;
        
        try {
          // Wait a moment for position to be established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Place Stop Loss Order (Conditional Order)
          const stopLossOrder = {
            category: inst.category,
            symbol,
            side: side === 'Buy' ? 'Sell' : 'Buy', // Opposite side to close position
            orderType: 'Market', // Market order when triggered
            qty: String(qty),
            triggerPrice: String(stopLoss),
            triggerBy: 'LastPrice',
            reduceOnly: true, // This is correct for closing orders
            timeInForce: 'IOC'
          };
          
          const slResult = await client.signedRequest('POST', '/v5/order/create', stopLossOrder);
          slOrderId = slResult?.result?.orderId;
          
          structuredLog('info', 'Stop loss order placed', {
            orderId: slOrderId,
            triggerPrice: stopLoss,
            side: stopLossOrder.side
          });
          
          // Place Take Profit Order (Conditional Order)
          const takeProfitOrder = {
            category: inst.category,
            symbol,
            side: side === 'Buy' ? 'Sell' : 'Buy', // Opposite side to close position
            orderType: 'Market', // Market order when triggered
            qty: String(qty),
            triggerPrice: String(takeProfit),
            triggerBy: 'LastPrice',
            reduceOnly: true, // This is correct for closing orders
            timeInForce: 'IOC'
          };
          
          const tpResult = await client.signedRequest('POST', '/v5/order/create', takeProfitOrder);
          tpOrderId = tpResult?.result?.orderId;
          
          structuredLog('info', 'Take profit order placed', {
            orderId: tpOrderId,
            triggerPrice: takeProfit,
            side: takeProfitOrder.side
          });
          
        } catch (tpslError: any) {
          structuredLog('warning', 'TP/SL placement failed', {
            error: tpslError.message,
            mainOrderSuccess: true
          });
          // Don't fail the main trade if TP/SL fails - the main order succeeded
        }

        return json({
          success: true,
          data: {
            mainOrder: result,
            stopLossOrderId: slOrderId,
            takeProfitOrderId: tpOrderId,
            riskManagement: {
              entryPrice: price,
              stopLoss,
              takeProfit,
              riskRewardRatio: '2:1'
            }
          }
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