// deno-lint-ignore-file no-explicit-any
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

  // V5 signature: timestamp + api_key + recv_window + (queryString or body)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    // 1) Quick config echo
    const mode = { paper: PAPER, liveEnabled: LIVEOK, testnet: TESTNET, base: BASE, hasKey: !!KEY };

    // 2) Hit a harmless private endpoint to validate signature & perms
    // GET /v5/account/wallet-balance?accountType=UNIFIED
    const check = await bybitReq('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });

    return new Response(JSON.stringify({ ok: check.ok, mode, ret: check.json }), {
      headers: { ...cors, 'content-type': 'application/json' },
      status: check.ok ? 200 : 400
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), {
      headers: { ...cors, 'content-type': 'application/json' }, status: 500
    });
  }
});