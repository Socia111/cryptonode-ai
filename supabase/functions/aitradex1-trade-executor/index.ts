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

  constructor(apiKey: string, apiSecret: string, isTestnet: boolean = true) {
    // Use testnet for development, mainnet for production
    this.baseURL = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    
    structuredLog('info', 'BybitV5Client initialized', { 
      baseURL: this.baseURL, 
      isTestnet,
      keyLength: apiKey?.length || 0 
    });
  }

  private async signRequest(method: string, path: string, params: any = {}): Promise<string> {
    const timestamp = Date.now().toString()
    const paramString = Object.keys(params).length 
      ? JSON.stringify(params)
      : ''
    
    const message = timestamp + this.apiKey + '5000' + paramString

    const encoder = new TextEncoder()
    const keyData = encoder.encode(this.apiSecret)
    const messageData = encoder.encode(message)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')
  }

  async makeRequest(method: string, endpoint: string, params: any = {}) {
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
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(params) : undefined
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Bybit API error: ${data.retMsg || response.statusText}`)
      }
      
      return data
    } catch (error) {
      structuredLog('error', 'Bybit API request failed', { 
        endpoint, 
        error: error.message,
        params 
      })
      throw error
    }
  }

  async getAccountInfo() {
    return this.makeRequest('GET', '/v5/account/info')
  }

  async getWalletBalance() {
    return this.makeRequest('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' })
  }

  async placeOrder(params: any) {
    return this.makeRequest('POST', '/v5/order/create', params)
  }

  async getInstrumentInfo(symbol: string) {
    return this.makeRequest('GET', '/v5/market/instruments-info', {
      category: 'linear',
      symbol
    })
  }

  async getTicker(symbol: string) {
    return this.makeRequest('GET', '/v5/market/tickers', {
      category: 'linear',
      symbol
    })
  }
}

// =================== TRADE EXECUTION LOGIC ===================

async function executeTradeWithAccount(requestBody: any, authHeader?: string) {
  const requestId = structuredLog('info', 'Trade execution started', { requestBody });
  
  try {
    const { symbol, side, amountUSD, leverage = 1, testMode = false } = requestBody;
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.56.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract user ID from JWT token
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (user && !userError) {
          userId = user.id;
          structuredLog('info', 'User authenticated via JWT', { userId, requestId });
        } else {
          structuredLog('warn', 'JWT authentication failed', { error: userError?.message, requestId });
        }
      } catch (jwtError) {
        structuredLog('error', 'JWT parsing failed', { error: jwtError.message, requestId });
      }
    }
    
    // Require authentication - no fallbacks
    if (!userId) {
      structuredLog('error', 'Authentication required', { requestId });
      return json({
        success: false,
        error: 'Authentication required. Please sign in to execute trades.',
        code: 'AUTH_REQUIRED'
      }, 401);
    }
    
    // Use the new helper function to get trading account
    const { data: accounts, error: accountError } = await supabase
      .rpc('get_user_trading_account', {
        p_user_id: userId,
        p_account_type: 'testnet'
      });
    
    if (accountError) {
      structuredLog('error', 'Failed to fetch trading account', { 
        error: accountError.message, 
        userId, 
        requestId 
      });
      return json({
        success: false,
        error: 'Failed to access trading account: ' + accountError.message
      }, 500);
    }
    
    let account = accounts?.[0];
    
    // If no account exists, try to create one with environment credentials
    if (!account) {
      const envApiKey = Deno.env.get('BYBIT_API_KEY');
      const envApiSecret = Deno.env.get('BYBIT_API_SECRET');
      
      if (!envApiKey || !envApiSecret) {
        structuredLog('warn', 'No trading credentials available', { userId, requestId });
        return json({
          success: false,
          error: 'No trading credentials configured. Please add your Bybit API credentials.',
          code: 'CREDENTIALS_REQUIRED',
          needsCredentials: true
        }, 400);
      }
      
      // Create account using the restore function
      try {
        const { data: newAccountId, error: createError } = await supabase
          .rpc('restore_user_trading_account', {
            p_user_id: userId,
            p_api_key: envApiKey,
            p_api_secret: envApiSecret,
            p_account_type: 'testnet'
          });
        
        if (createError) {
          structuredLog('error', 'Failed to create trading account', { 
            error: createError.message, 
            userId, 
            requestId 
          });
          return json({
            success: false,
            error: 'Failed to create trading account: ' + createError.message
          }, 500);
        }
        
        // Fetch the newly created account using the helper function
        const { data: newAccounts } = await supabase
          .rpc('get_user_trading_account', {
            p_user_id: userId,
            p_account_type: 'testnet'
          });
        
        account = newAccounts?.[0];
        structuredLog('info', 'Created new trading account', { 
          accountId: newAccountId, 
          userId, 
          requestId 
        });
      } catch (createError) {
        structuredLog('error', 'Exception creating trading account', { 
          error: createError.message, 
          userId, 
          requestId 
        });
        return json({
          success: false,
          error: 'Failed to create trading account: ' + createError.message
        }, 500);
      }
    }
    
    if (!account) {
      structuredLog('error', 'No trading account available after creation attempt', { 
        userId, 
        requestId 
      });
      return json({
        success: false,
        error: 'Unable to access or create trading account',
        code: 'ACCOUNT_ACCESS_FAILED'
      }, 400);
    }

    // Validate API credentials
    const apiKey = account.api_key_encrypted;
    const apiSecret = account.api_secret_encrypted;
    
    if (!apiKey || !apiSecret) {
      structuredLog('error', 'Trading account missing API credentials', { 
        accountId: account.id, 
        userId, 
        requestId 
      });
      return json({
        success: false,
        error: 'Trading account missing API credentials. Please update your credentials.',
        code: 'CREDENTIALS_MISSING',
        needsCredentials: true
      }, 400);
    }

    // Validate credential format
    if (apiKey.length < 10 || apiSecret.length < 10) {
      structuredLog('error', 'Invalid API credentials format', { 
        accountId: account.id, 
        userId, 
        requestId 
      });
      return json({
        success: false,
        error: 'Invalid API credentials format. Please check your credentials.',
        code: 'CREDENTIALS_INVALID',
        needsCredentials: true
      }, 400);
    }

    // Initialize Bybit client with testnet for development
    const bybit = new BybitV5Client(apiKey, apiSecret, true); // Force testnet
    
    // Validate credentials by testing API connection
    try {
      const accountInfo = await bybit.getAccountInfo();
      if (accountInfo.retCode !== 0) {
        structuredLog('error', 'Bybit API authentication failed', { 
          retCode: accountInfo.retCode,
          retMsg: accountInfo.retMsg,
          userId, 
          requestId 
        });
        return json({
          success: false,
          error: `Bybit API authentication failed: ${accountInfo.retMsg}`,
          code: 'API_AUTH_FAILED',
          needsCredentials: true
        }, 401);
      }
      structuredLog('info', 'Bybit API authentication successful', { userId, requestId });
    } catch (authError) {
      structuredLog('error', 'Bybit API connection test failed', { 
        error: authError.message, 
        userId, 
        requestId 
      });
      return json({
        success: false,
        error: `Bybit API connection failed: ${authError.message}`,
        code: 'API_CONNECTION_FAILED',
        needsCredentials: true
      }, 401);
    }

    
    // Validate symbol and get instrument info
    structuredLog('info', 'Validating symbol', { symbol, requestId });
    
    let currentPrice: number;
    let quantity: string;
    
    try {
      const instrumentInfo = await bybit.getInstrumentInfo(symbol);
      structuredLog('info', 'Instrument info response', { 
        retCode: instrumentInfo?.retCode,
        retMsg: instrumentInfo?.retMsg,
        resultLength: instrumentInfo?.result?.list?.length,
        symbol,
        requestId 
      });
      
      if (!instrumentInfo.result?.list?.length) {
        structuredLog('error', 'Symbol validation failed - no instruments found', { 
          symbol, 
          instrumentInfo,
          requestId 
        });
        return json({
          success: false,
          error: `Invalid symbol: ${symbol}. This symbol may not be available on testnet or may not exist.`
        }, 400);
      }

      const instrument = instrumentInfo.result.list[0];
      structuredLog('info', 'Symbol validated successfully', { 
        symbol, 
        instrumentName: instrument?.symbol,
        requestId 
      });
      
      // Get current price
      const tickerInfo = await bybit.getTicker(symbol);
      currentPrice = parseFloat(tickerInfo.result.list[0].lastPrice);
      
      // Calculate quantity based on USD amount
      quantity = (amountUSD / currentPrice).toFixed(6);
      
      structuredLog('info', 'Trade calculation completed', { 
        symbol,
        amountUSD,
        currentPrice,
        quantity,
        testMode,
        requestId 
      });

    } catch (instrumentError) {
      structuredLog('error', 'Symbol validation failed', { 
        error: instrumentError.message, 
        symbol, 
        requestId 
      });
      return json({
        success: false,
        error: `Symbol validation failed: ${instrumentError.message}`
      }, 400);
    }

    if (testMode) {
      // Return mock successful trade for test mode
      structuredLog('info', 'Returning test mode result', { requestId });
      return json({
        success: true,
        message: 'Test trade executed successfully (testnet simulation)',
        testMode: true,
        trade: {
          symbol,
          side,
          quantity,
          price: currentPrice,
          amountUSD,
          leverage,
          orderId: 'test_' + Date.now(),
          exchange: 'bybit_testnet'
        }
      });
    }

    // Prepare order parameters
    const orderParams = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty: quantity,
      timeInForce: 'IOC'
    };

    // Execute the trade
    const orderResult = await bybit.placeOrder(orderParams);
    
    if (orderResult.retCode !== 0) {
      throw new Error(`Order failed: ${orderResult.retMsg}`);
    }

    // Log successful trade
    structuredLog('info', 'Trade executed successfully', {
      symbol,
      side,
      quantity,
      price: currentPrice,
      orderId: orderResult.result.orderId
    });

    return json({
      success: true,
      message: 'Trade executed successfully',
      trade: {
        orderId: orderResult.result.orderId,
        symbol,
        side,
        quantity,
        price: currentPrice,
        amountUSD,
        leverage
      }
    });

  } catch (error: any) {
    structuredLog('error', 'Trade execution failed', { 
      error: error.message,
      requestBody
    });
    
    return json({
      success: false,
      error: error.message || 'Trade execution failed'
    }, 500);
  }
}

// =================== MAIN HANDLER ===================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const authHeader = req.headers.get('authorization');

    structuredLog('info', 'Trade executor request', { action, body, hasAuth: !!authHeader });

    if (action === 'status') {
      return json({
        status: 'operational',
        trading_enabled: true,
        allowed_symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'place_order') {
      return await executeTradeWithAccount(body, authHeader);
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