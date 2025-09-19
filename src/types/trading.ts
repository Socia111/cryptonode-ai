// Core trading interfaces for AITRADEX1 system

export interface Signal {
  id?: string;
  symbol: string;
  direction: string; // Allow any string to match database
  timeframe: string;
  price: number;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  score: number;
  confidence?: number;
  source?: string;
  algo?: string;
  exchange?: string;
  exchange_source?: string;
  side?: string; // Allow any string to match database
  signal_type?: string;
  signal_grade?: string;
  bar_time?: string;
  expires_at?: string;
  atr?: number;
  volume_ratio?: number;
  hvp_value?: number;
  filters?: any; // Allow any type to match database Json
  metadata?: any; // Allow any type to match database Json
  meta?: any; // Allow any type to match database Json
  is_active?: boolean;
  created_at?: string;
}

// Enhanced TradingSignal interface for trader-ready signals
export interface TradingSignal {
  symbol: string;
  timeframe: '15m' | '30m' | '1h' | '4h' | string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number;
  r_r_ratio: number;
  confidence_score: number;
  volatility?: 'Low' | 'Medium' | 'High';
  trend_strength?: 'Weak' | 'Moderate' | 'Strong';
  source: string;
  generated_at: string;
  id?: string;
  score?: number;
  created_at?: string;
}

export interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty?: number;
  amount_usd?: number;
  leverage?: number;
  paper_mode?: boolean;
  user_id?: string;
  signal_id?: string;
  order_type?: 'Market' | 'Limit';
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  reduce_only?: boolean;
}

export interface TradeExecution {
  id?: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty?: number;
  amount_usd?: number;
  leverage?: number;
  paper_mode: boolean;
  status: 'requested' | 'executed' | 'failed' | 'cancelled';
  exchange_order_id?: string;
  ret_code?: number;
  ret_msg?: string;
  raw_response?: any;
  execution_time_ms?: number;
  avg_price?: string;
  executed_qty?: string;
  credentials_source?: 'user' | 'system' | 'none';
  created_at?: string;
}

export interface TradingCredentials {
  id?: string;
  user_id: string;
  exchange: string; // Allow any string to match database
  account_type: string; // Allow any string to match database
  api_key_encrypted: string;
  api_secret_encrypted: string;
  is_active: boolean;
  permissions?: string[];
  risk_settings?: any; // Allow any type to match database Json
  balance_info?: Record<string, any>;
  connected_at?: string;
  last_used_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketData {
  id?: string;
  symbol: string;
  exchange: string;
  base_asset: string;
  quote_asset: string;
  price: number;
  bid?: number;
  ask?: number;
  high_24h?: number;
  low_24h?: number;
  change_24h?: number;
  change_24h_percent?: number;
  volume?: number;
  volume_quote?: number;
  // Technical indicators
  ema21?: number;
  sma200?: number;
  rsi_14?: number;
  atr_14?: number;
  stoch_k?: number;
  stoch_d?: number;
  adx?: number;
  plus_di?: number;
  minus_di?: number;
  volume_avg_20?: number;
  raw_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SystemSettings {
  live_trading_enabled: boolean;
  paper_trading: boolean;
  max_position_size: number;
  default_leverage: number;
  risk_per_trade: number;
  min_signal_score: number;
  auto_trading_enabled: boolean;
  allowed_symbols: string[];
  max_daily_trades: number;
  stop_loss_enabled: boolean;
  take_profit_enabled: boolean;
}

export interface TradingSession {
  id?: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  total_trades: number;
  successful_trades: number;
  failed_trades: number;
  total_pnl: number;
  max_drawdown: number;
  max_profit: number;
  trading_mode: 'paper' | 'live';
  exchange: string;
  strategy_used: string;
  risk_score: number;
  notes?: string;
  created_at?: string;
}

export interface SignalProcessingResult {
  signals_found: number;
  signals_processed: number;
  signals_stored: number;
  processing_time_ms: number;
  errors: string[];
  scan_params: {
    exchange: string;
    timeframe: string;
    symbols_scanned: number;
    min_score: number;
    relaxed_filters: boolean;
  };
  timestamp: string;
}

export interface TradeExecutionResult {
  success: boolean;
  trade_id?: string;
  paper_mode: boolean;
  result: any;
  message: string;
  execution_time_ms?: number;
  avg_price?: string;
  executed_qty?: string;
  error_code?: string;
  retry_count?: number;
}

export interface SystemHealth {
  database: {
    connected: boolean;
    response_time_ms?: number;
    error?: string;
  };
  edge_functions: Record<string, {
    available: boolean;
    response_time_ms?: number;
    error?: string;
  }>;
  bybit: {
    connected: boolean;
    server_time?: number;
    error?: string;
  };
  credentials: {
    user_credentials_count: number;
    system_credentials_available: boolean;
  };
  data: {
    signals_24h: number;
    trades_24h: number;
    markets_enabled: number;
  };
  timestamp: string;
}

export interface RealTimeUpdate<T = any> {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new?: T;
  old?: T;
  timestamp: string;
}

// Utility types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  count?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

// Event types for real-time monitoring
export type SignalEvent = RealTimeUpdate<Signal>;
export type TradeEvent = RealTimeUpdate<TradeExecution>;
export type MarketDataEvent = RealTimeUpdate<MarketData>;

// Dashboard data aggregations
export interface TradingDashboardData {
  signals: {
    total_24h: number;
    active_signals: Signal[];
    top_performers: Signal[];
    by_timeframe: Record<string, number>;
    avg_score: number;
  };
  trades: {
    total_24h: number;
    successful_24h: number;
    failed_24h: number;
    paper_trades: number;
    live_trades: number;
    total_volume_usd: number;
    avg_execution_time_ms: number;
  };
  performance: {
    pnl_24h: number;
    pnl_7d: number;
    pnl_30d: number;
    win_rate: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
  system: SystemHealth;
}