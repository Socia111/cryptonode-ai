import { supabase } from '@/integrations/supabase/client';
import { Signal, TradeExecution } from '@/types/trading';
import { TradingAlgorithm } from '@/types/algorithms';
import { algorithmRegistry } from './algorithmRegistry';
import { automatedTradingEngine, AutoTradingConfig } from './automatedTrading';

export interface EnhancedAutoTradingConfig extends AutoTradingConfig {
  algorithmWeights: Record<string, number>;
  multiAlgorithmConsensus: boolean;
  consensusThreshold: number;
  algorithmDiversification: boolean;
  maxActiveAlgorithms: number;
}

export class EnhancedAutomatedTradingEngine {
  private baseEngine = automatedTradingEngine;
  private config: EnhancedAutoTradingConfig;
  private algorithmPerformance = new Map<string, { trades: number; profit: number; winRate: number }>();

  constructor(config: EnhancedAutoTradingConfig) {
    this.config = config;
  }

  async start() {
    console.log('🚀 Starting Enhanced Automated Trading Engine...');
    
    // Start the base engine
    await this.baseEngine.start();
    
    // Start algorithm monitoring
    this.startAlgorithmMonitoring();
    
    // Subscribe to multi-algorithm signals
    this.subscribeToMultiAlgorithmSignals();
  }

  async stop() {
    console.log('🛑 Stopping Enhanced Automated Trading Engine...');
    await this.baseEngine.stop();
  }

  private subscribeToMultiAlgorithmSignals() {
    const channel = supabase
      .channel('enhanced-auto-trading-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => this.processMultiAlgorithmSignal(payload.new as Signal)
      )
      .subscribe();
  }

  private async processMultiAlgorithmSignal(signal: Signal) {
    console.log('📊 Processing multi-algorithm signal:', signal.symbol, signal.direction);
    
    if (this.config.multiAlgorithmConsensus) {
      // Check for consensus across multiple algorithms
      const consensus = await this.checkAlgorithmConsensus(signal);
      
      if (consensus.strength < this.config.consensusThreshold) {
        console.log('❌ Insufficient algorithm consensus, skipping signal');
        return;
      }
      
      console.log(`✅ Strong consensus (${consensus.strength}%) from ${consensus.algorithms.length} algorithms`);
      
      // Weight the signal based on algorithm consensus
      const weightedSignal = this.applyAlgorithmWeights(signal, consensus.algorithms);
      
      // Execute trade with enhanced parameters
      await this.executeWeightedTrade(weightedSignal, consensus);
    } else {
      // Process individual algorithm signal
      await this.processSingleAlgorithmSignal(signal);
    }
  }

  private async checkAlgorithmConsensus(signal: Signal): Promise<{
    strength: number;
    algorithms: string[];
    avgScore: number;
  }> {
    // Get recent signals for the same symbol and direction
    const { data: recentSignals } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', signal.symbol)
      .eq('direction', signal.direction)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (!recentSignals || recentSignals.length < 2) {
      return { strength: 0, algorithms: [], avgScore: 0 };
    }

    // Group by algorithm source
    const algorithmGroups = recentSignals.reduce((acc, s) => {
      const source = s.source || 'unknown';
      if (!acc[source]) acc[source] = [];
      acc[source].push(s);
      return acc;
    }, {} as Record<string, Signal[]>);

    const algorithms = Object.keys(algorithmGroups);
    const avgScore = recentSignals.reduce((sum, s) => sum + s.score, 0) / recentSignals.length;
    
    // Calculate consensus strength (% of active algorithms agreeing)
    const activeAlgorithms = algorithmRegistry.getActiveAlgorithms();
    const consensusStrength = (algorithms.length / Math.max(activeAlgorithms.length, 1)) * 100;

    return {
      strength: consensusStrength,
      algorithms,
      avgScore
    };
  }

