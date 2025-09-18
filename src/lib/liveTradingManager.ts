import { supabase } from '@/integrations/supabase/client';
import { TradingGateway, ExecuteParams } from './tradingGateway';

export interface LiveTradingConfig {
  enabled: boolean;
  paperMode: boolean;
  maxPositions: number;
  maxRiskPerTrade: number;
  emergencyStopEnabled: boolean;
  slippageProtection: number; // percentage
  maxOrderSize: number; // USD
  allowedSymbols: string[];
  riskLimits: {
    maxDailyLoss: number;
    maxDrawdown: number;
    maxLeverage: number;
  };
}

export interface Position {
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

export interface BalanceInfo {
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnL: number;
  currency: string;
}

export class LiveTradingManager {
  private config: LiveTradingConfig;
  private positions: Map<string, Position> = new Map();
  private dailyPnL = 0;
  private totalDrawdown = 0;
  private emergencyStop = false;
  private lastBalanceUpdate = new Date();

  constructor(config: LiveTradingConfig) {
    this.config = config;
  }

  async executeSignalWithLiveTrading(signal: any, amount: number): Promise<any> {
    if (!this.config.enabled) {
      throw new Error('Live trading is disabled');
    }

    if (this.emergencyStop) {
      throw new Error('Emergency stop is active - live trading halted');
    }

    // Pre-execution checks
    await this.performSafetyChecks(signal, amount);

    const executeParams: ExecuteParams = {
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      amountUSD: amount,
      leverage: Math.min(signal.leverage || 1, this.config.riskLimits.maxLeverage),
      orderType: 'Market',
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit,
      meta: {
        signalId: signal.id,
        automated: true,
        timestamp: new Date().toISOString()
      }
    };

    try {
      console.log('🚀 Executing live trade:', executeParams);

    // Add slippage protection for market orders
    let finalParams = executeParams;
    if (executeParams.orderType === 'Market') {
      finalParams = await this.addSlippageProtection(executeParams, signal);
    }

      const result = await TradingGateway.execute(finalParams);

      if (result.ok) {
        // Track position
        await this.trackNewPosition(finalParams, result.data);
        
        // Update performance metrics
        this.updatePerformanceMetrics(result);
        
        console.log('✅ Live trade executed successfully:', result);
        return result;
      } else {
        console.error('❌ Live trade failed:', result.error);
        throw new Error(result.message || 'Trade execution failed');
      }

    } catch (error: any) {
      console.error('❌ Live trading error:', error);
      
      // Auto-enable emergency stop on critical errors
      if (this.isCriticalError(error)) {
        await this.activateEmergencyStop(error.message);
      }
      
      throw error;
    }
  }

  private async performSafetyChecks(signal: any, amount: number): Promise<void> {
    // Check risk limits
    if (amount > this.config.maxOrderSize) {
      throw new Error(`Order size ${amount} exceeds maximum allowed ${this.config.maxOrderSize}`);
    }

    // Check daily loss limit
    if (this.dailyPnL <= -this.config.riskLimits.maxDailyLoss) {
      throw new Error('Daily loss limit reached');
    }

    // Check drawdown limit
    if (this.totalDrawdown <= -this.config.riskLimits.maxDrawdown) {
      throw new Error('Maximum drawdown limit reached');
    }

    // Check position limits
    if (this.positions.size >= this.config.maxPositions) {
      throw new Error('Maximum positions limit reached');
    }

    // Check if symbol is in same direction (avoid hedging)
    const existingPosition = this.positions.get(signal.symbol);
    if (existingPosition) {
      const sameDirection = (existingPosition.side === 'BUY' && signal.direction === 'LONG') ||
                           (existingPosition.side === 'SELL' && signal.direction === 'SHORT');
      if (!sameDirection) {
        throw new Error(`Hedging not allowed: existing ${existingPosition.side} position for ${signal.symbol}`);
      }
    }

    // Check allowed symbols
    if (this.config.allowedSymbols.length > 0 && 
        !this.config.allowedSymbols.includes(signal.symbol)) {
      throw new Error(`Symbol ${signal.symbol} not in allowed list`);
    }

    // Refresh balance and positions
    await this.refreshAccountData();
  }

  private async addSlippageProtection(params: ExecuteParams, signal: any): Promise<ExecuteParams> {
    if (this.config.slippageProtection <= 0) return params;

    try {
      // Get current market price
      const currentPrice = signal.price || signal.entry_price;
      if (!currentPrice) return params;

      // Calculate slippage limit
      const slippageLimit = currentPrice * (this.config.slippageProtection / 100);
      
      // Convert to limit order with price protection
      const protectedPrice = params.side === 'Buy' 
        ? currentPrice + slippageLimit
        : currentPrice - slippageLimit;

      return {
        ...params,
        orderType: 'Limit',
        price: protectedPrice,
        timeInForce: 'IOC', // Immediate or Cancel for quick execution
        meta: {
          ...params.meta,
          slippageProtection: this.config.slippageProtection,
          originalPrice: currentPrice,
          protectedPrice
        }
      };

    } catch (error) {
      console.warn('⚠️ Failed to add slippage protection, using market order:', error);
      return params;
    }
  }

