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

export const SpotMargin = {
  state: () => call('/spot-margin/state'),
  switch: (spotMarginMode: "0"|"1") => call('/spot-margin/switch-mode', { 
    method: 'POST', 
    body: JSON.stringify({ spotMarginMode })
  }),
  setLeverage: (leverage: number) => call('/spot-margin/set-leverage', { 
    method: 'POST', 
    body: JSON.stringify({ leverage })
  }),
};

export const LoanCommon = {
  loanable: (q: {vipLevel?:string; currency?:string}={}) => 
    call(`/crypto-loan/common/loanable-data?${new URLSearchParams(q as any)}`),
  collateral: (q: {currency?:string}={}) => 
    call(`/crypto-loan/common/collateral-data?${new URLSearchParams(q as any)}`),
  maxReduce: (currency: string) => 
    call(`/crypto-loan/common/max-collateral-amount?currency=${encodeURIComponent(currency)}`),
  adjustLTV: (payload: {currency:string; amount:string|number; direction:"0"|"1"}) => 
    call('/crypto-loan/common/adjust-ltv', { method: 'POST', body: JSON.stringify(payload)}),
  history: (q: Record<string,string> = {}) => 
    call(`/crypto-loan/common/adjustment-history?${new URLSearchParams(q)}`),
  position: () => call('/crypto-loan/common/position'),
};

export const LoanFlexible = {
  borrow: (payload: {loanCurrency:string; loanAmount:string|number; collateralList?: any[]}) => 
    call('/crypto-loan/flexible/borrow', { method: 'POST', body: JSON.stringify(payload)}),
  repay: (payload: {loanCurrency:string; amount:string|number}) => 
    call('/crypto-loan/flexible/repay', { method: 'POST', body: JSON.stringify(payload)}),
  ongoing: (q: {loanCurrency?:string}={}) => 
    call(`/crypto-loan/flexible/ongoing-coin?${new URLSearchParams(q as any)}`),
  borrowHistory: (q: Record<string,string> = {}) => 
    call(`/crypto-loan/flexible/borrow-history?${new URLSearchParams(q)}`),
  repayHistory: (q: Record<string,string> = {}) => 
    call(`/crypto-loan/flexible/repayment-history?${new URLSearchParams(q)}`),
};

export const LoanFixed = {
  supplyQuote: (q: Record<string,string>) => 
    call(`/crypto-loan/fixed/supply-order-quote?${new URLSearchParams(q)}`),
  borrowQuote: (q: Record<string,string>) => 
    call(`/crypto-loan/fixed/borrow-order-quote?${new URLSearchParams(q)}`),
  borrow: (payload: {orderCurrency:string; orderAmount:string|number; annualRate:string|number; term:string|number; autoRepay?: "true"|"false"; collateralList?: any }) => 
    call('/crypto-loan/fixed/borrow', { method: 'POST', body: JSON.stringify(payload)}),
  supply: (payload: {orderCurrency:string; orderAmount:string|number; annualRate:string|number; term:string|number}) => 
    call('/crypto-loan/fixed/supply', { method: 'POST', body: JSON.stringify(payload)}),
  cancelBorrow: (orderId: string) => 
    call('/crypto-loan/fixed/borrow-order-cancel', { method: 'POST', body: JSON.stringify({ orderId })}),
  cancelSupply: (orderId: string) => 
    call('/crypto-loan/fixed/supply-order-cancel', { method: 'POST', body: JSON.stringify({ orderId })}),
};

// Export types for use in components
export type { BybitResponse };
export type { OrderParams, CancelParams };