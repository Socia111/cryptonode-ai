// Type adapters for bridging database types and component types
import type { Database } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

// Database row types
type SignalRow = Database['public']['Tables']['signals']['Row'];
type TradingAccountRow = Database['public']['Tables']['user_trading_accounts']['Row'];
type ExchangeFeedStatusRow = Database['public']['Tables']['exchange_feed_status']['Row'];
type AppSettingsRow = Database['public']['Tables']['app_settings']['Row'];

// Component types (existing)
export interface Signal {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  score: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  source: string | null;
  algo: string | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  metadata?: any;
  confidence?: number | null;
  atr?: number | null;
  bar_time?: string;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  exchange: string;
  account_type: 'testnet' | 'mainnet';
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  is_active: boolean;
  permissions: string[];
  risk_settings: {
    maxPositionSize: number;
    stopLossEnabled: boolean;
    takeProfitEnabled: boolean;
  };
  balance_info?: any;
  connected_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExchangeStatus {
  id: string;
  exchange: string;
  status: 'active' | 'error' | 'disabled';
  last_update: string | null;
  symbols_tracked: number | null;
  error_count: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhitelistSettings {
  whitelist_enabled: boolean;
  whitelist_pairs: string[];
  max_symbols: number;
  auto_update: boolean;
  last_updated: string;
}

// Type guards for safe conversion
function isValidDirection(direction: string): direction is 'LONG' | 'SHORT' {
  return direction === 'LONG' || direction === 'SHORT';
}

function isValidAccountType(type: string): type is 'testnet' | 'mainnet' {
  return type === 'testnet' || type === 'mainnet';
}

function isValidExchangeStatus(status: string): status is 'active' | 'error' | 'disabled' {
  return status === 'active' || status === 'error' || status === 'disabled';
}

function parseRiskSettings(json: Json): { maxPositionSize: number; stopLossEnabled: boolean; takeProfitEnabled: boolean } {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    const obj = json as Record<string, any>;
    return {
      maxPositionSize: typeof obj.maxPositionSize === 'number' ? obj.maxPositionSize : 1000,
      stopLossEnabled: typeof obj.stopLossEnabled === 'boolean' ? obj.stopLossEnabled : true,
      takeProfitEnabled: typeof obj.takeProfitEnabled === 'boolean' ? obj.takeProfitEnabled : true,
    };
  }
  return { maxPositionSize: 1000, stopLossEnabled: true, takeProfitEnabled: true };
}

function parseWhitelistSettings(json: Json): WhitelistSettings {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    const obj = json as Record<string, any>;
    return {
      whitelist_enabled: typeof obj.whitelist_enabled === 'boolean' ? obj.whitelist_enabled : false,
      whitelist_pairs: Array.isArray(obj.whitelist_pairs) ? obj.whitelist_pairs : [],
      max_symbols: typeof obj.max_symbols === 'number' ? obj.max_symbols : 50,
      auto_update: typeof obj.auto_update === 'boolean' ? obj.auto_update : true,
      last_updated: typeof obj.last_updated === 'string' ? obj.last_updated : new Date().toISOString(),
    };
  }
  return {
    whitelist_enabled: false,
    whitelist_pairs: [],
    max_symbols: 50,
    auto_update: true,
    last_updated: new Date().toISOString(),
  };
}

// Adapter functions
export function adaptSignalFromDb(dbSignal: SignalRow): Signal {
  const direction = isValidDirection(dbSignal.direction) ? dbSignal.direction : 'LONG';
  
  return {
    id: dbSignal.id,
    symbol: dbSignal.symbol,
    timeframe: dbSignal.timeframe,
    direction,
    price: dbSignal.price,
    score: dbSignal.score,
    created_at: dbSignal.created_at || new Date().toISOString(),
    expires_at: dbSignal.expires_at,
    is_active: dbSignal.is_active,
    source: dbSignal.source,
    algo: dbSignal.algo,
    entry_price: dbSignal.entry_price,
    stop_loss: dbSignal.stop_loss,
    take_profit: dbSignal.take_profit,
    metadata: dbSignal.metadata,
    confidence: dbSignal.confidence,
    atr: dbSignal.atr,
    bar_time: dbSignal.bar_time,
  };
}

export function adaptTradingAccountFromDb(dbAccount: TradingAccountRow): TradingAccount {
  const accountType = isValidAccountType(dbAccount.account_type) ? dbAccount.account_type : 'testnet';
  
  return {
    id: dbAccount.id,
    user_id: dbAccount.user_id,
    exchange: dbAccount.exchange,
    account_type: accountType,
    api_key_encrypted: dbAccount.api_key_encrypted,
    api_secret_encrypted: dbAccount.api_secret_encrypted,
    is_active: dbAccount.is_active,
    permissions: dbAccount.permissions || [],
    risk_settings: parseRiskSettings(dbAccount.risk_settings),
    balance_info: dbAccount.balance_info,
    connected_at: dbAccount.connected_at,
    last_used_at: dbAccount.last_used_at,
    created_at: dbAccount.created_at,
    updated_at: dbAccount.updated_at,
  };
}

export function adaptExchangeStatusFromDb(dbStatus: ExchangeFeedStatusRow): ExchangeStatus {
  const status = isValidExchangeStatus(dbStatus.status) ? dbStatus.status : 'active';
  
  return {
    id: dbStatus.id,
    exchange: dbStatus.exchange,
    status,
    last_update: dbStatus.last_update,
    symbols_tracked: dbStatus.symbols_tracked,
    error_count: dbStatus.error_count,
    last_error: dbStatus.last_error,
    created_at: dbStatus.created_at,
    updated_at: dbStatus.updated_at,
  };
}

export function adaptAppSettingsFromDb(dbSettings: AppSettingsRow[]): Record<string, any> {
  const settings: Record<string, any> = {};
  
  for (const setting of dbSettings) {
    if (typeof setting.value === 'object' && setting.value !== null && !Array.isArray(setting.value)) {
      const obj = setting.value as Record<string, any>;
      Object.assign(settings, obj);
    }
  }
  
  return {
    live_trading_enabled: settings.live_trading_enabled ?? false,
    paper_trading: settings.paper_trading ?? true,
    max_position_size: settings.max_position_size ?? 1000,
    default_leverage: settings.default_leverage ?? 1,
    risk_per_trade: settings.risk_per_trade ?? 0.02,
    ...settings,
  };
}

export function parseWhitelistSettingsFromJson(json: Json): WhitelistSettings {
  return parseWhitelistSettings(json);
}

// Helper for extracting typed values from app_settings
export function extractAppSettingValue<T>(settings: AppSettingsRow[], key: string, defaultValue: T): T {
  const setting = settings.find(s => {
    if (typeof s.value === 'object' && s.value !== null && !Array.isArray(s.value)) {
      return key in (s.value as Record<string, any>);
    }
    return false;
  });
  
  if (setting && typeof setting.value === 'object' && setting.value !== null && !Array.isArray(setting.value)) {
    const obj = setting.value as Record<string, any>;
    return obj[key] ?? defaultValue;
  }
  
  return defaultValue;
}