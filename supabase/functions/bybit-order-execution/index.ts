import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BybitOrderParams {
  category: 'spot' | 'linear' | 'inverse' | 'option';
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
  orderLinkId?: string;
  isLeverage?: 0 | 1;
  orderFilter?: 'Order' | 'StopOrder' | 'tpslOrder';
  triggerDirection?: 1 | 2;
  triggerPrice?: string;
  triggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice';
  orderIv?: string;
  positionIdx?: 0 | 1 | 2;
  stopLoss?: string;
  takeProfit?: string;
  tpTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice';
  slTriggerBy?: 'LastPrice' | 'IndexPrice' | 'MarkPrice';
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  smpType?: 'None' | 'CancelMaker' | 'CancelTaker' | 'CancelBoth';
  mmp?: boolean;
  tpslMode?: 'Full' | 'Partial';
  tpLimitPrice?: string;
  slLimitPrice?: string;
  tpOrderType?: 'Market' | 'Limit';
  slOrderType?: 'Market' | 'Limit';
}

interface BybitResponse<T = any> {
  retCode: number;
  retMsg: string;
  result: T;
  retExtInfo: Record<string, any>;
  time: number;
}

interface OrderResult {
  orderId: string;
  orderLinkId: string;
}

// Generate signature according to Bybit v5 API docs
function generateSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, apiSecret: string): string {
  const param_str = timestamp + apiKey + recvWindow + queryString;
  return createHmac('sha256', apiSecret).update(param_str).digest('hex');
}

