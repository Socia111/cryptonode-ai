import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const baseCors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // or reflect origin below
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bapi-api-key, x-bapi-sign, x-bapi-timestamp, x-bapi-recv-window, x-bapi-sign-type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin", // cache-safe if you decide to reflect origin
};

// Alias for safety - ensures all existing code works
const corsHeaders = baseCors;

// Environment configuration - read the actual values, not the names
function getEnvOrNull(key: string): string | null {
  try {
    return Deno.env.get(key) ?? null;
  } catch {
    return null;
  }
}

// Error handling
class ConfigError extends Error {
  code = "CONFIG_ERROR";
  constructor(msg: string, public details?: Record<string, unknown>) {
    super(msg);
  }
}

function mask(val: string | null, keep = 3): string {
  if (!val) return "None";
  if (val.length <= keep) return "*".repeat(val.length);
  return val.slice(0, keep) + "*".repeat(Math.max(0, val.length - keep));
}

// Initialize Supabase client safely
let supabase: any = null;
try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// Bybit V5 API Configuration
const BYBIT_KEY = Deno.env.get("BYBIT_API_KEY")!;
const BYBIT_SEC = Deno.env.get("BYBIT_API_SECRET")!;
const BASE = "https://api.bybit.com";        // mainnet
const RECV = "5000"; // ms

// V5 HMAC signing
function hmacHex(secret: string, text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"])
    .then(k => crypto.subtle.sign("HMAC", k, enc))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join(""));
}

