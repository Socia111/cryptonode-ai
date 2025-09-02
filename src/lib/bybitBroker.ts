// Bybit Broker SDK for frontend usage
const BASE = "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-broker";
// NOTE: In production, use environment variables instead of hardcoded keys
// const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

interface BybitResponse<T = any> {
  success: boolean;
  error?: string;
  retCode?: string | number;
  retMsg?: string;
  data?: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  console.log(`[BybitBroker] ${init?.method || 'GET'} ${url}`);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${ANON_KEY}`,
        ...(init?.headers || {})
      }
    });

    let body: any = null;
    try { 
      body = await res.json(); 
    } catch { 
      body = await res.text(); 
    }

    if (!res.ok) {
      const errorMsg = body?.error || body?.retMsg || `HTTP ${res.status}: ${res.statusText}`;
      console.error(`[BybitBroker] Error:`, { status: res.status, body });
      throw new Error(errorMsg);
    }

    console.log(`[BybitBroker] Success:`, body);
    return body as T;
  } catch (error) {
    console.error(`[BybitBroker] Request failed:`, error);
    throw error;
  }
}

interface OrderParams {
  category: 'linear' | 'spot';
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  positionIdx?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopLoss?: string;
  takeProfit?: string;
}

interface CancelParams {
  category: 'linear' | 'spot';
  symbol: string;
  orderId: string;
}

export const BybitBroker = {
  // Health checks
  ping: () => call<{ok: true}>('/ping'),
  env: () => call('/env'),
  testConnection: (debug = false) => call(`/test-connection${debug ? '?debug=1' : ''}`),
  
  // Account info
  status: () => call('/', { 
    method: 'POST', 
    body: JSON.stringify({ action: 'status' }) 
  }),
  
  // Market data
  tickers: (params?: { category?: string; symbol?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return call(`/tickers${query ? `?${query}` : ''}`);
  },
  
  // Positions
  positions: (params?: { category?: string; symbol?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return call(`/positions${query ? `?${query}` : ''}`);
  },
  
  // Orders
  orders: (params?: { category?: string; symbol?: string; openOnly?: boolean }) => {
    const query = new URLSearchParams({
      ...(params as any),
      ...(params?.openOnly !== undefined ? { openOnly: params.openOnly ? '1' : '0' } : {})
    }).toString();
    return call(`/orders${query ? `?${query}` : ''}`);
  },
  
  // Trading
  placeOrder: (params: OrderParams) => call('/order', { 
    method: 'POST', 
    body: JSON.stringify(params) 
  }),
  
  cancelOrder: (params: CancelParams) => call('/cancel', { 
    method: 'POST', 
    body: JSON.stringify(params) 
  }),
  
  // Legacy aliases for backward compatibility
  place: (params: OrderParams) => BybitBroker.placeOrder(params),
  cancel: (params: CancelParams) => BybitBroker.cancelOrder(params)
};

// Export types for use in components
export type { BybitResponse };
export type { OrderParams, CancelParams };