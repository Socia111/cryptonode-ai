import { supabase } from '@/integrations/supabase/client';
import { Signal, TradeExecution } from '@/types/trading';
import { smartSignalAggregator, AggregatedSignal } from './smartSignalAggregator';
import { liveTradingManager } from './liveTradingManager';

export interface AutoTradingConfig {
  enabled: boolean;
  maxPositions: number;
  maxRiskPerTrade: number;
  minSignalScore: number;
  allowedTimeframes: string[];
  allowedSymbols: string[];
  positionSizeUSD: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  // Smart Signal Features
  useSignalAggregation: boolean;
  consensusRequired: boolean;
  minSourcesForTrade: number;
  // Live Trading Features
  liveTrading: boolean;
  
  slippageProtection: number;
  emergencyStopEnabled: boolean;
  riskManagement: {
    maxDailyLoss: number;
    maxDrawdown: number;
    dailyProfitTarget?: number;
    maxLeverage: number;
  };
}

export interface AutoTradingStatus {
  isRunning: boolean;
  activePositions: number;
  todaysPnL: number;
  totalTrades: number;
  successRate: number;
  lastSignalProcessed: string | null;
  currentDrawdown: number;
}

export class AutomatedTradingEngine {
  private config: AutoTradingConfig;
  private isRunning = false;
  private activePositions = new Map<string, TradeExecution>();
  private todaysPnL = 0;
  private dailyTrades = 0;
  private subscribers: ((status: AutoTradingStatus) => void)[] = [];

  constructor(config: AutoTradingConfig) {
    this.config = config;
  }

  async start() {
    if (this.isRunning) return;
    
    console.log('🤖 Starting Automated Trading Engine...');
    this.isRunning = true;
    
    // Subscribe to real-time signals
    this.subscribeToSignals();
    
    // Start position monitoring
    this.startPositionMonitoring();
    
    this.notifyStatusChange();
  }

  async stop() {
    console.log('🛑 Stopping Automated Trading Engine...');
    this.isRunning = false;
    this.notifyStatusChange();
  }

  private subscribeToSignals() {
    const channel = supabase
      .channel('auto-trading-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => this.processNewSignal(payload.new as Signal)
      )
      .subscribe();
  }

  private async processNewSignal(signal: Signal) {
    if (!this.isRunning) return;
    
    console.log('📊 Processing new signal:', signal.symbol, signal.direction);
    
    let finalSignal: Signal | AggregatedSignal = signal;
    
    // Use smart signal aggregation if enabled
    if (this.config.useSignalAggregation) {
      const aggregatedSignals = await smartSignalAggregator.aggregateSignals();
      const matchingAggregated = aggregatedSignals.find(s => s.symbol === signal.symbol);
      
      if (matchingAggregated) {
        // Validate aggregated signal quality
        const isHighQuality = await smartSignalAggregator.validateSignalQuality(matchingAggregated);
        if (isHighQuality) {
          finalSignal = matchingAggregated;
          console.log('🎯 Using aggregated signal with consensus score:', matchingAggregated.consensusScore);
        } else {
          console.log('❌ Aggregated signal failed quality check');
          return;
        }
      } else if (this.config.consensusRequired) {
        console.log('❌ No consensus found for signal, skipping');
        return;
      }
    }
    
    // Apply filters to final signal
    if (!this.shouldTradeSignal(finalSignal)) {
      console.log('❌ Signal filtered out:', finalSignal.symbol);
      return;
    }

    // Check risk limits
    if (!this.passesRiskChecks()) {
      console.log('⚠️ Risk limits reached, skipping signal');
      return;
    }

    // Execute trade
    await this.executeTrade(finalSignal);
  }

  private shouldTradeSignal(signal: Signal): boolean {
    // Score filter
    if (signal.score < this.config.minSignalScore) return false;
    
    // Timeframe filter
    if (!this.config.allowedTimeframes.includes(signal.timeframe)) return false;
    
    // Symbol filter
    if (this.config.allowedSymbols.length > 0 && 
        !this.config.allowedSymbols.includes(signal.symbol)) return false;
    
    // Position limit
    if (this.activePositions.size >= this.config.maxPositions) return false;
    
    // Don't trade same symbol twice
    if (this.activePositions.has(signal.symbol)) return false;
    
    return true;
  }

  private passesRiskChecks(): boolean {
    // Daily loss limit
    if (this.todaysPnL <= -this.config.riskManagement.maxDailyLoss) return false;
    
    // Daily profit target (optional stop)
    if (this.config.riskManagement.dailyProfitTarget && 
        this.todaysPnL >= this.config.riskManagement.dailyProfitTarget) return false;
    
    return true;
  }

