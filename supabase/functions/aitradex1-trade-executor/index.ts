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

// Enhanced order quantity calculation with scalping support
function computeOrderQtyUSD(
  amountUSD: number, 
  leverage: number, 
  price: number, 
  inst: Instrument,
  isScalping = false
) {
  // Calculate total exposure: amountUSD * leverage (e.g., $1 * 5x = $5 exposure)
  const targetNotional = amountUSD * leverage;
  let qty = targetNotional / price;
  
  // Round to tick size
  qty = roundToStep(qty, inst.qtyStep || 0.000001);
  
  // Handle minimum quantity with special scalping logic
  if (isScalping) {
    // For scalping, try to use smaller quantities if possible
    const minScalpQty = Math.max(inst.minOrderQty || 0.001, 0.001);
    qty = Math.max(qty, minScalpQty);
    // Cap scalping orders to prevent balance issues - based on total exposure
    if (targetNotional <= 25) {
      qty = Math.min(qty, 0.05); // Smaller cap for micro trades
    }
  } else {
    // Normal minimum enforcement
    qty = Math.max(qty, inst.minOrderQty || 0.001);
  }
  
  // For linear contracts, check minimum order value
  if (inst.category === "linear" && inst.minOrderValue) {
    const calculatedNotional = qty * price;
    if (calculatedNotional < inst.minOrderValue && !isScalping) {
      // For normal trades, ensure minimum value is met
      qty = Math.max(qty, roundToStep(inst.minOrderValue / price, inst.qtyStep || 0.000001));
    }
  }

  // For spot trading, handle minimum order amount
  if (inst.category === "spot") {
    if (inst.minOrderAmt) {
      const spotNotional = qty * price;
      if (spotNotional < inst.minOrderAmt) {
        qty = Math.max(qty, roundToStep(inst.minOrderAmt / price, inst.qtyStep));
      }
    }
    if (inst.minOrderQty && qty < inst.minOrderQty) {
      qty = Math.max(qty, roundToStep(inst.minOrderQty, inst.qtyStep));
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

      try {
        // Get user from JWT token
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        // Create Supabase client 
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.56.0')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Get user from auth token
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
          return json({ success: false, error: 'No authorization header' }, 401)
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (userError || !user) {
          structuredLog('error', 'Invalid auth token', { error: userError?.message })
          return json({ success: false, error: 'Invalid authentication token' }, 401)
        }
        
        // Get user's trading account
        const { data: account, error: accountError } = await supabase
          .from('user_trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('exchange', 'bybit')
          .eq('is_active', true)
          .maybeSingle()
        
        if (accountError || !account) {
          // Enhanced logging for debugging
          structuredLog('error', 'No trading account found', { 
            userId: user.id,
            userEmail: user.email,
            error: accountError?.message,
            errorCode: accountError?.code
          });
          
          // Check if there are any accounts at all for this user
          const { data: allAccounts } = await supabase
            .from('user_trading_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('exchange', 'bybit');
          
          structuredLog('debug', 'All user accounts', {
            userId: user.id,
            totalAccounts: allAccounts?.length || 0,
            accounts: allAccounts?.map(acc => ({
              id: acc.id,
              active: acc.is_active,
              hasKey: !!acc.api_key_encrypted,
              hasSecret: !!acc.api_secret_encrypted,
              accountType: acc.account_type
            }))
          });
          
          // Try to auto-create a trading account if none exists
          if (!allAccounts || allAccounts.length === 0) {
            structuredLog('info', 'Auto-creating trading account for user', { userId: user.id });
            
            try {
              // Try to get real credentials from environment first
              const realApiKey = Deno.env.get('BYBIT_API_KEY');
              const realApiSecret = Deno.env.get('BYBIT_API_SECRET');
              
              const useRealCredentials = realApiKey && realApiSecret && 
                                       realApiKey.length > 10 && 
                                       realApiSecret.length > 10 &&
                                       !realApiKey.startsWith('placeholder');
              
              const credentials = useRealCredentials 
                ? { key: realApiKey, secret: realApiSecret }
                : { key: 'placeholder_key_' + Date.now(), secret: 'placeholder_secret_' + Date.now() };
              
              const { data: newAccountId, error: createError } = await supabase.rpc(
                'restore_user_trading_account',
                {
                  p_user_id: user.id,
                  p_api_key: credentials.key,
                  p_api_secret: credentials.secret,
                  p_account_type: 'testnet'
                }
              );
              
              if (createError) {
                structuredLog('error', 'Failed to auto-create trading account', { 
                  userId: user.id,
                  error: createError.message 
                });
              } else {
                structuredLog('info', 'Auto-created trading account', { 
                  userId: user.id,
                  accountId: newAccountId,
                  hasRealCredentials: useRealCredentials
                });
                
                // If we don't have real credentials, ask user to configure them
                if (!useRealCredentials) {
                  return json({
                    success: false,
                    error: 'Trading account created but API credentials needed',
                    message: 'A trading account has been created for you. Please configure your Bybit API credentials in settings.',
                    needsCredentials: true,
                    accountId: newAccountId
                  }, 201);
                }
                
                // Try to get the account and continue
                const { data: newAccount, error: getAccountError } = await supabase
                  .from('user_trading_accounts')
                  .select('*')
                  .eq('id', newAccountId)
                  .maybeSingle();
                  
                if (!getAccountError && newAccount) {
                  // Store account for use in trading - use let instead of const
                  let account = newAccount;
                  structuredLog('info', 'Using newly created account with real credentials', { 
                    accountId: newAccountId 
                  });
                  
                  // Continue with trade execution
                  return await executeTradeWithAccount(account, symbol, side, finalAmountUSD, leverage || 1, scalpMode);
                } else {
                  structuredLog('error', 'Failed to retrieve created account', {
                    newAccountId,
                    getAccountError: getAccountError?.message
                  });
                  return json({
                    success: false,
                    error: 'Failed to retrieve created account',
                    message: 'Account was created but could not be retrieved'
                  }, 500);
                }
              }
            } catch (createError) {
              structuredLog('error', 'Exception during auto-create', { 
                userId: user.id,
                error: createError 
              });
            }
          } else {
            // User has accounts but none are active or properly configured
            const inactiveAccount = allAccounts[0];
            
            // Check if we can upgrade the account with real credentials
            const realApiKey = Deno.env.get('BYBIT_API_KEY');
            const realApiSecret = Deno.env.get('BYBIT_API_SECRET');
            
            if (realApiKey && realApiSecret && realApiKey.length > 10 && realApiSecret.length > 10 &&
                (inactiveAccount.api_key_encrypted.startsWith('placeholder_') || 
                 inactiveAccount.api_key_encrypted.startsWith('test_key_'))) {
              
              // Update with real credentials
              const { data: updatedAccount, error: updateError } = await supabase
                .from('user_trading_accounts')
                .update({
                  api_key_encrypted: realApiKey,
                  api_secret_encrypted: realApiSecret,
                  is_active: true,
                  last_used_at: new Date().toISOString()
                })
                .eq('id', inactiveAccount.id)
                .select()
                .single();
                
              if (!updateError && updatedAccount) {
                let account = updatedAccount;
                structuredLog('info', 'Updated existing account with real credentials', { 
                  accountId: inactiveAccount.id 
                });
                
                // Continue with trade execution
                return await executeTradeWithAccount(account, symbol, side, finalAmountUSD, leverage || 1, scalpMode);
              }
            }
          }
          
          // If we still don't have a working account, return error
          if (!account) {
            const errorMsg = accountError?.code === 'PGRST116' 
              ? 'No active Bybit trading account found. Please connect and activate your Bybit account first.'
              : 'No Bybit trading account configured for this user. Please connect your Bybit account first.';
            
            return json({
              success: false,
              error: errorMsg,
              debug: {
                totalAccounts: allAccounts?.length || 0,
                hasAnyAccount: (allAccounts?.length || 0) > 0
              }
            }, 400);
          }
        }

        // Determine minimum order size based on account type and mode
        const isTestnet = account.account_type === 'testnet';
        const minOrderSize = scalpMode ? (isTestnet ? 0.1 : 1) : (isTestnet ? 1 : 5);  // Testnet: much smaller minimums
        const finalAmountUSD = Math.max(amountUSD || minOrderSize, minOrderSize)

        structuredLog('info', 'Trade execution request', {
          symbol,
          side,
          originalAmount: amountUSD,
          finalAmount: finalAmountUSD,
          leverage: leverage || 1
        });

        // If we reach here, we have a valid account - continue with execution
        if (account) {
          return await executeTradeWithAccount(account, symbol, side, finalAmountUSD, leverage || 1, scalpMode);
        }
      } catch (e: any) {
        structuredLog('error', 'Trade execution error', { error: e.message });
        return json({ success: false, error: e.message }, 500);
      }
    }

    return json({ success: false, error: 'Unknown action' }, 400);

  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
});

// Separate function to handle trade execution with account
async function executeTradeWithAccount(account: any, symbol: string, side: string, amountUSD: number, leverage: number, scalpMode: boolean = false) {
  try {
    // Check if account has valid credentials
    const apiKey = account.api_key_encrypted
    const apiSecret = account.api_secret_encrypted
        
    // If account has placeholder credentials, try to update with real ones
    if (apiKey.startsWith('placeholder_') || apiKey.startsWith('test_key_')) {
      const realApiKey = Deno.env.get('BYBIT_API_KEY');
      const realApiSecret = Deno.env.get('BYBIT_API_SECRET');
      
      if (realApiKey && realApiSecret && realApiKey.length > 10 && realApiSecret.length > 10) {
        // Update account with real credentials via Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.56.0')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        const { data: updatedAccount, error: updateError } = await supabase
          .from('user_trading_accounts')
          .update({
            api_key_encrypted: realApiKey,
            api_secret_encrypted: realApiSecret,
            last_used_at: new Date().toISOString()
          })
          .eq('id', account.id)
          .select()
          .maybeSingle();
          
        if (!updateError && updatedAccount) {
          account = updatedAccount;
          structuredLog('info', 'Updated account with real credentials from environment');
        }
      } else {
        return json({
          success: false,
          error: 'Trading account created but API credentials needed',
          message: 'A trading account has been created for you. Please configure your Bybit API credentials in settings.',
          needsCredentials: true,
          accountId: account.id
        }, 201);
      }
    }
    
    if (!account.api_key_encrypted || !account.api_secret_encrypted) {
      structuredLog('error', 'Missing stored credentials', {
        hasApiKey: !!account.api_key_encrypted,
        hasApiSecret: !!account.api_secret_encrypted
      });
      return json({
        success: false,
        error: 'API credentials not found in your account. Please reconnect your Bybit account.'
      }, 400);
    }

        const client = new BybitV5Client(account.api_key_encrypted, account.api_secret_encrypted)

        // Get instrument info and price
        const inst = await getInstrument(symbol);
        const price = await getMarkPrice(symbol);
        
        // =================== SCALPING VS NORMAL RISK MANAGEMENT ===================
        
        const isScalping = scalpMode === true;
        
        // Calculate proper quantity with scalping support
        const scaledLeverage = isScalping ? Math.min(Number(leverage) || 10, 25) : (Number(leverage) || 1);
        const { qty } = computeOrderQtyUSD(finalAmountUSD, scaledLeverage, price, inst, isScalping);
        
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
        
        // Get account position mode first
        let positionMode = 0; // Default to OneWay
        try {
          const positionInfo = await client.signedRequest('GET', '/v5/position/list', {
            category: inst.category,
            symbol
          });
          structuredLog('info', 'Position mode check', { positionInfo: positionInfo?.result });
        } catch (posError: any) {
          structuredLog('warning', 'Could not check position mode', { error: posError.message });
        }
        
        // Enhanced order placement with balance checks and smaller amounts
        let orderResult = null;
        let lastError = null;
        
        // Start with smaller quantity for insufficient balance cases
        let adjustedQty = qty;
        if (lastError?.message?.includes('ab not enough')) {
          adjustedQty = Math.max(qty * 0.1, inst.minOrderQty || 0.001); // Try 10% of original
          structuredLog('info', 'Adjusting quantity for balance', { 
            originalQty: qty, 
            adjustedQty,
            reason: 'insufficient_balance'
          });
        }
        
        const baseOrder = {
          category: inst.category,
          symbol,
          side: side === 'Buy' ? 'Buy' : 'Sell',
          orderType: 'Market',
          qty: String(adjustedQty),
          timeInForce: 'IOC'
        };
        
        // Try clean order first (recommended approach)
        structuredLog('info', { event: 'Attempting clean order (no position idx)' });
        try {
          orderResult = await client.signedRequest('POST', '/v5/order/create', baseOrder);
          
          if (orderResult?.retCode === 0) {
            structuredLog('info', { event: 'Order placed successfully', orderId: orderResult.result?.orderId });
          } else {
            throw new Error(orderResult?.retMsg || 'Clean order failed');
          }
        } catch (cleanError: any) {
          lastError = cleanError;
          structuredLog('warning', { event: 'Clean order failed, trying with position modes', error: cleanError.message });
          
          // If insufficient balance, try with even smaller amount
          if (cleanError.message.includes('ab not enough') && adjustedQty > inst.minOrderQty) {
            adjustedQty = inst.minOrderQty || 0.001;
            baseOrder.qty = String(adjustedQty);
            structuredLog('info', 'Further reducing quantity', { 
              newQty: adjustedQty,
              reason: 'balance_insufficient'
            });
          }
          
          // Try OneWay mode (positionIdx=0)
          structuredLog('info', { event: 'Attempting order with OneWay mode (0)' });
          try {
            orderResult = await client.signedRequest('POST', '/v5/order/create', {
              ...baseOrder,
              positionIdx: 0
            });
            
            if (orderResult?.retCode === 0) {
              structuredLog('info', { event: 'OneWay order successful', orderId: orderResult.result?.orderId });
            } else {
              throw new Error(orderResult?.retMsg || 'OneWay order failed');
            }
          } catch (oneWayError: any) {
            lastError = oneWayError;
            structuredLog('warning', { event: 'OneWay mode failed, trying hedge modes', error: oneWayError.message });
            
            // Try Hedge Buy mode (positionIdx=1)
            structuredLog('info', { event: 'Attempting order with Hedge Buy mode (1)' });
            try {
              orderResult = await client.signedRequest('POST', '/v5/order/create', {
                ...baseOrder,
                positionIdx: 1
              });
              
              if (orderResult?.retCode === 0) {
                structuredLog('info', { event: 'Hedge Buy order successful', orderId: orderResult.result?.orderId });
              } else {
                throw new Error(orderResult?.retMsg || 'Hedge Buy order failed');
              }
            } catch (hedgeBuyError: any) {
              lastError = hedgeBuyError;
              
              // Try Hedge Sell mode (positionIdx=2)
              structuredLog('info', { event: 'Attempting order with Hedge Sell mode (2)' });
              try {
                orderResult = await client.signedRequest('POST', '/v5/order/create', {
                  ...baseOrder,
                  positionIdx: 2
                });
                
                if (orderResult?.retCode === 0) {
                  structuredLog('info', { event: 'Hedge Sell order successful', orderId: orderResult.result?.orderId });
                } else {
                  throw new Error(orderResult?.retMsg || 'Hedge Sell order failed');
                }
              } catch (hedgeSellError: any) {
                structuredLog('error', { 
                  event: 'All order placement attempts failed',
                  finalError: hedgeSellError.message,
                  qty: qty.toString(),
                  symbol,
                  side,
                  amountUSD: finalAmountUSD,
                  leverage: scaledLeverage,
                  isScalping
                });
                
                return json({ 
                  success: false, 
                  error: `Order placement failed: ${hedgeSellError.message}. Please check your account balance and try a smaller amount.` 
                }, 400);
              }
            }
          }
        }
        
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
          amountUSD, 
          leverage 
        });
        return json({
          success: false,
          error: error.message || 'Trade execution failed',
          details: error.stack || 'No additional details'
        }, 500);
      }
  } catch (error: any) {
    structuredLog('error', 'executeTradeWithAccount failed', { error: error.message });
    return json({
      success: false,
      error: error.message || 'Trade execution failed'
    }, 500);
  }
}

// Handle CORS preflight requests
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

try {
  const body = await req.json();
  const { action } = body;

  structuredLog('info', 'Trade executor request', { action, body });

  if (action === 'status') {
    return json({
      status: 'operational',
      trading_enabled: true,
      allowed_symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'place_order') {
    return await executeTradeWithAccount(body);
  }

  return json({ error: 'Invalid action' }, 400);

} catch (error: any) {
  structuredLog('error', 'Handler failed', { error: error.message });
  return json({
    error: 'Internal server error',
    message: error.message || 'Internal server error'
  }, 500);
}
});