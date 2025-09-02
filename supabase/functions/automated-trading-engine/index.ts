import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration
const ENV = {
  BYBIT_API_KEY: "BYBIT_API_KEY",
  BYBIT_API_SECRET: "BYBIT_API_SECRET",
} as const;

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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bybit API configuration - using consistent naming
const BYBIT_API_KEY = getEnvOrNull(ENV.BYBIT_API_KEY);
const BYBIT_API_SECRET = getEnvOrNull(ENV.BYBIT_API_SECRET);
const BYBIT_BASE_URL = 'https://api.bybit.com';

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
    // Whitelist check
    if (this.config.symbols_whitelist && this.config.symbols_whitelist.length > 0) {
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
  const apiKey = getEnvOrNull(ENV.BYBIT_API_KEY);
  const apiSecret = getEnvOrNull(ENV.BYBIT_API_SECRET);

  const summary = {
    envSeen: {
      [ENV.BYBIT_API_KEY]: !!apiKey,
      [ENV.BYBIT_API_SECRET]: !!apiSecret,
    },
    previews: {
      [ENV.BYBIT_API_KEY]: mask(apiKey, 4),
      [ENV.BYBIT_API_SECRET]: mask(apiSecret, 4),
    },
  };

  // Fail fast if missing
  const missing: string[] = [];
  if (!apiKey) missing.push(ENV.BYBIT_API_KEY);
  if (!apiSecret) missing.push(ENV.BYBIT_API_SECRET);

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health/diagnostics endpoint used by "Test Trading Engine" button
  if (url.pathname === "/test-connection" || url.searchParams.get("test") === "true") {
    try {
      const summary = await validateBybitCreds({ live: true }); // live = true does an actual signed call
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

  // Validate credentials at startup for all other requests
  try {
    await validateBybitCreds({ live: false });
  } catch (e) {
    return json(500, {
      ok: false,
      stage: "startup",
      error: (e as Error).message,
      details: (e as any)?.details ?? null,
    });
  }

  try {
    const { action, config, signal, quantity } = await req.json();

    console.log('✅ API credentials validated, creating Bybit client...');
    const trader = new BybitV5Client({
      apiKey: BYBIT_API_KEY!,
      apiSecret: BYBIT_API_SECRET!
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

      case 'status':
        const balance = await trader.getAccountBalance();
        const positions = await trader.getPositions();
        
        return json(200, {
          success: true,
          status: engine.getStatus(),
          account: {
            balance: balance.result,
            positions: positions
          }
        });

      case 'test_connection':
        const testBalance = await trader.getAccountBalance();
        return json(200, {
          success: true,
          message: 'Bybit connection successful',
          balance: testBalance.result
        });

      default:
        return json(400, {
          success: false,
          error: 'Invalid action'
        });
    }

  } catch (error) {
    console.error('Automated trading error:', error);
    return json(500, {
      success: false,
      error: (error as Error).message
    });
  }
});