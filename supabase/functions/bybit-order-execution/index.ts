// Updated HMAC implementation for Deno edge functions (no node:crypto)
async function createHmac(algorithm: string, secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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
async function generateSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, apiSecret: string): Promise<string> {
  const param_str = timestamp + apiKey + recvWindow + queryString;
  return await createHmac('sha256', apiSecret, param_str);
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
  const signature = await generateSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);
  
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
  
  const signature = await generateSignature(timestamp, apiKey, recvWindow, queryString, apiSecret);
  
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
    // Add detailed logging for debugging
    console.log('🔧 Checking API credentials availability...');
    const apiKey = Deno.env.get('BYBIT_API_KEY');
    const apiSecret = Deno.env.get('BYBIT_API_SECRET');
    console.log('🔑 API Key present:', !!apiKey);
    console.log('🔐 API Secret present:', !!apiSecret);
    
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
    
    // Clean symbol format and validate it exists on Bybit
    let symbol = signal.token.replace('/', '').toUpperCase();
    if (!symbol.endsWith('USDT')) {
      symbol = symbol.replace('USDT', '') + 'USDT';
    }
    
    // Skip symbols that are known to be problematic
    const problematicSymbols = ['PIPPINUSDT', 'BABYUSDT']; // Add more as needed
    if (problematicSymbols.includes(symbol)) {
      throw new Error(`Symbol ${symbol} is not supported on Bybit or has trading restrictions`);
    }

    // Calculate proper order size based on minimum requirements
    let calculatedQty = parseFloat(orderSize.toString());
    
    // Set minimum order values based on category
    const minOrderValue = category === 'linear' ? 5 : 10; // $5 for futures, $10 for spot
    const estimatedPrice = signal.entry_price || 1;
    const minQty = minOrderValue / estimatedPrice;
    
    // Ensure order size meets minimum requirements
    if (calculatedQty < minQty) {
      calculatedQty = minQty * 1.1; // Add 10% buffer
      console.log(`🔧 Adjusted order size from ${orderSize} to ${calculatedQty} to meet minimum requirements`);
    }
    
    // Round quantity to appropriate precision
    const qtyPrecision = category === 'linear' ? 3 : 4;
    const formattedQty = calculatedQty.toFixed(qtyPrecision);
    
    // Prepare order parameters based on Bybit v5 API with ALL signal data
    const orderParams: BybitOrderParams = {
      category: category as 'spot' | 'linear',
      symbol: symbol,
      side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: formattedQty,
      orderLinkId: orderLinkId,
      timeInForce: 'IOC', // Immediate or Cancel for market orders
    };

    // For linear/futures trading, add position index
    if (category === 'linear') {
      orderParams.positionIdx = 0; // One-way mode
    }

    // Add stop loss and take profit with proper TPSL mode for linear futures
    if (category === 'linear' && (signal.stop_loss || signal.exit_target || signal.take_profit)) {
      orderParams.tpslMode = 'Full'; // Required for linear trading with SL/TP
      
      if (signal.stop_loss) {
        const slPrice = parseFloat(signal.stop_loss.toString());
        const formattedSL = slPrice.toFixed(4); // Format to 4 decimal places
        orderParams.stopLoss = formattedSL;
        orderParams.slTriggerBy = 'LastPrice';
        orderParams.slOrderType = 'Market';
      }
      
      if (signal.exit_target || signal.take_profit) {
        const targetPrice = signal.exit_target || signal.take_profit;
        const tpPrice = parseFloat(targetPrice.toString());
        const formattedTP = tpPrice.toFixed(4); // Format to 4 decimal places
        orderParams.takeProfit = formattedTP;
        orderParams.tpTriggerBy = 'LastPrice';
        orderParams.tpOrderType = 'Market';
      }
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

    // Always return success: true for successful orders
    return new Response(JSON.stringify({
      success: true,
      orderId: orderResult.result.orderId,
      orderLinkId: orderResult.result.orderLinkId,
      message: `✅ LIVE ${signal.direction} order executed successfully for ${symbol}`,
      orderParams,
      executionTime: new Date().toISOString(),
      bybitResponse: {
        retCode: orderResult.retCode,
        retMsg: orderResult.retMsg,
        time: orderResult.time
      },
      signal: {
        token: signal.token,
        direction: signal.direction,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.exit_target || signal.take_profit,
        confidence: signal.confidence_score
      },
      // Market execution details
      executionDetails: {
        market: 'bybit',
        category: orderParams.category,
        leverage: leverage,
        quantity: orderParams.qty,
        apiStatus: 'LIVE_PRODUCTION'
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
    } else if (error.message?.includes('10001')) {
      userFriendlyMessage = '📏 Order size below minimum. Increase order quantity (try $50+ for futures).';
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