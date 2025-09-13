export type OrderType = 'Market' | 'Limit';
export type OrderTIF  = 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
export type Side      = 'Buy' | 'Sell';

export interface ExecuteParams {
  symbol: string;        // e.g. "BTCUSDT"
  side: Side;            // 'Buy' | 'Sell'
  amountUSD: number;     // 0.10 .. 100
  leverage: number;      // 1..100

  // Optional order controls
  orderType?: OrderType; // default 'Market'
  timeInForce?: OrderTIF;// default 'PostOnly' if Limit
  price?: number;        // required if Limit
  reduceOnly?: boolean;

  // Optional risk params
  stopLoss?: number;     // price
  takeProfit?: number;   // price
  scalpMode?: boolean;
  entryPrice?: number;

  // For debugging/telemetry
  meta?: Record<string, unknown>;
}

export interface ExecResult {
  ok: boolean;
  message?: string;
  data?: any;
  error?: string;
  status?: number;
  // legacy field, kept for compatibility with old UI
  code?: string;
}

// Defensive normalizer: accepts 'BUY'/'SELL'/'Long'/'Short'
export function normalizeSide(v: string): Side {
  const s = (v || '').toString().trim().toLowerCase();
  if (s === 'buy' || s === 'long')  return 'Buy';
  if (s === 'sell' || s === 'short') return 'Sell';
  // fallback safe
  return 'Buy';
}