// Global trading settings store
export interface TradingSettings {
  defaultSLPercent: number;
  defaultTPPercent: number;
  useScalpingMode: boolean;
  orderType: 'market' | 'limit';
  maxLeverage: number;
  excludeInnovationZone: boolean;
  // New Auto Pilot settings
  defaultSLPct: number;   // 0.0075 = 0.75%
  defaultTPPct: number;   // 0.015  = 1.50%
  scalpSLPct: number;     // 0.0035 = 0.35%
  scalpTPPct: number;     // 0.007  = 0.70%
}

const DEFAULT_SETTINGS: TradingSettings = {
  defaultSLPercent: 2,   // 2% stop loss
  defaultTPPercent: 4,   // 4% take profit  
  useScalpingMode: false,
  orderType: 'limit',
  maxLeverage: 100,
  excludeInnovationZone: true,  // Exclude high-fee Innovation Zone pairs by default
  // Auto Pilot defaults
  defaultSLPct: 0.0075,  // 0.75%
  defaultTPPct: 0.015,   // 1.50%
  scalpSLPct: 0.0035,    // 0.35%
  scalpTPPct: 0.007,     // 0.70%
};

const STORAGE_KEY = 'aitradex1_trading_settings';

class TradingSettingsStore {
  private settings: TradingSettings;
  private listeners: ((settings: TradingSettings) => void)[] = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): TradingSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load trading settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to save trading settings:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.settings));
  }

  getSettings(): TradingSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<TradingSettings>) {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  subscribe(listener: (settings: TradingSettings) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Calculate SL/TP prices based on global settings
  calculateRiskPrices(entryPrice: number, side: 'Buy' | 'Sell', customSL?: number, customTP?: number) {
    const { defaultSLPercent, defaultTPPercent, useScalpingMode } = this.settings;
    
    // Use scalping percentages if enabled
    const slPercent = customSL ?? (useScalpingMode ? 0.15 : defaultSLPercent);
    const tpPercent = customTP ?? (useScalpingMode ? 0.5 : defaultTPPercent);
    
    if (side === 'Buy') {
      return {
        stopLoss: entryPrice * (1 - slPercent / 100),
        takeProfit: entryPrice * (1 + tpPercent / 100)
      };
    } else {
      return {
        stopLoss: entryPrice * (1 + slPercent / 100),
        takeProfit: entryPrice * (1 - tpPercent / 100)
      };
    }
  }
}

export const tradingSettings = new TradingSettingsStore();

// Helper function to calculate TP/SL from entry price
export function calcRiskFromEntry(
  entry: number,
  side: 'Buy'|'Sell',
  useScalp: boolean,
  overrides?: { sl?: number; tp?: number }
) {
  const s = tradingSettings.getSettings();
  const slPct = useScalp ? s.scalpSLPct : s.defaultSLPct;
  const tpPct = useScalp ? s.scalpTPPct : s.defaultTPPct;

  if (overrides?.sl && overrides?.tp) {
    return { sl: overrides.sl, tp: overrides.tp };
  }
  if (side === 'Buy') {
    return {
      sl: overrides?.sl ?? +(entry * (1 - slPct)).toFixed(8),
      tp: overrides?.tp ?? +(entry * (1 + tpPct)).toFixed(8),
    };
  }
  // Sell/Short
  return {
    sl: overrides?.sl ?? +(entry * (1 + slPct)).toFixed(8),
    tp: overrides?.tp ?? +(entry * (1 - tpPct)).toFixed(8),
  };
}