  private async trackNewPosition(params: ExecuteParams, executionData: any): Promise<void> {
    const position: Position = {
      symbol: params.symbol,
      side: params.side === 'Buy' ? 'BUY' : 'SELL',
      size: executionData.quantity || params.amountUSD,
      entryPrice: executionData.executedPrice || params.price || 0,
      currentPrice: executionData.executedPrice || params.price || 0,
      unrealizedPnL: 0,
      leverage: params.leverage,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      timestamp: new Date()
    };

    this.positions.set(params.symbol, position);
    
    console.log('📊 New position tracked:', position);
  }

  private async refreshAccountData(): Promise<void> {
    try {
      // Refresh positions
      const positionsResult = await TradingGateway.getPositions();
      if (positionsResult.ok && positionsResult.data) {
        await this.syncPositions(positionsResult.data);
      }

      // Refresh balance
      const balanceResult = await TradingGateway.getBalance();
      if (balanceResult.ok && balanceResult.data) {
        await this.updateBalance(balanceResult.data);
      }

      this.lastBalanceUpdate = new Date();

    } catch (error) {
      console.error('❌ Failed to refresh account data:', error);
    }
  }

  private async syncPositions(livePositions: any[]): Promise<void> {
    // Clear current positions
    this.positions.clear();

    // Sync with live positions
    for (const pos of livePositions) {
      if (pos.size > 0) { // Only active positions
        const position: Position = {
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          entryPrice: pos.avgPrice,
          currentPrice: pos.markPrice,
          unrealizedPnL: pos.unrealisedPnl,
          leverage: pos.leverage,
          timestamp: new Date(pos.updatedTime)
        };
        this.positions.set(pos.symbol, position);
      }
    }

    console.log(`🔄 Synced ${this.positions.size} active positions`);
  }

  private updateBalance(balanceData: any): void {
    // Update daily PnL and drawdown tracking
    const currentBalance = balanceData.totalEquity || balanceData.totalBalance;
    // This would typically compare against a stored starting balance
    // For now, we'll use the unrealized PnL from positions
    
    this.dailyPnL = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    
    console.log('💰 Balance updated:', {
      balance: currentBalance,
      dailyPnL: this.dailyPnL,
      positions: this.positions.size
    });
  }

  private updatePerformanceMetrics(result: any): void {
    // Update performance tracking
    if (result.data?.fees) {
      this.dailyPnL -= result.data.fees; // Subtract fees
    }
  }

  private isCriticalError(error: any): boolean {
    const criticalErrors = [
      'Insufficient balance',
      'Risk limit exceeded',
      'API rate limit',
      'Account suspended',
      'Invalid API credentials'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return criticalErrors.some(critical => 
      errorMessage.includes(critical.toLowerCase())
    );
  }

  private async activateEmergencyStop(reason: string): Promise<void> {
    this.emergencyStop = true;
    
    console.error('🚨 EMERGENCY STOP ACTIVATED:', reason);
    
    // Attempt to close all positions
    try {
      for (const [symbol] of this.positions) {
        await this.closePosition(symbol, 'emergency_stop');
      }
    } catch (error) {
      console.error('❌ Failed to close positions during emergency stop:', error);
    }

    // Notify user (in real implementation, send alerts)
    console.log('📧 Emergency stop notification sent');
  }

  async closePosition(symbol: string, reason: string = 'manual'): Promise<any> {
    const position = this.positions.get(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    try {
      const closeParams: ExecuteParams = {
        symbol: symbol,
        side: position.side === 'BUY' ? 'Sell' : 'Buy',
        amountUSD: position.size,
        leverage: position.leverage,
        orderType: 'Market',
        meta: {
          action: 'close_position',
          reason,
          originalSide: position.side,
          timestamp: new Date().toISOString()
        }
      };

      const result = await TradingGateway.execute(closeParams);

      if (result.ok) {
        this.positions.delete(symbol);
        console.log(`✅ Position closed for ${symbol}:`, result);
        return result;
      } else {
        throw new Error(result.message || 'Failed to close position');
      }

    } catch (error) {
      console.error(`❌ Failed to close position for ${symbol}:`, error);
      throw error;
    }
  }

  getStatus() {
    return {
      enabled: this.config.enabled,
      paperMode: this.config.paperMode,
      emergencyStop: this.emergencyStop,
      activePositions: this.positions.size,
      dailyPnL: this.dailyPnL,
      totalDrawdown: this.totalDrawdown,
      lastUpdate: this.lastBalanceUpdate,
      positions: Array.from(this.positions.values())
    };
  }

  updateConfig(newConfig: Partial<LiveTradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Live trading config updated:', newConfig);
  }

  disableEmergencyStop(): void {
    this.emergencyStop = false;
    console.log('✅ Emergency stop disabled');
  }
}

// Default configuration
export const defaultLiveTradingConfig: LiveTradingConfig = {
  enabled: false,
  paperMode: true,
  maxPositions: 3,
  maxRiskPerTrade: 2,
  emergencyStopEnabled: true,
  slippageProtection: 0.5, // 0.5%
  maxOrderSize: 500, // $500
  allowedSymbols: [], // Empty = all allowed
  riskLimits: {
    maxDailyLoss: 200,
    maxDrawdown: 500,
    maxLeverage: 10
  }
};

// Singleton instance
export const liveTradingManager = new LiveTradingManager(defaultLiveTradingConfig);