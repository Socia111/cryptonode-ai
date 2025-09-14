// Deno-compatible Bybit V5 API client
// Uses Web Crypto API instead of Node.js crypto

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function signBybitV5(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function bybitRequest(
  endpoint: string, 
  body: Record<string, any>, 
  apiKey: string, 
  apiSecret: string, 
  baseUrl: string, 
  recvWindow = "5000"
): Promise<any> {
  const timestamp = Date.now().toString();
  const bodyStr = JSON.stringify(body);
  const preSign = timestamp + apiKey + recvWindow + bodyStr;
  const sig = await signBybitV5(preSign, apiSecret);

  console.log(`📡 Bybit API call: ${endpoint}`, { body, timestamp });

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-SIGN": sig,
      "X-BAPI-SIGN-TYPE": "2",
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindow,
    },
    body: bodyStr,
  });

  const json = await res.json().catch(() => ({}));
  
  if (!res.ok || (json.retCode && json.retCode !== 0)) {
    console.error(`❌ Bybit API error:`, { endpoint, status: res.status, json });
    throw new Error(`Bybit API error: ${json.retCode ?? res.status} - ${json.retMsg ?? res.statusText}`);
  }

  console.log(`✅ Bybit API success:`, { endpoint, result: json });
  return json;
}

export { corsHeaders };