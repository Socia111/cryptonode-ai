import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bybit API configuration
const BYBIT_API_KEY = Deno.env.get('BYBIT_API_KEY')!;
const BYBIT_API_SECRET = Deno.env.get('BYBIT_API_SECRET')!;
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

class BybitTrader {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(apiKey: string, apiSecret: string, baseUrl: string = BYBIT_BASE_URL) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  private async createSignature(timestamp: string, method: string, path: string, params: string): Promise<string> {
    const message = timestamp + this.apiKey + method + path + params;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(message)
    );
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async makeRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const path = endpoint;
    const queryString = method === 'GET' ? new URLSearchParams(params).toString() : '';
    const body = method !== 'GET' ? JSON.stringify(params) : '';
    
    const signature = await this.createSignature(
      timestamp,
      method,
      path,
      method === 'GET' ? queryString : body
    );

    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    };

    const url = this.baseUrl + path + (queryString ? '?' + queryString : '');
    
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined
    });

    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data;
  }

  async getAccountBalance(): Promise<any> {
    return this.makeRequest('GET', '/v5/account/wallet-balance', {
      accountType: 'SPOT'
    });
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.makeRequest('GET', '/v5/position/list', {
      category: 'spot'
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
      category: 'spot',
      symbol: orderParams.symbol,
      side: orderParams.side,
      orderType: orderParams.orderType,
      qty: orderParams.qty,
      ...(orderParams.price && { price: orderParams.price }),
      ...(orderParams.stopLoss && { stopLoss: orderParams.stopLoss }),
      ...(orderParams.takeProfit && { takeProfit: orderParams.takeProfit }),
      timeInForce: 'GTC'
    };

    return this.makeRequest('POST', '/v5/order/create', params);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.makeRequest('POST', '/v5/order/cancel', {
      category: 'spot',
      symbol,
      orderId
    });
  }
}

class AutomatedTradingEngine {
  private trader: BybitTrader;
  private config: TradingConfig;
  private isRunning: boolean = false;
  private activePositions: Map<string, Position> = new Map();

  constructor(trader: BybitTrader, config: TradingConfig) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config } = await req.json();

    const trader = new BybitTrader(BYBIT_API_KEY, BYBIT_API_SECRET);
    
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
        return new Response(JSON.stringify({
          success: true,
          message: 'Automated trading started',
          status: engine.getStatus()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'stop':
        await engine.stop();
        return new Response(JSON.stringify({
          success: true,
          message: 'Automated trading stopped'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'status':
        const balance = await trader.getAccountBalance();
        const positions = await trader.getPositions();
        
        return new Response(JSON.stringify({
          success: true,
          status: engine.getStatus(),
          account: {
            balance: balance.result,
            positions: positions
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'test_connection':
        const testBalance = await trader.getAccountBalance();
        return new Response(JSON.stringify({
          success: true,
          message: 'Bybit connection successful',
          balance: testBalance.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Automated trading error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});