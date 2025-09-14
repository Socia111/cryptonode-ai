// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function envFlag(k: string, d=false) {
  const v = (Deno.env.get(k) ?? '').trim().toLowerCase();
  if (!v) return d;
  return ['1','true','yes','y','on'].includes(v);
}

const PAPER   = envFlag('PAPER_TRADING', true);
const TESTNET = envFlag('BYBIT_TESTNET', false);
const LIVEOK  = envFlag('LIVE_TRADING_ENABLED', false);

const BASE = Deno.env.get('BYBIT_BASE') ?? (TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
const KEY  = Deno.env.get('BYBIT_API_KEY') ?? Deno.env.get('BYBIT_KEY') ?? '';
const SEC  = Deno.env.get('BYBIT_API_SECRET') ?? Deno.env.get('BYBIT_SECRET') ?? '';
const RW   = Deno.env.get('BYBIT_RECV_WINDOW') ?? '5000';
const ALLOWED = (Deno.env.get('ALLOWED_SYMBOLS') ?? 'BTCUSDT,ETHUSDT,SOLUSDT').split(',');
const DEFAULT_LEV = parseInt(Deno.env.get('DEFAULT_LEVERAGE') ?? '5');
const DEFAULT_AMT = parseFloat(Deno.env.get('DEFAULT_TRADE_AMOUNT') ?? '10');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function hmacSHA256Hex(message: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function bybitReq(method: 'GET'|'POST', path: string, params: Record<string, any> = {}) {
  const ts = Date.now().toString();
  let url = `${BASE}${path}`;
  let bodyStr = '';
  let qs = '';

  if (method === 'GET' && Object.keys(params).length) {
    qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== undefined && v !== null).map(([k,v]) => [k, String(v)])).toString();
    url += `?${qs}`;
  } else if (method === 'POST') {
    bodyStr = JSON.stringify(params);
  }

  const payload = ts + KEY + RW + (method === 'GET' ? qs : bodyStr);
  const sig = await hmacSHA256Hex(payload, SEC);

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': KEY,
      'X-BAPI-SIGN': sig,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': RW,
    },
    body: method === 'POST' ? bodyStr : undefined
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.retCode === 0, status: res.status, json };
}

async function logTrade(params: any, result: any, status: string) {
  try {
    await supabase.from('trade_logs').insert({
      symbol: params.symbol,
      side: params.side,
      amount_usd: params.amountUSD,
      leverage: params.leverage,
      order_type: params.orderType || 'Market',
      status,
      bybit_response: result,
      executed_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log trade:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'status') {
      return new Response(JSON.stringify({
        ok: true,
        mode: { paper: PAPER, liveEnabled: LIVEOK, testnet: TESTNET, base: BASE, hasKey: !!KEY },
        message: 'Trade executor online'
      }), {
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    if (action === 'place_order') {
      const params = {
        symbol: body.symbol || 'BTCUSDT',
        side: body.side || 'Buy',
        amountUSD: body.amountUSD || DEFAULT_AMT,
        leverage: body.leverage || DEFAULT_LEV,
        orderType: body.orderType || 'Market',
        reduceOnly: body.reduceOnly || false
      };

      // Validate symbol
      if (!ALLOWED.includes(params.symbol)) {
        throw new Error(`Symbol ${params.symbol} not in allowed list: ${ALLOWED.join(', ')}`);
      }

      // If paper trading, just log and return success
      if (PAPER) {
        await logTrade(params, { retCode: 0, retMsg: 'Paper trade', orderId: 'paper_' + Date.now() }, 'paper');
        return new Response(JSON.stringify({
          ok: true,
          mode: 'paper',
          trade: params,
          orderId: 'paper_' + Date.now()
        }), {
          headers: { ...cors, 'content-type': 'application/json' }
        });
      }

      // Live trading requires explicit enablement
      if (!LIVEOK) {
        throw new Error('Live trading disabled. Set LIVE_TRADING_ENABLED=true');
      }

      // Get current price for quantity calculation
      const ticker = await bybitReq('GET', '/v5/market/tickers', { category: 'linear', symbol: params.symbol });
      if (!ticker.ok) throw new Error(`Failed to get price for ${params.symbol}`);
      
      const price = parseFloat(ticker.json.result.list[0].lastPrice);
      const qty = (params.amountUSD * params.leverage) / price;

      console.log(`Executing ${params.side} ${qty.toFixed(4)} ${params.symbol} @ ${price} (${params.amountUSD} USD, ${params.leverage}x)`);

      // Set position mode (One-Way)
      await bybitReq('POST', '/v5/position/switch-mode', {
        category: 'linear',
        symbol: params.symbol,
        positionMode: 0
      });

      // Set leverage
      await bybitReq('POST', '/v5/position/set-leverage', {
        category: 'linear',
        symbol: params.symbol,
        buyLeverage: String(params.leverage),
        sellLeverage: String(params.leverage),
      });

      // Create order
      const orderReq = {
        category: 'linear',
        symbol: params.symbol,
        side: params.side,
        orderType: params.orderType,
        timeInForce: params.orderType === 'Limit' ? 'GTC' : 'IOC',
        qty: qty.toFixed(4),
        reduceOnly: !!params.reduceOnly,
        positionIdx: 0
      };

      const create = await bybitReq('POST', '/v5/order/create', orderReq);
      
      if (!create.ok) {
        await logTrade(params, create.json, 'failed');
        throw new Error(`Bybit order error: ${create.json?.retCode} ${create.json?.retMsg}`);
      }

      await logTrade(params, create.json, 'filled');

      return new Response(JSON.stringify({
        ok: true,
        mode: 'live',
        trade: params,
        orderId: create.json.result.orderId,
        bybitResponse: create.json
      }), {
        headers: { ...cors, 'content-type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (e) {
    console.error('Trade executor error:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e),
      mode: { paper: PAPER, liveEnabled: LIVEOK, testnet: TESTNET }
    }), {
      headers: { ...cors, 'content-type': 'application/json' }, 
      status: 500 
    });
  }
});