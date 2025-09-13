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
    // Use testnet for safety during development/testing
    const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true' || true; // Force testnet for now
    this.baseURL = isTestnet 
      ? 'https://api-testnet.bybit.com' 
      : (Deno.env.get('BYBIT_BASE') || 'https://api.bybit.com');
    
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    
    console.log(`🌐 Bybit Client initialized: ${isTestnet ? 'TESTNET' : 'MAINNET'} (${this.baseURL})`);
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

// Enhanced order quantity calculation with higher minimums
function computeOrderQtyUSD(
  amountUSD: number, 
  leverage: number, 
  price: number, 
  inst: Instrument,
  isScalping = false
) {
  // Calculate total exposure: amountUSD * leverage (e.g., $25 * 25x = $625 exposure)
  const targetNotional = amountUSD * leverage;
  let qty = targetNotional / price;
  
  // Round to step size first
  qty = roundToStep(qty, inst.qtyStep || 0.000001);
  
  // Enforce higher minimums to avoid "Qty is smaller amount" errors
  const baseMinQty = inst.minOrderQty || 0.001;
  
  // Calculate minimum quantity based on minimum order value (typically $5-10 USDT)
  let minRequiredQty = baseMinQty;
  if (inst.category === "linear" && inst.minOrderValue) {
    minRequiredQty = Math.max(minRequiredQty, inst.minOrderValue / price);
  }
  
  // For spot trading, enforce minimum order amount
  if (inst.category === "spot" && inst.minOrderAmt) {
    minRequiredQty = Math.max(minRequiredQty, inst.minOrderAmt / price);
  }
  
  // Apply minimum quantity requirements
  qty = Math.max(qty, minRequiredQty);
  
  // Round again after applying minimums
  qty = roundToStep(qty, inst.qtyStep || 0.000001);
  
  // For scalping, ensure we meet minimum notional requirements
  if (isScalping) {
    const actualNotional = qty * price;
    const minNotional = inst.minOrderValue || inst.minOrderAmt || 5; // Minimum $5 USD
    if (actualNotional < minNotional) {
      qty = roundToStep(minNotional / price, inst.qtyStep || 0.000001);
    }
  }

  console.log('💰 Quantity calculation:', {
    amountUSD,
    leverage,
    price,
    targetNotional,
    calculatedQty: qty,
    minOrderQty: inst.minOrderQty,
    qtyStep: inst.qtyStep,
    isScalping
  });

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
    const { action, symbol, side, amountUSD, leverage, scalpMode, orderType } = requestBody;
    
    structuredLog('info', 'Trade executor called', { action, symbol, side, amountUSD, leverage });

    // Handle status requests
    if (action === 'status') {
      const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true' || true;
      const isPaperMode = Deno.env.get('PAPER_TRADING') === 'true';
      
      return json({
        ok: true,
        status: 'operational',
        trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
        environment: isTestnet ? 'testnet' : 'mainnet',
        paper_mode: isPaperMode,
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

      // Use smaller amounts for testnet to avoid balance issues
      const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true' || true; // Force testnet for now
      const scalpMode = (req.url.includes('scalpMode=true') || orderType === 'scalp');
      const minOrderSize = isTestnet 
        ? (scalpMode ? 1 : 5)   // Testnet: $1 scalp, $5 normal
        : (scalpMode ? 10 : 25) // Mainnet: $10 scalp, $25 normal
      const finalAmountUSD = Math.max(amountUSD || minOrderSize, minOrderSize);

      structuredLog('info', 'Trade execution request', {
        symbol,
        side,
        originalAmount: amountUSD,
        finalAmount: finalAmountUSD,
        leverage: leverage || 1
      });

      try {
        // Check if paper trading mode is enabled
        const isPaperMode = Deno.env.get('PAPER_TRADING') === 'true';
        
        if (isPaperMode) {
          structuredLog('info', 'Paper trading mode - simulating trade execution', {
            symbol,
            side,
            finalAmount: finalAmountUSD,
            leverage: 25
          });
          
          // Simulate successful trade execution
          const simulatedOrderId = 'PAPER_' + Date.now();
          const simulatedPrice = Math.random() * 100 + 50; // Random price for demo
          
          return json({
            success: true,
            data: {
              orderId: simulatedOrderId,
              symbol,
              side,
              qty: (finalAmountUSD * 25 / simulatedPrice).toFixed(6),
              price: simulatedPrice,
              amount: finalAmountUSD,
              leverage: 25,
              status: 'FILLED',
              paperMode: true,
              message: 'Paper trade executed successfully - no real money involved'
            }
          });
        }

        // Initialize Bybit client for real trading
        const apiKey = Deno.env.get('BYBIT_API_KEY')
        const apiSecret = Deno.env.get('BYBIT_API_SECRET')
        
        if (!apiKey || !apiSecret) {
          structuredLog('error', 'Missing Bybit credentials', {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret
          });
          return json({
            success: false,
            error: 'Bybit API credentials not configured. Please set BYBIT_API_KEY and BYBIT_API_SECRET in edge function secrets.'
          }, 400);
        }

        const client = new BybitV5Client(apiKey, apiSecret)

        // STEP 1: Check account balance before placing orders
        // Initialize variables at the start to ensure they're always defined
        let scaledLeverage = Number(leverage) || 25; // Default to 25x leverage
        let isScalping = false;
        let qty = 0;
        let inst: any = null;
        let price = 0;
        
        try {
          structuredLog('info', 'Checking account balance before trade execution', { symbol });
          const balanceResponse = await client.signedRequest('GET', '/v5/account/wallet-balance', {
            accountType: 'UNIFIED'
          });
          
          if (balanceResponse?.result?.list?.[0]) {
            const account = balanceResponse.result.list[0];
            const usdtCoin = account.coin?.find((c: any) => c.coin === 'USDT');
            const availableBalance = parseFloat(usdtCoin?.availableToWithdraw || '0');
            
            structuredLog('info', 'Account balance check', {
              totalBalance: usdtCoin?.walletBalance || '0',
              availableBalance,
              requiredForTrade: finalAmountUSD,
              hasSufficientBalance: availableBalance >= finalAmountUSD
            });
            
            // Check if we have sufficient balance
            if (availableBalance < finalAmountUSD) {
              return json({
                success: false,
                error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Required: $${finalAmountUSD}. Please add funds to your account or reduce the trade amount.`,
                details: { availableBalance, requiredAmount: finalAmountUSD }
              }, 400);
            }
          }
        } catch (balanceError: any) {
          structuredLog('warning', 'Balance check failed, proceeding anyway', { 
            error: balanceError.message 
          });
        }

        // STEP 2: Check and set position mode to One-Way (safer for new positions)
        if (inst.category === 'linear') {
          try {
            structuredLog('info', 'Setting position mode to One-Way for safe trading', { symbol });
            await client.signedRequest('POST', '/v5/position/switch-mode', {
              category: 'linear',
              coin: symbol.replace('USDT', ''), // Extract base coin (e.g., BTC from BTCUSDT)
              mode: 0 // 0 = One-Way mode (safer for new positions)
            });
            structuredLog('info', 'Position mode set to One-Way successfully', { symbol });
          } catch (modeError: any) {
            // Mode setting may fail if already in correct mode, continue anyway
            structuredLog('warning', 'Position mode setting failed (may already be correct)', { 
              symbol, 
              error: modeError.message 
            });
          }
        }

        // Get instrument info and price
        inst = await getInstrument(symbol);
        price = await getMarkPrice(symbol);
        
        // =================== SCALPING VS NORMAL RISK MANAGEMENT ===================
        
        isScalping = scalpMode === true;
        
        // Calculate proper quantity using already initialized scaledLeverage
        scaledLeverage = Number(leverage) || scaledLeverage; // Update if provided, keep default otherwise
        const result = computeOrderQtyUSD(finalAmountUSD, scaledLeverage, price, inst, isScalping);
        qty = result.qty;
        
        // Enhanced validation with better error messages
        if (qty <= 0) {
          structuredLog('error', { 
            event: 'Invalid quantity calculated', 
            qty, 
            amountUSD: finalAmountUSD, 
            leverage: scaledLeverage, 
            price,
            isScalping 
          });
          return json({ success: false, error: `Invalid quantity calculated: ${qty}. Try increasing amount or adjusting leverage.` }, 400);
        }
        
        if (qty < inst.minOrderQty && !isScalping) {
          structuredLog('error', { 
            event: 'Quantity below minimum', 
            qty, 
            minOrderQty: inst.minOrderQty,
            isScalping 
          });
          return json({ success: false, error: `Quantity ${qty} below minimum ${inst.minOrderQty}. Increase your trade amount to at least $${Math.ceil((inst.minOrderQty * price) / scaledLeverage)}.` }, 400);
        }

        structuredLog('info', 'Order size calculated', {
          finalAmount: finalAmountUSD,
          price,
          qty,
          leverage: scaledLeverage,
          mode: isScalping ? 'scalping' : 'normal'
        })
        
        // TP/SL percentages aligned with ROLL strategy
        const stopLossPercent = isScalping ? 0.0015 : 0.03;  // Scalp: 0.15% | Normal: 3%
        const takeProfitPercent = isScalping ? 0.005 : 0.06; // Scalp: 0.5% | Normal: 6%
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
          timeInForce: 'IOC',
          reduceOnly: false  // CRITICAL: Always false for new positions
        }

        // For linear contracts, always ensure new position mode
        if (inst.category === 'linear') {
          structuredLog('info', 'Setting up linear contract order for new position', {
            symbol,
            category: inst.category,
            side: orderData.side,
            reduceOnly: orderData.reduceOnly
          })
        }

        // Execute the order with comprehensive fallback logic
        let result;
        
        // Try different approaches in order of likelihood to succeed
        const attemptOrder = async (approach: string, orderConfig: any) => {
          structuredLog('info', `Attempting order with ${approach}`, orderConfig)
          return await client.signedRequest('POST', '/v5/order/create', orderConfig)
        }
        
        // Enhanced order placement with better error handling
        let orderResult = null;
        let lastError = null;
        
        const baseOrder = {
          category: inst.category,
          symbol,
          side: side === 'Buy' ? 'Buy' : 'Sell',
          orderType: 'Market',
          qty: String(qty),
          timeInForce: 'IOC',
          reduceOnly: false,  // CRITICAL: Explicitly set to false for new positions
          isLeverage: 0      // Explicitly disable leverage flag to avoid conflicts
        };
        
        // Try clean order first (recommended approach)
        structuredLog('info', 'Attempting clean order with explicit reduceOnly=false', {
          order: { ...baseOrder },
          symbol,
          qty: String(qty),
          side: baseOrder.side
        });
        
        try {
          orderResult = await client.signedRequest('POST', '/v5/order/create', baseOrder);
          
          if (orderResult?.retCode === 0) {
            structuredLog('info', 'Order placed successfully', { 
              orderId: orderResult.result?.orderId,
              symbol,
              side: baseOrder.side,
              qty: String(qty)
            });
          } else {
            throw new Error(orderResult?.retMsg || 'Clean order failed');
          }
        } catch (cleanError: any) {
          lastError = cleanError;
          structuredLog('warning', 'Clean order failed, trying with position modes', { 
            error: cleanError.message,
            symbol,
            side: baseOrder.side
          });
          
          // Try OneWay mode (positionIdx=0) - most compatible
          structuredLog('info', 'Attempting order with OneWay mode (positionIdx=0)');
          try {
            const oneWayOrder = { ...baseOrder, positionIdx: 0 };
            orderResult = await client.signedRequest('POST', '/v5/order/create', oneWayOrder);
            
            if (orderResult?.retCode === 0) {
              structuredLog('info', 'OneWay order successful', { 
                orderId: orderResult.result?.orderId,
                positionIdx: 0
              });
            } else {
              throw new Error(orderResult?.retMsg || 'OneWay order failed');
            }
          } catch (oneWayError: any) {
            lastError = oneWayError;
            structuredLog('warning', 'OneWay mode failed, trying hedge mode for Buy side', { 
              error: oneWayError.message 
            });
            
            // Try Hedge mode with appropriate position index based on side
            const hedgePositionIdx = side === 'Buy' ? 1 : 2; // Buy=1, Sell=2 in hedge mode
            structuredLog('info', `Attempting order with Hedge mode (positionIdx=${hedgePositionIdx})`);
            
            try {
              const hedgeOrder = { ...baseOrder, positionIdx: hedgePositionIdx };
              orderResult = await client.signedRequest('POST', '/v5/order/create', hedgeOrder);
              
              if (orderResult?.retCode === 0) {
                structuredLog('info', `Hedge mode order successful`, { 
                  orderId: orderResult.result?.orderId,
                  positionIdx: hedgePositionIdx,
                  side
                });
              } else {
                throw new Error(orderResult?.retMsg || `Hedge mode order failed`);
              }
            } catch (hedgeError: any) {
              lastError = hedgeError;
              structuredLog('error', 'All order placement attempts failed', {
                finalError: hedgeError.message,
                qty: String(qty),
                symbol,
                side,
                amountUSD: finalAmountUSD,
                leverage: scaledLeverage,
                isScalping
              });
              
              // All attempts failed
              throw new Error(`Order placement failed after all attempts: ${hedgeError.message}`);
            }
          }
        }
        
        // Order execution completed successfully
        result = orderResult;

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
      } catch (error: any) {
        structuredLog('error', 'Trade execution failed', { 
          error: error.message, 
          symbol, 
          side, 
          amountUSD: finalAmountUSD, 
          leverage: scaledLeverage 
        });
        return json({
          success: false,
          error: error.message || 'Trade execution failed',
          details: error.stack || 'No additional details'
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