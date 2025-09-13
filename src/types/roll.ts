export type Side = 'Buy' | 'Sell';

export interface RollRequest {
  symbol: string;           // e.g. "BTCUSDT"
  side: Side;               // "Buy" or "Sell"
  amountUSD: number;        // notional in USD
  clientId?: string;        // optional idempotency key
}

export interface RollResult {
  symbol: string;
  side: Side;
  entryPrice: number;
  leverage: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  baseQty: number;          // qty in base asset
  orderId: string;          // broker orderId
  tpOrderId?: string;
  slOrderId?: string;
  status: 'OPENED'|'REJECTED';
  raw?: any;
}

export interface RollError {
  error: string;
  details?: any;
}