import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Logging helper
const log = async (supabase: any, stage: string, payload: any) => {
  try {
    await supabase.from('edge_event_log').insert({
      fn: 'trade-executor',
      stage,
      payload
    });
  } catch (_e) { /* ignore */ }
};

// Bybit API helper
async function bybitRequest(endpoint: string, params: any, apiKey: string, apiSecret: string, baseUrl: string, recvWindow = 5000) {
  const timestamp = Date.now().toString();
  const queryString = new URLSearchParams({
    ...params,
    api_key: apiKey,
    timestamp,
    recv_window: recvWindow.toString(),
  }).toString();

  // Create signature
  const crypto = await import('https://deno.land/std@0.224.0/crypto/mod.ts');
  const encoder = new TextEncoder();
  const key = await crypto.crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(queryString)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const finalParams = { ...params, sign: signatureHex };
  
  const url = `${baseUrl}${endpoint}`;
  console.log(`🔄 Bybit API Call: POST ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signatureHex,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow.toString(),
    },
    body: JSON.stringify(finalParams)
  });

  const responseData = await response.json();
  console.log(`📊 Bybit Response:`, responseData);
  
  return responseData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get environment variables
    const PAPER = Deno.env.get('PAPER_TRADING') !== 'false';
    const LIVE_ENABLED = Deno.env.get('LIVE_TRADING_ENABLED') === 'true';
    const TESTNET = Deno.env.get('BYBIT_TESTNET') !== 'false';
    const BASE_URL = Deno.env.get('BYBIT_BASE') || (TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
    const API_KEY = Deno.env.get('BYBIT_API_KEY');
    const API_SECRET = Deno.env.get('BYBIT_API_SECRET');
    const recvWindow = parseInt(Deno.env.get('BYBIT_RECV_WINDOW') || '5000');

    console.log('🔧 Environment Check:');
    console.log(`- Live Trading: ${LIVE_ENABLED}`);
    console.log(`- API Secret present: ${!!API_SECRET} (${API_SECRET?.length || 0} chars)`);
    console.log(`- API Key present: ${!!API_KEY} (${API_KEY?.length || 0} chars)`);
    console.log(`- Base URL: ${BASE_URL}`);
    console.log(`- Is Testnet: ${TESTNET}`);

    await log(supabase, 'mode', {
      paper: PAPER,
      base: BASE_URL,
      testnet: TESTNET,
      liveEnabled: LIVE_ENABLED,
      hasKey: !!API_KEY
    });

    const body = await req.json();
    console.log('🚀 Trade execution request:', body);

    await log(supabase, 'request', body);

    // Validate request
    if (!body.symbol || !body.side) {
      const error = 'Missing required fields: symbol, side';
      await log(supabase, 'error', { message: error });
      return new Response(
        JSON.stringify({ error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If paper trading or no API keys, return mock response
    if (PAPER || !API_KEY || !API_SECRET) {
      const mockResult = {
        success: true,
        paper: true,
        orderId: `paper_${Date.now()}`,
        symbol: body.symbol,
        side: body.side,
        quantity: body.amountUSD ? (body.amountUSD * 0.001).toFixed(6) : '0.001',
        price: Math.random() * 50000 + 30000,
        status: 'FILLED',
        executedAt: new Date().toISOString()
      };

      await log(supabase, 'paper_trade', mockResult);

      // Log to trade_logs table
      await supabase.from('trade_logs').insert({
        symbol: body.symbol,
        side: body.side,
        amount: body.amountUSD || 10,
        leverage: body.leverage || 1,
        order_type: body.orderType || 'Market',
        price: mockResult.price,
        quantity: parseFloat(mockResult.quantity),
        status: 'FILLED',
        exchange: 'bybit',
        category: 'linear',
        bybit_order_id: mockResult.orderId,
        paper_trade: true,
        bybit_response: mockResult
      });

      return new Response(
        JSON.stringify({ ok: true, data: mockResult }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Live trading - force linear category and validate symbol
    const category = 'linear';
    if (!body.symbol?.endsWith('USDT')) {
      const error = `Symbol ${body.symbol} is not a USDT perpetual (linear)`;
      await log(supabase, 'error', { message: error });
      throw new Error(error);
    }

    // Calculate quantity from USD amount
    const amountUSD = body.amountUSD || 10;
    const leverage = body.leverage || 1;
    
    // Get current price to calculate quantity
    const tickerResponse = await fetch(`${BASE_URL}/v5/market/tickers?category=${category}&symbol=${body.symbol}`);
    const tickerData = await tickerResponse.json();
    
    if (tickerData.retCode !== 0 || !tickerData.result?.list?.[0]) {
      throw new Error(`Failed to get price for ${body.symbol}: ${tickerData.retMsg}`);
    }
    
    const currentPrice = parseFloat(tickerData.result.list[0].lastPrice);
    const qty = (amountUSD / currentPrice).toFixed(6);

    // Set position mode and leverage first
    try {
      await bybitRequest('/v5/position/switch-mode', {
        category,
        symbol: body.symbol,
        mode: 3 // Portfolio margin mode
      }, API_KEY, API_SECRET, BASE_URL, recvWindow);
    } catch (e) {
      console.log('Position mode already set or not needed:', e);
    }

    try {
      await bybitRequest('/v5/position/set-leverage', {
        category,
        symbol: body.symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
      }, API_KEY, API_SECRET, BASE_URL, recvWindow);
    } catch (e) {
      console.log('Leverage already set or not needed:', e);
    }

    // Execute trade
    const createResp = await bybitRequest('/v5/order/create', {
      category,
      symbol: body.symbol,
      side: body.side,
      orderType: body.orderType || 'Market',
      qty: qty.toString(),
      timeInForce: body.orderType === 'Limit' ? (body.timeInForce || 'GTC') : 'IOC',
      reduceOnly: body.reduceOnly || false,
      positionIdx: 0
    }, API_KEY, API_SECRET, BASE_URL, recvWindow);

    await log(supabase, 'bybit.create', createResp);

    // Log to trade_logs table
    await supabase.from('trade_logs').insert({
      symbol: body.symbol,
      side: body.side,
      amount: amountUSD,
      leverage: leverage,
      order_type: body.orderType || 'Market',
      price: currentPrice,
      quantity: parseFloat(qty),
      status: createResp.retCode === 0 ? 'FILLED' : 'FAILED',
      exchange: 'bybit',
      category: category,
      bybit_order_id: createResp.result?.orderId,
      paper_trade: false,
      error_message: createResp.retCode !== 0 ? createResp.retMsg : null,
      bybit_response: createResp
    });

    if (createResp.retCode !== 0) {
      throw new Error(`Bybit API error: ${createResp.retMsg} (${createResp.retCode})`);
    }

    const result = {
      ok: true,
      paper: false,
      order: createResp,
      executedAt: new Date().toISOString()
    };

    await log(supabase, 'success', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Trade execution error:', error);
    
    // Try to log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await log(supabase, 'error', { message: String(error?.message ?? error) });
    } catch (_e) { /* ignore */ }
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Trade execution failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});