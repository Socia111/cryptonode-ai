import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  action: string;
  symbol?: string;
  side?: 'Buy' | 'Sell';
  amountUSD?: number;
  leverage?: number;
  orderType?: string;
  timeInForce?: string;
  scalpMode?: boolean;
  reduceOnly?: boolean;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  idempotencyKey?: string;
}

// Bybit API helper functions
function generateSignature(params: string, secret: string): string {
  const hmac = createHmac("sha256", new TextEncoder().encode(secret));
  hmac.update(new TextEncoder().encode(params));
  return Array.from(new Uint8Array(hmac.digest()))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function makeBybitRequest(endpoint: string, params: any = {}, apiKey: string, apiSecret: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  
  // Create query string
  const queryParams = new URLSearchParams({
    ...params,
    api_key: apiKey,
    timestamp,
    recv_window: recvWindow
  });
  
  // Generate signature
  const signature = generateSignature(queryParams.toString(), apiSecret);
  queryParams.append('sign', signature);
  
  const url = `https://api-testnet.bybit.com${endpoint}?${queryParams.toString()}`;
  
  console.log(`🔄 Bybit API Call: GET ${url.split('?')[0]}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  return await response.json();
}

async function placeBybitOrder(params: any, apiKey: string, apiSecret: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  
  const orderParams = {
    category: "linear",
    symbol: params.symbol,
    side: params.side,
    orderType: params.orderType || "Market",
    qty: params.qty,
    timeInForce: params.timeInForce || "GTC"
  };
  
  if (params.price) orderParams.price = params.price;
  if (params.stopLoss) orderParams.stopLoss = params.stopLoss;
  if (params.takeProfit) orderParams.takeProfit = params.takeProfit;
  
  const body = JSON.stringify(orderParams);
  const paramString = timestamp + apiKey + recvWindow + body;
  const signature = generateSignature(paramString, apiSecret);
  
  console.log(`🔄 Placing order: ${JSON.stringify(orderParams)}`);
  
  const response = await fetch('https://api-testnet.bybit.com/v5/order/create', {
    method: 'POST',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json',
    },
    body
  });
  
  return await response.json();
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 AItradeX1 Trade Executor - Request received');
    
    const body: TradeRequest = await req.json();
    console.log('📋 Request body:', body);

    // Handle status check
    if (body.action === 'status') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'online',
          timestamp: new Date().toISOString(),
          message: 'AItradeX1 Trade Executor is operational'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Handle trade execution
    if (body.action === 'place_order') {
      // Get API credentials from secrets
      const apiKey = Deno.env.get('BYBIT_API_KEY');
      const apiSecret = Deno.env.get('BYBIT_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        console.error('❌ Missing Bybit API credentials');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing Bybit API credentials. Please configure BYBIT_API_KEY and BYBIT_API_SECRET.',
            code: 'MISSING_CREDENTIALS'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      try {
        // Calculate position size based on USD amount and current price
        const symbol = body.symbol?.replace(/[\/\s]/g, '') || 'BTCUSDT';
        
        // Get current price first
        const tickerResponse = await makeBybitRequest('/v5/market/tickers', {
          category: 'linear',
          symbol: symbol
        }, apiKey, apiSecret);
        
        if (tickerResponse.retCode !== 0) {
          throw new Error(`Failed to get ticker: ${tickerResponse.retMsg}`);
        }
        
        const currentPrice = parseFloat(tickerResponse.result.list[0].lastPrice);
        const amountUSD = body.amountUSD || 10;
        const leverage = body.leverage || 1;
        
        // Calculate quantity in base currency
        const notionalValue = amountUSD * leverage;
        const qty = (notionalValue / currentPrice).toFixed(6);
        
        console.log(`📊 Trade calculation:`, {
          symbol,
          currentPrice,
          amountUSD,
          leverage,
          notionalValue,
          qty
        });
        
        // Place the order
        const orderResult = await placeBybitOrder({
          symbol,
          side: body.side,
          orderType: body.orderType || 'Market',
          qty,
          timeInForce: body.timeInForce || 'GTC',
          price: body.entryPrice,
          stopLoss: body.stopLoss,
          takeProfit: body.takeProfit
        }, apiKey, apiSecret);
        
        console.log('📋 Bybit order response:', orderResult);
        
        if (orderResult.retCode !== 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Order failed: ${orderResult.retMsg}`,
              code: 'ORDER_FAILED',
              details: orderResult
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              orderId: orderResult.result.orderId,
              symbol: symbol,
              side: body.side,
              qty: qty,
              amountUSD: amountUSD,
              leverage: leverage,
              status: 'submitted',
              currentPrice,
              bybitResponse: orderResult.result
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
        
      } catch (error) {
        console.error('❌ Trade execution error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Trade execution failed: ${error.message}`,
            code: 'EXECUTION_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action',
        code: 'INVALID_ACTION'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('❌ Trade executor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});