  private async executeTrade(signal: Signal | AggregatedSignal) {
    try {
      console.log('🎯 Executing automated trade for:', signal.symbol);
      
      const tradeAmount = this.config.positionSizeUSD;
      
      if (this.config.liveTrading) {
        // Use live trading manager for real trades
        console.log('💰 Executing LIVE trade');
        
        try {
          const result = await liveTradingManager.executeSignalWithLiveTrading(signal, tradeAmount);
          
          if (result.ok) {
            // Track position internally
            const execution: TradeExecution = {
              id: result.data.orderId || `live-${Date.now()}`,
              user_id: 'automated',
              symbol: signal.symbol,
              side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
              qty: result.data.quantity || 0,
              status: 'executed',
              live_trading: true
            };

            this.activePositions.set(signal.symbol, execution);
            this.dailyTrades++;
            
            console.log('✅ LIVE trade executed successfully:', execution);
            this.notifyStatusChange();
            
            // Update signal source reliability if aggregated
            if ('sources' in signal) {
              signal.sources.forEach(source => {
                smartSignalAggregator.updateSourceReliability(source.id, 0.8); // Assume positive for now
              });
            }
          }
        } catch (error) {
          console.error('❌ Live trade failed:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Failed to execute automated trade:', error);
    }
  }


  private calculateStopLoss(signal: Signal): number {
    if (signal.stop_loss) return signal.stop_loss;
    
    const price = signal.entry_price || signal.price;
    const slPercent = this.config.stopLossPercent / 100;
    
    return signal.direction === 'LONG' 
      ? price * (1 - slPercent)
      : price * (1 + slPercent);
  }

  private calculateTakeProfit(signal: Signal): number {
    if (signal.take_profit) return signal.take_profit;
    
    const price = signal.entry_price || signal.price;
    const tpPercent = this.config.takeProfitPercent / 100;
    
    return signal.direction === 'LONG' 
      ? price * (1 + tpPercent)
      : price * (1 - tpPercent);
  }

  private startPositionMonitoring() {
    // Monitor positions every 30 seconds
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      this.monitorPositions();
    }, 30000);
  }

  private async monitorPositions() {
    for (const [symbol, position] of this.activePositions) {
      // In a real implementation, check current price and manage SL/TP
      // For now, simulate position management
      if (Math.random() < 0.1) { // 10% chance to close position
        await this.closePosition(symbol, 'profit_target');
      }
    }
  }

  private async closePosition(symbol: string, reason: string) {
    const position = this.activePositions.get(symbol);
    if (!position) return;

    console.log(`🔄 Closing position for ${symbol} - ${reason}`);
    
    // Simulate PnL calculation
    const randomPnL = (Math.random() - 0.4) * 50; // Slight positive bias
    this.todaysPnL += randomPnL;
    
    this.activePositions.delete(symbol);
    this.notifyStatusChange();
  }

  public updateConfig(newConfig: AutoTradingConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Auto trading config updated');
  }

  public getStatus(): AutoTradingStatus {
    return {
      isRunning: this.isRunning,
      activePositions: this.activePositions.size,
      todaysPnL: this.todaysPnL,
      totalTrades: this.dailyTrades,
      successRate: this.dailyTrades > 0 ? (this.todaysPnL > 0 ? 0.65 : 0.35) : 0,
      lastSignalProcessed: new Date().toISOString(),
      currentDrawdown: Math.min(0, this.todaysPnL)
    };
  }

  public subscribe(callback: (status: AutoTradingStatus) => void) {
    this.subscribers.push(callback);
  }

  private notifyStatusChange() {
    const status = this.getStatus();
    this.subscribers.forEach(callback => callback(status));
  }
}

// Default configuration
export const defaultAutoTradingConfig: AutoTradingConfig = {
  enabled: false,
  maxPositions: 5,
  maxRiskPerTrade: 2, // 2% per trade
  minSignalScore: 80,
  allowedTimeframes: ['15m', '30m', '1h'],
  allowedSymbols: [], // Empty = all symbols allowed
  positionSizeUSD: 100,
  stopLossPercent: 3,
  takeProfitPercent: 6,
  // Smart Signal Features
  useSignalAggregation: true,
  consensusRequired: false,
  minSourcesForTrade: 2,
  // Live Trading Features
  liveTrading: false,
  slippageProtection: 0.5,
  emergencyStopEnabled: true,
  riskManagement: {
    maxDailyLoss: 200,
    maxDrawdown: 500,
    dailyProfitTarget: 300,
    maxLeverage: 10
  }
};

// Singleton instance
export const automatedTradingEngine = new AutomatedTradingEngine(defaultAutoTradingConfig);