  private applyAlgorithmWeights(signal: Signal, algorithms: string[]): Signal {
    let totalWeight = 0;
    let weightedScore = 0;

    algorithms.forEach(algoId => {
      const weight = this.config.algorithmWeights[algoId] || 1.0;
      totalWeight += weight;
      weightedScore += signal.score * weight;
    });

    const finalScore = Math.min(100, weightedScore / totalWeight);

    return {
      ...signal,
      score: Math.round(finalScore),
      metadata: {
        ...signal.metadata,
        consensus: true,
        algorithmCount: algorithms.length,
        weightedScore: finalScore
      }
    };
  }

  private async executeWeightedTrade(signal: Signal, consensus: any) {
    try {
      console.log('🎯 Executing consensus-weighted trade:', signal.symbol);
      
      // Calculate position size based on consensus strength
      const basePositionSize = this.config.positionSizeUSD;
      const consensusMultiplier = Math.min(2.0, consensus.strength / 50); // Max 2x for 100% consensus
      const adjustedPositionSize = basePositionSize * consensusMultiplier;

      // Execute trade with enhanced parameters
      const tradeParams = {
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Buy' : 'Sell' as 'Buy' | 'Sell',
        amount: adjustedPositionSize,
        stopLoss: this.calculateEnhancedStopLoss(signal, consensus),
        takeProfit: this.calculateEnhancedTakeProfit(signal, consensus),
        paper_mode: this.config.paperMode,
        signal_id: signal.id,
        metadata: {
          consensus: true,
          algorithmCount: consensus.algorithms.length,
          consensusStrength: consensus.strength
        }
      };

      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          ...tradeParams
        }
      });

      if (error) throw error;

      console.log('✅ Consensus trade executed successfully:', data);
      
      // Update algorithm performance tracking
      consensus.algorithms.forEach((algoId: string) => {
        this.updateAlgorithmPerformance(algoId, 1); // Track trade execution
      });

    } catch (error) {
      console.error('❌ Failed to execute consensus trade:', error);
    }
  }

  private async processSingleAlgorithmSignal(signal: Signal) {
    // Get algorithm performance history
    const algorithmId = signal.source || 'unknown';
    const performance = this.algorithmPerformance.get(algorithmId);
    
    if (performance && performance.winRate < 50 && performance.trades > 10) {
      console.log(`❌ Algorithm ${algorithmId} has poor performance (${performance.winRate}%), skipping signal`);
      return;
    }

    // Apply algorithm-specific weight
    const weight = this.config.algorithmWeights[algorithmId] || 1.0;
    const adjustedScore = Math.min(100, signal.score * weight);

    if (adjustedScore < this.config.minSignalScore) {
      console.log(`❌ Weighted score ${adjustedScore} below threshold ${this.config.minSignalScore}`);
      return;
    }

    // Execute standard trade through base engine
    console.log(`📈 Processing single algorithm signal from ${algorithmId} (weight: ${weight})`);
  }

  private calculateEnhancedStopLoss(signal: Signal, consensus: any): number {
    if (signal.stop_loss) return signal.stop_loss;
    
    const price = signal.entry_price || signal.price;
    
    // Tighter stop loss for high consensus signals
    const baseStopLoss = this.config.stopLossPercent / 100;
    const consensusAdjustment = 1 - (consensus.strength / 200); // Reduce SL by up to 50% for 100% consensus
    const adjustedStopLoss = baseStopLoss * consensusAdjustment;
    
    return signal.direction === 'LONG' 
      ? price * (1 - adjustedStopLoss)
      : price * (1 + adjustedStopLoss);
  }

  private calculateEnhancedTakeProfit(signal: Signal, consensus: any): number {
    if (signal.take_profit) return signal.take_profit;
    
    const price = signal.entry_price || signal.price;
    
    // Higher take profit for high consensus signals
    const baseTakeProfit = this.config.takeProfitPercent / 100;
    const consensusMultiplier = 1 + (consensus.strength / 100); // Up to 2x TP for 100% consensus
    const adjustedTakeProfit = baseTakeProfit * consensusMultiplier;
    
    return signal.direction === 'LONG' 
      ? price * (1 + adjustedTakeProfit)
      : price * (1 - adjustedTakeProfit);
  }

  private startAlgorithmMonitoring() {
    // Monitor algorithm performance every minute
    const interval = setInterval(() => {
      this.monitorAlgorithmPerformance();
    }, 60000);
  }

  private async monitorAlgorithmPerformance() {
    const activeAlgorithms = algorithmRegistry.getActiveAlgorithms();
    
    for (const algorithm of activeAlgorithms) {
      // Get recent signals from this algorithm
      const { data: signals } = await supabase
        .from('signals')
        .select('*')
        .eq('source', algorithm.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(50);

      if (signals && signals.length > 0) {
        const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
        
        // Update algorithm performance in registry
        algorithmRegistry.updateAlgorithmPerformance(algorithm.id, `signal-${Date.now()}`, 0);
        
        console.log(`📊 Algorithm ${algorithm.name}: ${signals.length} signals, avg score: ${avgScore.toFixed(1)}`);
      }
    }
  }

  private updateAlgorithmPerformance(algorithmId: string, trades: number): void {
    const current = this.algorithmPerformance.get(algorithmId) || { trades: 0, profit: 0, winRate: 50 };
    current.trades += trades;
    this.algorithmPerformance.set(algorithmId, current);
  }

  public updateConfig(newConfig: Partial<EnhancedAutoTradingConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Extract base config properties for the base engine
    const baseConfig = {
      enabled: this.config.enabled,
      maxPositions: this.config.maxPositions,
      maxRiskPerTrade: this.config.maxRiskPerTrade,
      minSignalScore: this.config.minSignalScore,
      allowedTimeframes: this.config.allowedTimeframes,
      allowedSymbols: this.config.allowedSymbols,
      positionSizeUSD: this.config.positionSizeUSD,
      stopLossPercent: this.config.stopLossPercent,
      takeProfitPercent: this.config.takeProfitPercent,
      useSignalAggregation: this.config.useSignalAggregation,
      consensusRequired: this.config.consensusRequired,
      minSourcesForTrade: this.config.minSourcesForTrade,
      liveTrading: this.config.liveTrading,
      paperMode: this.config.paperMode,
      slippageProtection: this.config.slippageProtection,
      emergencyStopEnabled: this.config.emergencyStopEnabled,
      riskManagement: this.config.riskManagement
    };
    
    this.baseEngine.updateConfig(baseConfig);
    console.log('⚙️ Enhanced auto trading config updated');
  }

  public getStatus() {
    const baseStatus = this.baseEngine.getStatus();
    const activeAlgorithms = algorithmRegistry.getActiveAlgorithms().length;
    
    return {
      ...baseStatus,
      activeAlgorithms,
      algorithmPerformance: Object.fromEntries(this.algorithmPerformance),
      multiAlgorithmMode: this.config.multiAlgorithmConsensus
    };
  }
}

