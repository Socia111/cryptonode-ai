// Global trading settings store
export type Settings = {
  defaultSLPct: number;     // normal mode
  defaultTPPct: number;
  scalpSLPct: number;       // scalp mode
  scalpTPPct: number;
  maxLeverage: number;
};

let _settings: Settings = {
  defaultSLPct: 0.0075,   // 0.75%
  defaultTPPct: 0.0150,   // 1.5%
  scalpSLPct: 0.0035,     // 0.35%  
  scalpTPPct: 0.0070,     // 0.70%
  maxLeverage: 100
};

export const tradingSettings = {
  getSettings(): Settings { 
    return _settings; 
  },
  
  updateSettings(updates: Partial<Settings>) {
    _settings = { ..._settings, ...updates };
    // Save to localStorage for persistence
    try {
      localStorage.setItem('aitradex1_trading_settings', JSON.stringify(_settings));
    } catch (error) {
      console.warn('Failed to save trading settings:', error);
    }
  },
  
  subscribe(cb: (s: Settings) => void) {
    // Simple subscription - call immediately and return unsubscribe
    cb(_settings);
    return () => {};
  },
  
  // convenience calculator
  calculateRiskPrices(entry: number, side: 'Buy'|'Sell', slPct?: number, tpPct?: number, scalpMode = false) {
    const s = _settings;
    const sl = slPct ?? (scalpMode ? s.scalpSLPct : s.defaultSLPct);
    const tp = tpPct ?? (scalpMode ? s.scalpTPPct : s.defaultTPPct);
    const stopLoss   = side === 'Buy' ? entry * (1 - sl) : entry * (1 + sl);
    const takeProfit = side === 'Buy' ? entry * (1 + tp) : entry * (1 - tp);
    const rr = tp / sl;
    return { 
      stopLoss, 
      takeProfit, 
      riskRewardRatio: rr, 
      slPct: sl, 
      tpPct: tp 
    };
  }
};

// Load settings from localStorage on initialization
try {
  const stored = localStorage.getItem('aitradex1_trading_settings');
  if (stored) {
    _settings = { ..._settings, ...JSON.parse(stored) };
  }
} catch (error) {
  console.warn('Failed to load trading settings:', error);
}