import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BybitOrderParams {
  category: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopLoss?: string;
  takeProfit?: string;
}

function generateSignature(params: Record<string, any>, apiSecret: string, timestamp: string): string {
  const orderedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const queryString = `${timestamp}${orderedParams}`;
  return createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

async function executeBybitOrder(orderParams: BybitOrderParams): Promise<any> {
  const apiKey = Deno.env.get('BYBIT_API_KEY');
  const apiSecret = Deno.env.get('BYBIT_API_SECRET');
  
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Bybit API credentials');
  }

  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  const params = {
    ...orderParams,
    timestamp,
    recvWindow,
  };

  const signature = generateSignature(params, apiSecret, timestamp);
  
  const url = 'https://api.bybit.com/v5/order/create';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderParams),
  });

  const result = await response.json();
  
  if (!response.ok || result.retCode !== 0) {
    throw new Error(`Bybit API error: ${result.retMsg || 'Unknown error'}`);
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, orderSize = '10' } = await req.json();
    
    if (!signal) {
      throw new Error('Signal data is required');
    }

    console.log('Executing order for signal:', signal);

    // Prepare order parameters based on the signal
    const orderParams: BybitOrderParams = {
      category: 'spot', // or 'linear' for futures
      symbol: signal.token.replace('/', ''),
      side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: orderSize,
      timeInForce: 'IOC',
    };

    // Add stop loss and take profit if available
    if (signal.stop_loss) {
      orderParams.stopLoss = signal.stop_loss.toString();
    }
    
    if (signal.exit_target) {
      orderParams.takeProfit = signal.exit_target.toString();
    }

    console.log('Order parameters:', orderParams);

    // Execute the order
    const orderResult = await executeBybitOrder(orderParams);

    console.log('Order executed successfully:', orderResult);

    return new Response(JSON.stringify({
      success: true,
      orderId: orderResult.result.orderId,
      orderLinkId: orderResult.result.orderLinkId,
      message: `${signal.direction} order executed for ${signal.token}`,
      orderParams,
      result: orderResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error executing Bybit order:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to execute order'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});