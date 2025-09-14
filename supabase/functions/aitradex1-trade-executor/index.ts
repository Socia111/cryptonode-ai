import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

// Bybit API helper functions using Web Crypto API
async function generateSignature(params: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(params));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function makeBybitRequest(endpoint: string, params: any = {}, apiKey: string, apiSecret: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  
  // Build query string for GET requests
  const queryParams = new URLSearchParams(params).toString();
  const fullUrl = `https://api-testnet.bybit.com${endpoint}${queryParams ? '?' + queryParams : ''}`;
  
  // Create parameter string for signing
  const paramString = timestamp + apiKey + recvWindow + queryParams;
  const signature = await generateSignature(paramString, apiSecret);
  
  console.log(`🔄 Bybit API Call: GET ${fullUrl}`);
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

async function placeBybitOrder(params: any, apiKey: string, apiSecret: string) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  
  const orderParams: any = {
    category: "linear",
    symbol: params.symbol,
    side: params.side,
    orderType: params.orderType || "Market",
    qty: params.qty,
  };
  
  if (params.orderType === "Limit" && params.price) {
    orderParams.price = params.price;
    orderParams.timeInForce = params.timeInForce || "GTC";
  }
  
  const body = JSON.stringify(orderParams);
  const paramString = timestamp + apiKey + recvWindow + body;
  const signature = await generateSignature(paramString, apiSecret);
  
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
    console.log('🚀 AItradeX1 Trade Executor - REAL API Request received');
    
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
        
        // Determine the correct category and get current price
        let tickerResponse;
        let category = 'linear'; // Default to linear for USDT perpetual contracts
        
        // For USDT perpetual contracts, use linear category
        if (symbol.endsWith('USDT')) {
          category = 'linear';
        } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
          category = 'inverse'; // For inverse perpetual contracts
        } else {
          category = 'spot'; // For spot trading
        }
        
        console.log(`🔄 Getting ticker for ${symbol} using category: ${category}`);
        
        try {
          tickerResponse = await makeBybitRequest('/v5/market/tickers', {
            category: category,
            symbol: symbol
          }, apiKey, apiSecret);
          
          // If linear fails and it's a USDT pair, try spot as fallback
          if (tickerResponse.retCode !== 0 && category === 'linear' && symbol.endsWith('USDT')) {
            console.log('Linear category failed for USDT pair, trying spot fallback');
            tickerResponse = await makeBybitRequest('/v5/market/tickers', {
              category: 'spot',
              symbol: symbol
            }, apiKey, apiSecret);
            category = 'spot'; // Update category for subsequent calls
          }
        } catch (error) {
          console.error(`Failed to get ticker for ${symbol} with category ${category}:`, error.message);
          throw new Error(`Failed to get ticker for ${symbol}: ${error.message}`);
        }
        
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
          price: body.entryPrice
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