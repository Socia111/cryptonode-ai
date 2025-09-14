// Deno Edge Function: trade-connection-test
// Verifies Bybit key/secret + environment by calling /v5/user/query-api

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const TESTNET = (Deno.env.get('BYBIT_TESTNET') ?? 'false').toLowerCase() === 'true';
  const BASE = Deno.env.get('BYBIT_BASE') ?? (TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com');
  const KEY = Deno.env.get('BYBIT_API_KEY') ?? Deno.env.get('BYBIT_KEY') ?? '';
  const SEC = Deno.env.get('BYBIT_API_SECRET') ?? Deno.env.get('BYBIT_SECRET') ?? '';
  const RECV = Deno.env.get('BYBIT_RECV_WINDOW') ?? '5000';

  console.log(`🔍 Connection test - Base: ${BASE}, Testnet: ${TESTNET}, HasKey: ${!!KEY}, HasSecret: ${!!SEC}`);

  if (!KEY || !SEC) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'BYBIT_API_KEY/SECRET missing in secrets',
      env: { base: BASE, testnet: TESTNET, hasKey: !!KEY, hasSecret: !!SEC }
    }), {
      status: 400, headers: { ...cors, 'content-type': 'application/json' }
    });
  }

  try {
    // Empty body per Bybit docs
    const { ok, status, json } = await bybitV5('/v5/user/query-api', {}, KEY, SEC, BASE, RECV);
    
    console.log(`📡 Bybit response: ${JSON.stringify({ ok, status, retCode: json?.retCode, retMsg: json?.retMsg })}`);

    return new Response(JSON.stringify({
      ok,
      status,
      retCode: json?.retCode,
      retMsg: json?.retMsg,
      result: json?.result,
      env: { base: BASE, testnet: TESTNET, hasKey: !!KEY, hasSecret: !!SEC },
      diagnosis: json?.retCode === 0 ? 'SUCCESS - Key is valid' :
                json?.retCode === 10005 ? 'FAILED - Invalid API key or wrong environment' :
                json?.retCode === 10003 ? 'FAILED - Invalid API signature' :
                json?.retCode === 10004 ? 'FAILED - Invalid timestamp' :
                `FAILED - Bybit error code ${json?.retCode}`
    }, null, 2), { headers: { ...cors, 'content-type': 'application/json' } });
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      env: { base: BASE, testnet: TESTNET, hasKey: !!KEY, hasSecret: !!SEC }
    }), {
      status: 500, headers: { ...cors, 'content-type': 'application/json' }
    });
  }
});