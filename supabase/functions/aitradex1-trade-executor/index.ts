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

async function executeTradeWithAccount(requestBody: any) {
  try {
    const { symbol, side, amountUSD, leverage = 1, testMode = false } = requestBody;
    
    // Get user from JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase client 
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.56.0')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from request (for now, we'll create a test user scenario)
    const testUserId = 'ea52a338-c40d-4809-9014-10151b3af9af'; // From network logs
    
    // Get user's trading account or create one
    let { data: account, error: accountError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', testUserId)
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .maybeSingle()
    
    // If no account exists, create one with environment credentials
    if (!account) {
      const envApiKey = Deno.env.get('BYBIT_API_KEY')
      const envApiSecret = Deno.env.get('BYBIT_API_SECRET')
      
      if (!envApiKey || !envApiSecret) {
        return json({
          success: false,
          error: 'No trading credentials available',
          needsCredentials: true
        }, 400);
      }
      
      // Create account using the restore function
      const { data: newAccountId, error: createError } = await supabase
        .rpc('restore_user_trading_account', {
          p_user_id: testUserId,
          p_api_key: envApiKey,
          p_api_secret: envApiSecret,
          p_account_type: 'testnet'
        });
      
      if (createError) {
        structuredLog('error', 'Failed to create trading account', { error: createError.message });
        return json({
          success: false,
          error: 'Failed to create trading account: ' + createError.message
        }, 500);
      }
      
      // Fetch the newly created account
      const { data: newAccount } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('id', newAccountId)
        .single();
      
      account = newAccount;
      structuredLog('info', 'Created new trading account', { accountId: newAccountId });
    }
    
    if (!account) {
      return json({
        success: false,
        error: 'Unable to access trading account'
      }, 400);
    }

    // Initialize Bybit client
    const apiKey = account.api_key_encrypted;
    const apiSecret = account.api_secret_encrypted;
    
    if (!apiKey || !apiSecret) {
      return json({
        success: false,
        error: 'Trading account missing API credentials',
        needsCredentials: true
      }, 400);
    }

    const bybit = new BybitV5Client(apiKey, apiSecret);

    // Validate symbol and get instrument info
    const instrumentInfo = await bybit.getInstrumentInfo(symbol);
    if (!instrumentInfo.result?.list?.length) {
      return json({
        success: false,
        error: `Invalid symbol: ${symbol}`
      }, 400);
    }

    const instrument = instrumentInfo.result.list[0];
    
    // Get current price
    const tickerInfo = await bybit.getTicker(symbol);
    const currentPrice = parseFloat(tickerInfo.result.list[0].lastPrice);
    
    // Calculate quantity based on USD amount
    const quantity = (amountUSD / currentPrice).toFixed(6);
    
    // Prepare order parameters
    const orderParams = {
      category: 'linear',
      symbol: symbol,
      side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(), // Buy/Sell
      orderType: 'Market',
      qty: quantity,
      timeInForce: 'IOC',
      reduceOnly: false,
      closeOnTrigger: false
    };

    if (testMode) {
      // Return mock successful trade for test mode
      return json({
        success: true,
        message: 'Test trade executed successfully',
        testMode: true,
        trade: {
          symbol,
          side,
          quantity,
          price: currentPrice,
          amountUSD,
          leverage
        }
      });
    }

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