// V5 Request handler
async function v5Request(
  method: "GET" | "POST",
  path: string,                 // e.g. "/v5/market/tickers"
  query: Record<string,string|number|undefined> = {},
  body: Record<string,unknown> | null = null
) {
  const ts = Date.now().toString();

  // Build query/body strings
  const qs = Object.entries(query)
    .filter(([,v]) => v !== undefined && v !== null && v !== "")
    .map(([k,v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${BASE}${path}${qs ? `?${qs}` : ""}`;

  const jsonBody = body ? JSON.stringify(body) : "";
  // V5 string-to-sign
  const toSign = method === "GET"
    ? `${ts}${BYBIT_KEY}${RECV}${qs}`
    : `${ts}${BYBIT_KEY}${RECV}${jsonBody}`;

  const sign = await hmacHex(BYBIT_SEC, toSign);

  const res = await fetch(url, {
    method,
    headers: {
      "X-BAPI-API-KEY": BYBIT_KEY,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": RECV,
      "X-BAPI-SIGN": sign,
      "Content-Type": "application/json",
    },
    body: body ? jsonBody : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.retCode !== 0) {
    console.error(`Bybit API Error:`, {
      status: res.status,
      retCode: data?.retCode,
      retMsg: data?.retMsg,
      path,
      method
    });
    throw new Error(`Bybit error (${res.status}) retCode=${data?.retCode} retMsg=${data?.retMsg}`);
  }
  return data;
}

// Public API endpoints (no auth needed)
export const getOrderbook = (symbol: string, category="linear", limit=25) =>
  fetch(`${BASE}/v5/market/orderbook?category=${category}&symbol=${symbol}&limit=${limit}`).then(r=>r.json());

export const getTickers = (symbol: string, category="linear") =>
  fetch(`${BASE}/v5/market/tickers?category=${category}&symbol=${symbol}`).then(r=>r.json());

export const getRecentTrades = (symbol: string, category="linear", limit=50) =>
  fetch(`${BASE}/v5/market/recent-trade?category=${category}&symbol=${symbol}&limit=${limit}`).then(r=>r.json());

// Private API endpoints (signed)
export const getWalletBalance = (accountType="UNIFIED") =>
  v5Request("GET", "/v5/account/wallet-balance", { accountType });

export const listPositions = (symbol?: string) =>
  v5Request("GET", "/v5/position/list", { category: "linear", symbol });

export const placeOrder = (p: {
  symbol: string; side: "Buy"|"Sell"; orderType: "Limit"|"Market";
  qty: string; price?: string; timeInForce?: "GTC"|"IOC"|"FOK"|"PostOnly";
  positionIdx?: 0|1|2; reduceOnly?: boolean;
}) => v5Request("POST", "/v5/order/create", {}, { category:"linear", timeInForce:"GTC", ...p });

export const cancelOrder = (symbol: string, idOrLink: {orderId?:string; orderLinkId?:string}) =>
  v5Request("POST", "/v5/order/cancel", {}, { category:"linear", symbol, ...idOrLink });

export const getOpenOrders = (q: {symbol?:string;baseCoin?:string; settleCoin?:string; openOnly?:0|1|2}={}) =>
  v5Request("GET", "/v5/order/realtime", { category:"linear", ...q });

// Helper functions for hardened handler
function readSecrets() {
  try {
    const apiKey = Deno.env.get("BYBIT_API_KEY") ?? "";
    const apiSecret = Deno.env.get("BYBIT_API_SECRET") ?? "";
    return { apiKey, apiSecret };
  } catch {
    return { apiKey: "", apiSecret: "" };
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...baseCors, "content-type": "application/json; charset=utf-8" },
  });
}

async function validateBybitCredsSimple(opts: { live: boolean }) {
  const { apiKey, apiSecret } = readSecrets();
  const summary = {
    envSeen: { BYBIT_API_KEY: !!apiKey, BYBIT_API_SECRET: !!apiSecret },
    previews: { BYBIT_API_KEY: mask(apiKey), BYBIT_API_SECRET: mask(apiSecret) },
  };

  const missing: string[] = [];
  if (!apiKey) missing.push("BYBIT_API_KEY");
  if (!apiSecret) missing.push("BYBIT_API_SECRET");
  if (missing.length) {
    throw new ConfigError("Missing required environment variables", { missing, summary });
  }

  if (opts.live) {
    try {
      // Test with a simple balance check
      const balanceResult = await getWalletBalance("UNIFIED");
      console.log('✅ Live credential test passed:', balanceResult.retCode === 0);
    } catch (error: any) {
      throw new ConfigError("Bybit live credential check failed", {
        error: error.message,
        summary,
        tips: [
          "Verify key permissions (Read-Write, Unified Trading).",
          "If IP-restricted, allow your function's egress IP.",
          "Use server time if you see retCode 10002.",
        ],
      });
    }
  }

  return summary;
}

interface TradingConfig {
  enabled: boolean;
  max_position_size: number;
  risk_per_trade: number; // Percentage of balance
  max_open_positions: number;
  min_confidence_score: number;
  timeframes: string[];
  symbols_whitelist?: string[];
  symbols_blacklist?: string[];
}

interface AutoTradeSignal {
  id: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  sl: number;
  tp: number;
  score: number;
  timeframe: string;
  created_at: string;
}

interface Position {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  pnl: number;
  created_at: string;
}

type HttpMethod = "GET" | "POST" | "DELETE";

interface BybitV5ClientOptions {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  recvWindow?: number;
  getTime?: () => Promise<number>;
}

class BybitV5Client {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private recvWindow: number;
  private getTime?: () => Promise<number>;

  constructor(opts: BybitV5ClientOptions) {
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.baseUrl = opts.baseUrl ?? "https://api.bybit.com";
    this.recvWindow = opts.recvWindow ?? 5000;
    this.getTime = opts.getTime;
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("Bybit credentials missing: apiKey/apiSecret are required.");
    }
  }

  /** Public GET (no auth) */
  public async publicGet<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const qs = this.buildQueryString(params);
    const url = `${this.baseUrl}${endpoint}${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /** Private (auth) GET/POST/DELETE */
  public async privateRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    // 1) Timestamp (server time optional for skew issues)
    const timestamp = (this.getTime ? await this.getTime() : Date.now()).toString();
    const recvWindowStr = String(this.recvWindow);

    // 2) Build payloads
    const isGet = method === "GET";
    const query = isGet ? this.buildQueryString(params) : "";
    const body = isGet ? "" : this.stableJSONStringify(params);

    // 3) Pre-sign per Bybit v5:
    // presign = timestamp + api_key + recv_window + (queryString || body)
    const presign = timestamp + this.apiKey + recvWindowStr + (isGet ? query : body);
    const sign = await this.hmacSha256Hex(presign, this.apiSecret);

    // 4) Headers
    const headers: Record<string, string> = {
      "X-BAPI-API-KEY": this.apiKey,
      "X-BAPI-SIGN": sign,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": recvWindowStr,
      "X-BAPI-SIGN-TYPE": "2",
    };
    if (!isGet) headers["Content-Type"] = "application/json";

    // 5) URL + fetch
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ""}`;
    const res = await fetch(url, {
      method,
      headers,
      body: isGet ? undefined : body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

    // 6) Bybit returns JSON always
    const data = JSON.parse(text) as T;
    
    // Enhanced error handling for Bybit API responses
    if ((data as any).retCode !== 0) {
      let errorMessage = (data as any).retMsg || 'Unknown API error';
      
      switch ((data as any).retCode) {
        case 10010:
          errorMessage = `Unmatched IP, please check your API key's bound IP addresses.`;
          break;
        case 10003:
          errorMessage = 'Invalid API key. Please check your credentials.';
          break;
        case 10004:
          errorMessage = 'Invalid API signature. Please check your API secret.';
          break;
        case 10005:
          errorMessage = 'Permission denied. Please check your API key permissions.';
          break;
        case 170130:
          errorMessage = 'Insufficient wallet balance.';
          break;
        case 170131:
          errorMessage = 'Risk limit exceeded.';
          break;
      }
      
      console.error('Bybit API returned error:', {
        endpoint,
        method,
        retCode: (data as any).retCode,
        retMsg: (data as any).retMsg,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Bybit API error (${(data as any).retCode}): ${errorMessage}`);
    }
    
    return data;
  }

  // Convenience wrappers
  public privateGet<T = any>(endpoint: string, params: Record<string, any> = {}) {
    return this.privateRequest<T>("GET", endpoint, params);
  }
  public privatePost<T = any>(endpoint: string, params: Record<string, any> = {}) {
    return this.privateRequest<T>("POST", endpoint, params);
  }
  public privateDelete<T = any>(endpoint: string, params: Record<string, any> = {}) {
    return this.privateRequest<T>("DELETE", endpoint, params);
  }

  /** Stable querystring: sort keys asc, stringify values */
  private buildQueryString(params: Record<string, any>): string {
    const keys = Object.keys(params);
    if (keys.length === 0) return "";
    keys.sort();
    const usp = new URLSearchParams();
    for (const k of keys) {
      let v = params[k];
      if (typeof v === "bigint") v = v.toString();
      if (v === undefined || v === null) continue;
      usp.append(k, String(v));
    }
    return usp.toString();
  }

  /** Stable JSON stringify: sort keys, no spaces */
  private stableJSONStringify(obj: Record<string, any>): string {
    const keys = Object.keys(obj).sort();
    const normalized: Record<string, any> = {};
    for (const k of keys) {
      const v = obj[k];
      normalized[k] = typeof v === "bigint" ? v.toString() : v;
    }
    return JSON.stringify(normalized);
  }

  /** HMAC-SHA256 -> lowercase hex (Node or Browser) */
  private async hmacSha256Hex(message: string, secret: string): Promise<string> {
    // Browser/Deno
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
      return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("Crypto.subtle not available");
  }
  async getAccountBalance(): Promise<any> {
    return this.privateGet('/v5/account/wallet-balance', {
      accountType: 'UNIFIED'
    });
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.privateGet('/v5/position/list', {
      category: 'linear'
    });
    
    return response.result.list.map((pos: any) => ({
      symbol: pos.symbol,
      side: pos.side,
      size: parseFloat(pos.size),
      entry_price: parseFloat(pos.avgPrice),
      stop_loss: parseFloat(pos.stopLoss || 0),
      take_profit: parseFloat(pos.takeProfit || 0),
      pnl: parseFloat(pos.unrealisedPnl),
      created_at: pos.createdTime
    }));
  }

  async placeOrder(orderParams: {
    symbol: string;
    side: 'Buy' | 'Sell';
    orderType: 'Market' | 'Limit';
    qty: string;
    price?: string;
    stopLoss?: string;
    takeProfit?: string;
  }): Promise<any> {
    const params = {
      category: 'linear',
      symbol: orderParams.symbol,
      side: orderParams.side,
      orderType: orderParams.orderType,
      qty: orderParams.qty,
      ...(orderParams.price && { price: orderParams.price }),
      ...(orderParams.stopLoss && { stopLoss: orderParams.stopLoss }),
      ...(orderParams.takeProfit && { takeProfit: orderParams.takeProfit }),
      timeInForce: 'GTC'
    };

    return this.privatePost('/v5/order/create', params);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.privatePost('/v5/order/cancel', {
      category: 'linear',
      symbol,
      orderId
    });
  }
}

// Bybit V5 REST API Helper Functions

async function createOrder(
  client: BybitV5Client,
  params: {
    symbol: string;              // "BTCUSDT"
    side: "Buy" | "Sell";
    orderType: "Market" | "Limit";
    qty: string;                 // string per Bybit
    timeInForce?: "GTC" | "IOC" | "FOK" | "PostOnly";
    price?: string;              // for Limit
    reduceOnly?: boolean;
    takeProfit?: string;
    stopLoss?: string;
    tpSlMode?: "Partial" | "Full";
  }
) {
  return client.privatePost("/v5/order/create", {
    category: "linear",
    ...params,
  });
}

async function cancelOrderV5(client: BybitV5Client, symbol: string, orderId?: string) {
  return client.privatePost("/v5/order/cancel", {
    category: "linear",
    symbol,
    ...(orderId ? { orderId } : {}),
  });
}

class AutomatedTradingEngine {
  private trader: BybitV5Client;
  private config: TradingConfig;
  private isRunning: boolean = false;
  private activePositions: Map<string, Position> = new Map();

  constructor(trader: BybitV5Client, config: TradingConfig) {
    this.trader = trader;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Automated trading engine is already running');
      return;
    }

    console.log('🚀 Starting automated trading engine...');
    this.isRunning = true;

    try {
      // Load current positions
      await this.loadActivePositions();
      
      // Start main trading loop
      await this.runTradingLoop();
      
    } catch (error) {
      console.error('❌ Failed to start automated trading engine:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping automated trading engine...');
    this.isRunning = false;
  }

  private async loadActivePositions(): Promise<void> {
    try {
      const positions = await this.trader.getPositions();
      
      for (const position of positions) {
        if (position.size > 0) {
          this.activePositions.set(position.symbol, position);
        }
      }
      
      console.log(`📊 Loaded ${this.activePositions.size} active positions`);
    } catch (error) {
      console.error('Failed to load active positions:', error);
    }
  }

  private async runTradingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check for new signals
        await this.processNewSignals();
        
        // Manage existing positions
        await this.managePositions();
        
        // Risk management checks
        await this.performRiskChecks();
        
        // Wait before next iteration (30 seconds)
        await new Promise(resolve => setTimeout(resolve, 30000));
        
      } catch (error) {
        console.error('Error in trading loop:', error);
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute on error
      }
    }
  }

  private async processNewSignals(): Promise<void> {
    if (!supabase) return;

    try {
      // Get recent high-confidence signals
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .gte('score', this.config.min_confidence_score)
        .gte('created_at', fiveMinutesAgo)
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to fetch signals:', error);
        return;
      }

      console.log(`📡 Found ${signals?.length || 0} new signals to process`);

      for (const signal of signals || []) {
        await this.processSignal(signal);
      }

    } catch (error) {
      console.error('Error processing new signals:', error);
    }
  }

  private async processSignal(signal: AutoTradeSignal): Promise<void> {
    try {
      // Check if we already have a position in this symbol
      if (this.activePositions.has(signal.symbol)) {
        console.log(`⏭️ Skipping ${signal.symbol} - already have position`);
        return;
      }

      // Check if we're at max open positions
      if (this.activePositions.size >= this.config.max_open_positions) {
        console.log('⏭️ Skipping signal - at max open positions');
        return;
      }

      // Check symbol whitelist/blacklist
      if (!this.isSymbolAllowed(signal.symbol)) {
        console.log(`⏭️ Skipping ${signal.symbol} - not in allowed symbols`);
        return;
      }

      console.log(`📈 Processing signal: ${signal.symbol} ${signal.direction} (score: ${signal.score})`);

      // Calculate position size
      const balance = await this.trader.getAccountBalance();
      const availableBalance = this.getAvailableBalance(balance);
      const positionSize = this.calculatePositionSize(availableBalance, signal);

      if (positionSize < 5) { // Minimum $5 position
        console.log(`⏭️ Skipping ${signal.symbol} - position size too small: $${positionSize}`);
        return;
      }

      // Place order
      const orderResult = await this.trader.placeOrder({
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
        orderType: 'Market',
        qty: this.calculateQuantity(positionSize, signal.price).toString(),
        stopLoss: signal.sl?.toString(),
        takeProfit: signal.tp?.toString()
      });

      console.log(`✅ Order placed for ${signal.symbol}:`, orderResult);

      // Track the new position
      const newPosition: Position = {
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
        size: positionSize,
        entry_price: signal.price,
        stop_loss: signal.sl,
        take_profit: signal.tp,
        pnl: 0,
        created_at: new Date().toISOString()
      };

      this.activePositions.set(signal.symbol, newPosition);

    } catch (error) {
      console.error(`❌ Failed to process signal for ${signal.symbol}:`, error);
    }
  }

  private async managePositions(): Promise<void> {
    for (const [symbol, position] of this.activePositions.entries()) {
      try {
        // Get current position from exchange
        const currentPositions = await this.trader.getPositions();
        const currentPosition = currentPositions.find(p => p.symbol === symbol);

        if (!currentPosition || currentPosition.size === 0) {
          // Position was closed, remove from tracking
          this.activePositions.delete(symbol);
          console.log(`📤 Position closed: ${symbol}`);
          continue;
        }

        // Update PnL
        position.pnl = currentPosition.pnl;

        // Check for stop loss or take profit triggers
        // (This would be handled by the exchange if we set SL/TP on the order)

      } catch (error) {
        console.error(`Error managing position ${symbol}:`, error);
      }
    }
  }

  private async performRiskChecks(): Promise<void> {
    try {
      const balance = await this.trader.getAccountBalance();
      const availableBalance = this.getAvailableBalance(balance);
      
      // Check total exposure
      const totalExposure = Array.from(this.activePositions.values())
        .reduce((sum, pos) => sum + Math.abs(pos.size), 0);

      if (totalExposure > availableBalance * 0.8) { // 80% max exposure
        console.log('⚠️ High exposure detected, reducing position sizes');
        // Implement position size reduction logic here
      }

      // Check daily loss limits
      const dailyPnL = Array.from(this.activePositions.values())
        .reduce((sum, pos) => sum + pos.pnl, 0);

      if (dailyPnL < -availableBalance * 0.05) { // 5% daily loss limit
        console.log('🛑 Daily loss limit reached, stopping trading');
        this.isRunning = false;
      }

    } catch (error) {
      console.error('Error performing risk checks:', error);
    }
  }

  private isSymbolAllowed(symbol: string): boolean {
    if (this.config.symbols_blacklist?.includes(symbol)) {
      return false;
    }
    
    if (this.config.symbols_whitelist && this.config.symbols_whitelist.length > 0) {
      return this.config.symbols_whitelist.includes(symbol);
    }
    
    return true;
  }

  private getAvailableBalance(balanceData: any): number {
    try {
      const usdtBalance = balanceData?.result?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT');
      return parseFloat(usdtBalance?.availableToWithdraw || '0');
    } catch {
      return 0;
    }
  }

  private calculatePositionSize(availableBalance: number, signal: AutoTradeSignal): number {
    const maxRiskAmount = availableBalance * this.config.risk_per_trade;
    const maxPositionSize = Math.min(maxRiskAmount, this.config.max_position_size);
    
    // Adjust based on signal confidence
    const confidenceMultiplier = Math.min(signal.score / 100, 1);
    
    return maxPositionSize * confidenceMultiplier;
  }

  private calculateQuantity(positionSize: number, price: number): number {
    return Math.floor((positionSize / price) * 100000) / 100000; // Round to 5 decimal places
  }

  async start() {
    if (!this.config.enabled) {
      console.log('Automated trading is disabled');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Automated trading engine started');
    
    // Start monitoring loop
    this.monitorSignals();
    this.monitorPositions();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Automated trading engine stopped');
  }

  private async monitorSignals(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNewSignals();
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
      } catch (error) {
        console.error('Error monitoring signals:', error);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on error
      }
    }
  }

  private async monitorPositions(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.updatePositions();
        await this.checkStopLossAndTakeProfit();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      } catch (error) {
        console.error('Error monitoring positions:', error);
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s on error
      }
    }
  }

  private async processNewSignals(): Promise<void> {
    // Get latest signals from the database
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
      .gte('score', this.config.min_confidence_score)
      .in('timeframe', this.config.timeframes)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch signals: ${error.message}`);
    }

    if (!signals || signals.length === 0) {
      return;
    }

    console.log(`📊 Found ${signals.length} new signals to process`);

    for (const signal of signals) {
      await this.evaluateAndExecuteSignal(signal);
    }
  }

  private async evaluateAndExecuteSignal(signal: any): Promise<void> {
    try {
      // Check if we already have a position for this symbol
      if (this.activePositions.has(signal.symbol)) {
        console.log(`⏭️ Skipping ${signal.symbol} - position already exists`);
        return;
      }

      // Check position limits
      if (this.activePositions.size >= this.config.max_open_positions) {
        console.log(`⏭️ Skipping ${signal.symbol} - max positions reached`);
        return;
      }

      // Apply filters
      if (!this.passesFilters(signal)) {
        console.log(`⏭️ Skipping ${signal.symbol} - failed filters`);
        return;
      }

      // Calculate position size
      const positionSize = await this.calculatePositionSize(signal);
      if (positionSize <= 0) {
        console.log(`⏭️ Skipping ${signal.symbol} - invalid position size`);
        return;
      }

      // Execute trade
      await this.executeTrade(signal, positionSize);

    } catch (error) {
      console.error(`Error processing signal for ${signal.symbol}:`, error);
      
      // Log error to database
      await supabase.from('errors_log').insert({
        where_at: 'automated_trading_engine',
        symbol: signal.symbol,
        details: {
          error: error.message,
          signal_id: signal.id,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private passesFilters(signal: any): boolean {
    // Symbol filter - allow all symbols by default unless specifically configured
    const RAW_ALLOWED = (Deno.env.get('ALLOWED_SYMBOLS') ?? '').trim();
    const ALLOW_ALL = RAW_ALLOWED === '' || RAW_ALLOWED === '*' || RAW_ALLOWED.toUpperCase() === 'ALL';
    
    if (!ALLOW_ALL && this.config.symbols_whitelist && this.config.symbols_whitelist.length > 0) {
      if (!this.config.symbols_whitelist.includes(signal.symbol)) {
        return false;
      }
    }

    // Blacklist check
    if (this.config.symbols_blacklist && this.config.symbols_blacklist.length > 0) {
      if (this.config.symbols_blacklist.includes(signal.symbol)) {
        return false;
      }
    }

    // Confidence score check
    if (signal.score < this.config.min_confidence_score) {
      return false;
    }

    return true;
  }

  private async calculatePositionSize(signal: any): Promise<number> {
    try {
      // Get account balance
      const balanceResponse = await this.trader.getAccountBalance();
      const usdtBalance = parseFloat(
        balanceResponse.result.list[0]?.coin?.find((c: any) => c.coin === 'USDT')?.walletBalance || '0'
      );

      if (usdtBalance <= 0) {
        console.log('❌ Insufficient USDT balance');
        return 0;
      }

      // Calculate risk amount
      const riskAmount = usdtBalance * (this.config.risk_per_trade / 100);
      
      // Calculate position size based on stop loss distance
      const stopLossDistance = Math.abs(signal.price - signal.sl);
      const positionValue = riskAmount / (stopLossDistance / signal.price);
      
      // Apply max position size limit
      const maxPositionValue = usdtBalance * (this.config.max_position_size / 100);
      const finalPositionValue = Math.min(positionValue, maxPositionValue);
      
      // Convert to quantity
      const quantity = finalPositionValue / signal.price;
      
      console.log(`💰 Position sizing for ${signal.symbol}:`, {
        balance: usdtBalance,
        riskAmount,
        positionValue: finalPositionValue,
        quantity
      });

      return quantity;
    } catch (error) {
      console.error('Error calculating position size:', error);
      return 0;
    }
  }

  private async executeTrade(signal: any, quantity: number): Promise<void> {
    try {
      console.log(`🎯 Executing trade for ${signal.symbol}:`, {
        direction: signal.direction,
        price: signal.price,
        quantity,
        stopLoss: signal.sl,
        takeProfit: signal.tp
      });

      // Place market order
      const orderResult = await this.trader.placeOrder({
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
        orderType: 'Market',
        qty: quantity.toFixed(8),
        stopLoss: signal.sl.toString(),
        takeProfit: signal.tp.toString()
      });

      if (orderResult.result) {
        // Store position in our tracking
        const position: Position = {
          symbol: signal.symbol,
          side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
          size: quantity,
          entry_price: signal.price,
          stop_loss: signal.sl,
          take_profit: signal.tp,
          pnl: 0,
          created_at: new Date().toISOString()
        };

        this.activePositions.set(signal.symbol, position);

        // Log successful trade
        await supabase.from('trades').insert({
          order_id: orderResult.result.orderId,
          trade_ts: new Date().toISOString(),
          price: signal.price,
          qty: quantity,
          fee: 0 // Will be updated later
        });

        console.log(`✅ Trade executed successfully for ${signal.symbol}`);
        
        // Mark signal as processed
        await supabase
          .from('signals')
          .update({ status: 'executed' })
          .eq('id', signal.id);

      } else {
        throw new Error('Order execution failed');
      }

    } catch (error) {
      console.error(`❌ Failed to execute trade for ${signal.symbol}:`, error);
      throw error;
    }
  }

  private async updatePositions(): Promise<void> {
    try {
      const positions = await this.trader.getPositions();
      
      // Update our tracking with latest position data
      for (const position of positions) {
        if (this.activePositions.has(position.symbol)) {
          this.activePositions.set(position.symbol, position);
        }
      }

      // Remove closed positions
      for (const [symbol, position] of this.activePositions) {
        const stillOpen = positions.find(p => p.symbol === symbol);
        if (!stillOpen) {
          this.activePositions.delete(symbol);
          console.log(`📊 Position closed: ${symbol}`);
        }
      }

    } catch (error) {
      console.error('Error updating positions:', error);
    }
  }

  private async checkStopLossAndTakeProfit(): Promise<void> {
    // This would implement trailing stops and dynamic SL/TP adjustments
    // For now, relying on Bybit's built-in SL/TP orders
    for (const [symbol, position] of this.activePositions) {
      console.log(`📈 ${symbol}: PnL: ${position.pnl}, Size: ${position.size}`);
    }
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      activePositions: this.activePositions.size,
      config: this.config,
      positions: Array.from(this.activePositions.values())
    };
  }
}

// Credential validation function
async function validateBybitCreds(opts?: { live?: boolean }) {
  const apiKey = getEnvOrNull("BYBIT_API_KEY");
  const apiSecret = getEnvOrNull("BYBIT_API_SECRET");

  const summary = {
    envSeen: {
      "BYBIT_API_KEY": !!apiKey,
      "BYBIT_API_SECRET": !!apiSecret,
    },
    previews: {
      "BYBIT_API_KEY": mask(apiKey, 4),
      "BYBIT_API_SECRET": mask(apiSecret, 4),
    },
  };

  // Fail fast if missing
  const missing: string[] = [];
  if (!apiKey) missing.push("BYBIT_API_KEY");
  if (!apiSecret) missing.push("BYBIT_API_SECRET");

  if (missing.length) {
    console.error("❌ Missing env vars:", missing.join(", "));
    throw new ConfigError("Missing required environment variables", {
      missing,
      summary,
      hint: "Set BYBIT_API_KEY and BYBIT_API_SECRET in your function/env settings, remove any old names like BYBIT_SECRET_KEY, then redeploy.",
    });
  }

  // Optional live validation
  if (opts?.live) {
    const baseUrl = "https://api.bybit.com";
    const recvWindow = "5000";
    const ts = Date.now().toString();

    // Lightweight private GET: wallet-balance with minimal params
    const params = { accountType: "UNIFIED" };
    const keys = Object.keys(params).sort();
    const usp = new URLSearchParams();
    for (const k of keys) {
      const v = params[k as keyof typeof params];
      if (v !== undefined && v !== null) usp.append(k, String(v));
    }
    const qs = usp.toString();
    
    const presign = ts + apiKey + recvWindow + qs;
    
    // HMAC signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(apiSecret!),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(presign));
    const sign = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");

    const res = await fetch(`${baseUrl}/v5/account/wallet-balance?${qs}`, {
      method: "GET",
      headers: {
        "X-BAPI-API-KEY": apiKey!,
        "X-BAPI-TIMESTAMP": ts,
        "X-BAPI-RECV-WINDOW": recvWindow,
        "X-BAPI-SIGN": sign,
        "X-BAPI-SIGN-TYPE": "2",
      },
    });

    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep raw */ }

    if (!res.ok || (json && json.retCode && json.retCode !== 0)) {
      console.error("❌ Bybit live check failed", { status: res.status, body: text });
      throw new ConfigError("Bybit live credential check failed", {
        httpStatus: res.status,
        response: json ?? text,
        tips: [
          "Ensure the key has the right permissions (Query/Trade for Unified account).",
          "IP restriction must allow your function's egress IP.",
          "System time drift: ensure timestamp is current (use /v5/market/time if needed).",
        ],
      });
    }

    console.log("✅ Bybit live credential check OK");
  }

  console.log("✅ Env validation OK", summary);
  return summary;
}

// Helper function to test Bybit connection
async function testBybitConnection(trader: BybitV5Client) {
  try {
    console.log('🔧 Testing Bybit API connection...');
    const balance = await trader.getAccountBalance();
    console.log('✅ Bybit connection successful');
    return { success: true, balance };
  } catch (error) {
    console.error('❌ Bybit connection failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error',
      details: error
    };
  }
}

// Manual trade execution function
async function executeManualTrade(trader: BybitV5Client, signal: any, quantity: number) {
  try {
    console.log(`🎯 Executing manual trade for ${signal.symbol}:`, {
      direction: signal.direction,
      price: signal.entry_price,
      quantity,
      stopLoss: signal.sl,
      takeProfit: signal.tp
    });

    const orderResult = await trader.placeOrder({
      symbol: signal.symbol.replace('/', ''),
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: quantity.toFixed(8),
      stopLoss: signal.sl?.toString(),
      takeProfit: signal.tp?.toString()
    });

    return {
      success: true,
      orderId: orderResult.result?.orderId,
      message: `Trade executed successfully for ${signal.symbol}`
    };
  } catch (error) {
    console.error(`❌ Manual trade execution failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}

// JSON response helper
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

// Main hardened handler - ensures diagnostic routes always work
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // reflect extra headers the browser asks for (future-proof)
    const reqHdrs = req.headers.get("access-control-request-headers") ?? "";
    const origin = req.headers.get("origin") ?? "*"; // switch to origin if you prefer not to use "*"
    const headers = {
      ...baseCors,
      "Access-Control-Allow-Origin": "*", // or origin
      "Access-Control-Allow-Headers": `${baseCors["Access-Control-Allow-Headers"]}${reqHdrs ? `, ${reqHdrs}` : ""}`,
    };
    console.log("🔎 Preflight", { reqHdrs, origin, headers });
    return new Response("ok", { status: 204, headers });
  }

  const url = new URL(req.url);

  // 0) Simple ping (optional)
  if (url.pathname === "/ping") return json(200, { ok: true });

  // 1) /env must never crash - uses lazy secret reading
  if (url.pathname === "/env") {
    const { apiKey, apiSecret } = readSecrets();
    return json(200, {
      BYBIT_API_KEY: mask(apiKey),
      BYBIT_API_SECRET: mask(apiSecret),
    });
  }

  // 2) /test-connection must not depend on other initialization
  if (url.pathname === "/test-connection" || url.searchParams.get("test") === "true") {
    try {
      const summary = await validateBybitCredsSimple({ live: true });
      return json(200, {
        ok: true,
        stage: "credentials",
        summary,
        message: "Bybit credentials are present and accepted.",
      });
    } catch (err: any) {
      return json(200, {
        ok: false,
        stage: "credentials",
        error: err?.message ?? "Unknown error",
        code: err?.code ?? "UNKNOWN",
        details: err?.details ?? null,
      });
    }
  }

  // 3) Safe body parsing for POST/JSON only
  let body: any = {};
  if (req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
    try { body = await req.json(); } catch { body = {}; }
  }
  const { action, config, signal, quantity } = body;

  // 4) Validate creds (no live call) for trading actions
  try {
    console.log('🔧 Validating credentials for request:', url.pathname);
    await validateBybitCredsSimple({ live: false });
    console.log('✅ Credential validation passed');
  } catch (e: any) {
    return json(401, { 
      ok: false, 
      stage: "startup", 
      error: e?.message, 
      details: e?.details ?? null 
    });
  }

  // 5) Handle actions
  try {
    console.log('✅ API credentials validated, creating Bybit client...');
    const { apiKey, apiSecret } = readSecrets();
    const trader = new BybitV5Client({
      apiKey: apiKey!,
      apiSecret: apiSecret!
    });
    
    // Default trading configuration
    const defaultConfig: TradingConfig = {
      enabled: true,
      max_position_size: 10, // 10% of balance per position
      risk_per_trade: 2, // 2% risk per trade
      max_open_positions: 5,
      min_confidence_score: 77, // Based on your signals data
      timeframes: ['5m', '15m'],
      symbols_whitelist: [], // All symbols allowed
      symbols_blacklist: ['USDCUSDT'] // Exclude stablecoins
    };

    const tradingConfig = { ...defaultConfig, ...config };
    const engine = new AutomatedTradingEngine(trader, tradingConfig);

    switch (action) {
      case 'start':
        await engine.start();
        return json(200, {
          success: true,
          message: 'Automated trading started',
          status: engine.getStatus()
        });

      case 'stop':
        await engine.stop();
        return json(200, {
          success: true,
          message: 'Automated trading stopped'
        });

      case 'status': {
        console.log('📊 Fetching real Bybit account status...');
        
        // Get real account balance and positions from Bybit V5
        const bal = await getWalletBalance("UNIFIED");
        const pos = await listPositions();
        
        console.log('💰 Balance response:', JSON.stringify(bal, null, 2));
        console.log('📈 Positions response:', JSON.stringify(pos, null, 2));
        
        // Calculate active positions count
        const activePositions = pos.result?.list?.filter((p: any) => 
          parseFloat(p.size || '0') > 0
        ).length || 0;
        
        return json(200, {
          success: true,
          status: {
            isRunning: false, // Will be managed by automation engine
            activePositions,
            config: { symbol: "BTCUSDT", timeframe: "5m" },
            positions: pos.result?.list?.map((p: any) => ({
              symbol: p.symbol,
              side: p.side,
              size: parseFloat(p.size || '0'),
              entry_price: parseFloat(p.avgPrice || '0'),
              stop_loss: parseFloat(p.stopLoss || '0'),
              take_profit: parseFloat(p.takeProfit || '0'),
              pnl: parseFloat(p.unrealisedPnl || '0'),
              created_at: p.createdTime
            })) || []
          },
          account: {
            balance: bal.result,
            positions: pos.result?.list || []
          }
        });
      }

      case 'test_connection': {
        console.log('🔗 Testing Bybit V5 connection...');
        const testBalance = await getWalletBalance("UNIFIED");
        console.log('✅ Connection test result:', testBalance);
        return json(200, {
          success: true,
          message: 'Bybit V5 connection successful',
          balance: testBalance.result
        });
      }

      case 'place': {
        const { symbol, side = "Buy", qty, price } = body;
        console.log(`📝 Placing ${side} order:`, { symbol, qty, price });
        
        const orderParams = {
          symbol,
          side: side as "Buy" | "Sell",
          orderType: price ? "Limit" : "Market" as "Limit" | "Market",
          qty: String(qty),
          ...(price ? { price: String(price), timeInForce: "GTC" as const } : {}),
        };
        
        const res = await placeOrder(orderParams);
        console.log('✅ Order placed:', res);
        return json(200, { success: true, order: res });
      }

      case 'cancel': {
        const { symbol, orderId, orderLinkId } = body;
        console.log(`❌ Cancelling order:`, { symbol, orderId, orderLinkId });
        
        const idOrLink = orderId ? { orderId } : { orderLinkId };
        const res = await cancelOrder(symbol, idOrLink);
        console.log('✅ Order cancelled:', res);
        return json(200, { success: true, cancel: res });
      }

      case 'manual_trade': {
        if (!signal || !quantity) {
          return json(400, {
            success: false,
            error: 'Signal data and quantity are required for manual trade'
          });
        }
        const result = await executeManualTrade(trader, signal, quantity);
        return json(200, result);
      }

      default:
        return json(400, { success: false, error: "Invalid action" });
    }

  } catch (err: any) {
    console.error('Automated trading error:', err);
    return json(500, { success: false, error: err?.message ?? "Unhandled error" });
  }
});