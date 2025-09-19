export type TradingStatus = 'connected' | 'disconnected'
export type Mode = 'paper' | 'live'

export interface AutoTradingConfig {
  id?: string;
  user_id: string;
  enabled: boolean;
  risk_per_trade: number;
  min_signal_score: number;
  trading_hours: any; // Allow any type to match database Json
  preferred_timeframes: string[];
  excluded_symbols: string[];
  max_concurrent_trades: number;
  max_daily_trades: number;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationState {
  connected: boolean
  autoEnabled: boolean
  mode: Mode
  activeTrades: number
  pnlToday: number
  riskLevel: 'conservative' | 'balanced' | 'aggressive'
  maxPositionUSD: number
}