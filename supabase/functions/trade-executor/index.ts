import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  notionalUSD: number;
  testMode?: boolean;
}

function now() { return Date.now().toString(); }

async function hmacSHA256Hex(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function bybitV5(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
  apiSecret: string,
  baseUrl: string,
  recvWindow = '5000',
) {
  const ts = now();
  const bodyStr = JSON.stringify(body ?? {});
  const presign = ts + apiKey + recvWindow + bodyStr;
  const sign = await hmacSHA256Hex(presign, apiSecret);

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': sign,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': recvWindow,
    },
    body: bodyStr,
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
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

    const body: TradeRequest = await req.json();
    console.log('🚀 Trade execution request:', body);

    // Get environment configuration
    const TESTNET = (Deno.env.get('BYBIT_TESTNET') ?? 'false').toLowerCase() === 'true';
    const BASE = Deno.env.get('BYBIT_BASE') ?? (TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
    const KEY = Deno.env.get('BYBIT_API_KEY') ?? '';
    const SEC = Deno.env.get('BYBIT_API_SECRET') ?? '';
    const PAPER_TRADING = (Deno.env.get('PAPER_TRADING') ?? 'true').toLowerCase() === 'true';
    const LIVE_ENABLED = (Deno.env.get('LIVE_TRADING_ENABLED') ?? 'false').toLowerCase() === 'true';
    const RECV = Deno.env.get('BYBIT_RECV_WINDOW') ?? '5000';

    console.log(`🔧 Mode: { paper: ${PAPER_TRADING}, base: '${BASE}', liveEnabled: ${LIVE_ENABLED}, hasKey: ${!!KEY} }`);

    // Validate request
    if (!body.symbol || !body.side || !body.notionalUSD) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: symbol, side, notionalUSD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we should use mock trading
    if (PAPER_TRADING || !LIVE_ENABLED || !KEY || !SEC || body.testMode) {
      console.log('📝 PAPER TRADING MODE - returning mock result');
      
      const mockTradeResult = {
        success: true,
        orderId: `mock_${Date.now()}`,
        symbol: body.symbol,
        side: body.side,
        quantity: (body.notionalUSD * 0.001).toFixed(6),
        price: Math.random() * 100 + 1,
        status: 'FILLED',
        executedAt: new Date().toISOString(),
        fees: {
          currency: 'USDT',
          amount: (body.notionalUSD * 0.001).toFixed(4)
        },
        mode: 'paper'
      };

      return new Response(
        JSON.stringify({
          ok: true,
          data: mockTradeResult
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // LIVE TRADING MODE
    console.log('🚨 LIVE TRADING MODE - placing real order on Bybit');

    const leverage = 5;
    const symbol = body.symbol.replace('/', '');

    try {
      // Step 1: Switch position mode to One-way
      console.log(`🔄 Setting position mode for ${symbol}`);
      await bybitV5('/v5/position/switch-mode', {
        category: 'linear',
        symbol: symbol,
        positionMode: 0, // 0 = One-way
      }, KEY, SEC, BASE, RECV);

      // Step 2: Set leverage
      console.log(`⚡ Setting leverage to ${leverage}x for ${symbol}`);
      await bybitV5('/v5/position/set-leverage', {
        category: 'linear',
        symbol: symbol,
        buyLeverage: String(leverage),
        sellLeverage: String(leverage),
      }, KEY, SEC, BASE, RECV);

      // Step 3: Place market order
      console.log(`📈 Placing ${body.side} order: ${body.notionalUSD} USD of ${symbol}`);
      const orderResult = await bybitV5('/v5/order/create', {
        category: 'linear',
        symbol: symbol,
        side: body.side === 'BUY' ? 'Buy' : 'Sell',
        orderType: 'Market',
        qty: String(body.notionalUSD / 50), // Rough qty calculation
        timeInForce: 'IOC'
      }, KEY, SEC, BASE, RECV);

      console.log(`📡 Bybit response:`, orderResult.json);

      if (orderResult.json?.retCode === 0) {
        const result = orderResult.json.result;
        const tradeResult = {
          success: true,
          orderId: result.orderId,
          symbol: body.symbol,
          side: body.side,
          quantity: result.qty || 'unknown',
          price: result.price || 'market',
          status: 'SUBMITTED',
          executedAt: new Date().toISOString(),
          fees: { currency: 'USDT', amount: '0.001' },
          mode: 'live',
          bybitResponse: orderResult.json
        };

        console.log('✅ LIVE order placed successfully:', tradeResult);

        return new Response(
          JSON.stringify({
            ok: true,
            data: tradeResult
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        throw new Error(`Bybit API error: ${orderResult.json?.retMsg || 'Unknown error'}`);
      }

    } catch (bybitError: any) {
      console.error('❌ Bybit API error:', bybitError);
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Bybit API error: ${bybitError.message}`,
          details: bybitError
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Trade execution error:', error);
    
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