// Default enhanced configuration
export const defaultEnhancedAutoTradingConfig: EnhancedAutoTradingConfig = {
  enabled: false,
  maxPositions: 5,
  maxRiskPerTrade: 2,
  minSignalScore: 80,
  allowedTimeframes: ['15m', '30m', '1h'],
  allowedSymbols: [],
  positionSizeUSD: 100,
  stopLossPercent: 3,
  takeProfitPercent: 6,
  useSignalAggregation: true,
  consensusRequired: false,
  minSourcesForTrade: 2,
  liveTrading: false,
  paperMode: true,
  slippageProtection: 0.5,
  emergencyStopEnabled: true,
  riskManagement: {
    maxDailyLoss: 200,
    maxDrawdown: 500,
    dailyProfitTarget: 300,
    maxLeverage: 10
  },
  // Enhanced features
  algorithmWeights: {
    'aitradex1-enhanced': 1.0,
    'enhanced-signal-generation': 0.9,
    'aitradex1-original': 0.8,
    'all-symbols-scanner': 0.7,
    'live-scanner-production': 0.8
  },
  multiAlgorithmConsensus: true,
  consensusThreshold: 60, // 60% of algorithms must agree
  algorithmDiversification: true,
  maxActiveAlgorithms: 5
};

// Enhanced singleton instance
export const enhancedAutomatedTradingEngine = new EnhancedAutomatedTradingEngine(defaultEnhancedAutoTradingConfig);