async function executeBybitOrder(orderParams: BybitOrderParams): Promise<BybitResponse<OrderResult>> {
  const apiKey = Deno.env.get('BYBIT_API_KEY');
  const apiSecret = Deno.env.get('BYBIT_API_SECRET');
  
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Bybit API credentials. Please configure BYBIT_API_KEY and BYBIT_API_SECRET.');
  }

  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  // Clean params - remove undefined values
  const cleanParams = Object.fromEntries(
    Object.entries(orderParams).filter(([_, value]) => value !== undefined)
  );
  
  const queryString = JSON.stringify(cleanParams);
  const signature = generateSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);
  
  // PRODUCTION ENDPOINT - Using mainnet
  const url = 'https://api.bybit.com/v5/order/create';
  
  console.log('Bybit API Request:', {
    url,
    params: cleanParams,
    timestamp,
    headers: {
      'X-BAPI-API-KEY': apiKey.substring(0, 8) + '...',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
    }
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json',
    },
    body: queryString,
  });

  const result: BybitResponse<OrderResult> = await response.json();
  
  console.log('Bybit API Response:', {
    status: response.status,
    retCode: result.retCode,
    retMsg: result.retMsg,
    orderId: result.result?.orderId
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (result.retCode !== 0) {
    throw new Error(`Bybit API error (${result.retCode}): ${result.retMsg}`);
  }

  return result;
}

// Get account balance for validation
async function getAccountBalance(category: string, coin?: string): Promise<any> {
  const apiKey = Deno.env.get('BYBIT_API_KEY');
  const apiSecret = Deno.env.get('BYBIT_API_SECRET');
  
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Bybit API credentials');
  }

  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  let queryString = `accountType=UNIFIED&category=${category}`;
  if (coin) {
    queryString += `&coin=${coin}`;
  }
  
  const signature = generateSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);
  
  // PRODUCTION ENDPOINT - Using mainnet
  const url = `https://api.bybit.com/v5/account/wallet-balance?${queryString}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
    },
  });

  const result = await response.json();
  
  if (!response.ok || result.retCode !== 0) {
    throw new Error(`Failed to get balance: ${result.retMsg || 'Unknown error'}`);
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, orderSize = '10', leverage = 1, category = 'spot', testMode = false } = await req.json();
    
    if (!signal) {
      throw new Error('Signal data is required');
    }

    console.log('🚀 Executing Bybit order for signal:', {
      token: signal.token,
      direction: signal.direction,
      entry_price: signal.entry_price,
      orderSize,
      category
    });

    // Validate signal data
    if (!signal.token || !signal.direction || !signal.entry_price) {
      throw new Error('Invalid signal data: missing required fields (token, direction, entry_price)');
    }

    // Generate unique order link ID
    const orderLinkId = `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Clean symbol format (remove slashes, ensure USDT pair)
    let symbol = signal.token.replace('/', '').toUpperCase();
    if (!symbol.endsWith('USDT')) {
      symbol = symbol.replace('USDT', '') + 'USDT';
    }

    // Prepare order parameters based on Bybit v5 API with ALL signal data
    const orderParams: BybitOrderParams = {
      category: category as 'spot' | 'linear',
      symbol: symbol,
      side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: orderSize.toString(),
      orderLinkId: orderLinkId,
      timeInForce: 'IOC', // Immediate or Cancel for market orders
    };

    // For linear/futures trading, add position index
    if (category === 'linear') {
      orderParams.positionIdx = 0; // One-way mode
    }

    // ALWAYS add stop loss and take profit from signals (all signal parameters)
    if (signal.stop_loss) {
      orderParams.stopLoss = signal.stop_loss.toString();
      orderParams.slTriggerBy = 'LastPrice';
      orderParams.slOrderType = 'Market';
    }
    
    if (signal.exit_target || signal.take_profit) {
      const targetPrice = signal.exit_target || signal.take_profit;
      orderParams.takeProfit = targetPrice.toString();
      orderParams.tpTriggerBy = 'LastPrice';
      orderParams.tpOrderType = 'Market';
    }

    // Add additional signal parameters for risk management
    if (signal.confidence_score && signal.confidence_score < 70) {
      // Reduce quantity for low confidence signals
      const adjustedQty = parseFloat(orderSize) * 0.5;
      orderParams.qty = adjustedQty.toString();
    }

    // For spot trading with SL/TP, we'll need conditional orders (OCO)
    if (category === 'spot' && (signal.stop_loss || signal.exit_target)) {
      console.log('🔄 Spot trading with SL/TP - will create conditional orders after main order');
    }

    console.log('📊 Order parameters:', orderParams);

    if (testMode) {
      // Return mock response for testing
      return new Response(JSON.stringify({
        success: true,
        testMode: true,
        orderId: `test_${orderLinkId}`,
        orderLinkId: orderLinkId,
        message: `TEST MODE: ${signal.direction} order prepared for ${symbol}`,
        orderParams,
        signal
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check account balance before executing (optional safety check)
    try {
      const balance = await getAccountBalance(category, 'USDT');
      console.log('💰 Account balance check passed');
    } catch (balanceError) {
      console.warn('⚠️ Could not verify balance:', balanceError.message);
      // Continue with order execution anyway
    }

    // Execute the order
    const orderResult = await executeBybitOrder(orderParams);

    console.log('✅ Order executed successfully:', {
      orderId: orderResult.result.orderId,
      orderLinkId: orderResult.result.orderLinkId,
      retCode: orderResult.retCode,
      retMsg: orderResult.retMsg
    });

    return new Response(JSON.stringify({
      success: true,
      orderId: orderResult.result.orderId,
      orderLinkId: orderResult.result.orderLinkId,
      message: `${signal.direction} order executed for ${symbol}`,
      orderParams,
      bybitResponse: {
        retCode: orderResult.retCode,
        retMsg: orderResult.retMsg,
        time: orderResult.time
      },
      signal: {
        token: signal.token,
        direction: signal.direction,
        entry_price: signal.entry_price,
        confidence: signal.confidence_score
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error executing Bybit order:', error);
    
    let errorMessage = error.message || 'Failed to execute order';
    let userFriendlyMessage = errorMessage;
    
    // Handle specific Bybit error codes with user-friendly messages
    if (error.message?.includes('10010')) {
      userFriendlyMessage = '🔒 IP Address not whitelisted. Please add your server IP to Bybit API settings or disable IP restriction.';
    } else if (error.message?.includes('10003')) {
      userFriendlyMessage = '🔑 Invalid API key. Please check your Bybit API credentials.';
    } else if (error.message?.includes('10004')) {
      userFriendlyMessage = '⏰ API signature expired. Please check your system time.';
    } else if (error.message?.includes('10005')) {
      userFriendlyMessage = '🚫 Invalid API permissions. Enable spot/futures trading in your Bybit API settings.';
    } else if (error.message?.includes('insufficient balance')) {
      userFriendlyMessage = '💰 Insufficient balance. Please add funds to your Bybit account.';
    } else if (error.message?.includes('Missing Bybit API credentials')) {
      userFriendlyMessage = '🔧 Bybit API credentials not configured. Please add BYBIT_API_KEY and BYBIT_API_SECRET.';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: userFriendlyMessage,
      technical_error: errorMessage,
      timestamp: new Date().toISOString(),
      help: error.message?.includes('10010') ? 'Go to Bybit API settings and either add your IP address or disable IP restriction.' : undefined
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});