// Global trading settings store
export interface TradingSettings {
  defaultSLPercent: number;
  defaultTPPercent: number;
  useScalpingMode: boolean;
  orderType: 'market' | 'limit';
  maxLeverage: number;
  excludeInnovationZone: boolean;
}

const DEFAULT_SETTINGS: TradingSettings = {
  defaultSLPercent: 2,   // 2% stop loss
  defaultTPPercent: 4,   // 4% take profit  
  useScalpingMode: false,
  orderType: 'limit',
  maxLeverage: 25,
  excludeInnovationZone: true  // Exclude high-fee Innovation Zone pairs by default
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