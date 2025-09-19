import { supabase } from '@/integrations/supabase/client';
import { Signal } from '@/types/trading';

export interface SignalSource {
  id: string;
  name: string;
  weight: number;
  reliabilityScore: number;
  lastUpdate: Date;
}

export interface AggregatedSignal extends Signal {
  sources: SignalSource[];
  consensusScore: number;
  reliability: number;
  conflictLevel: number;
  aggregatedConfidence: number;
}

export interface SignalCorrelation {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  agreementCount: number;
  totalSources: number;
  avgConfidence: number;
  priceTargets: number[];
  timeframes: string[];
}

export class SmartSignalAggregator {
  private sources: SignalSource[] = [
    { id: 'enhanced-scanner', name: 'Enhanced Scanner', weight: 0.4, reliabilityScore: 0.85, lastUpdate: new Date() },
    { id: 'live-scanner', name: 'Live Scanner', weight: 0.3, reliabilityScore: 0.78, lastUpdate: new Date() },
    { id: 'quantum-analysis', name: 'Quantum Analysis', weight: 0.3, reliabilityScore: 0.82, lastUpdate: new Date() }
  ];

  private readonly CONSENSUS_THRESHOLD = 0.6; // 60% agreement required
  private readonly MIN_SOURCES = 2; // Minimum sources for consensus
  private readonly CORRELATION_WINDOW = 300000; // 5 minutes

  async aggregateSignals(): Promise<AggregatedSignal[]> {
    try {
      // Fetch recent signals from all sources
      const signals = await this.fetchRecentSignals();
      
      // Group signals by symbol
      const groupedSignals = this.groupSignalsBySymbol(signals);
      
      // Create aggregated signals
      const aggregated: AggregatedSignal[] = [];
      
      for (const [symbol, symbolSignals] of groupedSignals) {
        const correlation = this.analyzeCorrelation(symbolSignals);
        
        if (this.meetsConsensusThreshold(correlation)) {
          const aggregatedSignal = this.createAggregatedSignal(symbol, symbolSignals, correlation);
          aggregated.push(aggregatedSignal);
        }
      }
      
      // Sort by consensus score and reliability
      return aggregated.sort((a, b) => 
        (b.consensusScore * b.reliability) - (a.consensusScore * a.reliability)
      );
      
    } catch (error) {
      console.error('❌ Signal aggregation failed:', error);
      return [];
    }
  }

  private async fetchRecentSignals(): Promise<Signal[]> {
    const fiveMinutesAgo = new Date(Date.now() - this.CORRELATION_WINDOW);
    
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', fiveMinutesAgo.toISOString())
      .gte('score', 70)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Signal[];
  }

  private groupSignalsBySymbol(signals: Signal[]): Map<string, Signal[]> {
    const grouped = new Map<string, Signal[]>();
    
    for (const signal of signals) {
      const key = signal.symbol;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(signal);
    }
    
    return grouped;
  }

  private analyzeCorrelation(signals: Signal[]): SignalCorrelation {
    const directions = signals.map(s => s.direction);
    const longCount = directions.filter(d => d === 'LONG').length;
    const shortCount = directions.filter(d => d === 'SHORT').length;
    
    const dominantDirection = longCount > shortCount ? 'LONG' : 'SHORT';
    const agreementCount = Math.max(longCount, shortCount);
    
    return {
      symbol: signals[0].symbol,
      direction: dominantDirection,
      agreementCount,
      totalSources: signals.length,
      avgConfidence: signals.reduce((sum, s) => sum + s.score, 0) / signals.length,
      priceTargets: signals.map(s => s.entry_price || s.price).filter(Boolean),
      timeframes: [...new Set(signals.map(s => s.timeframe))]
    };
  }

  private meetsConsensusThreshold(correlation: SignalCorrelation): boolean {
    const consensusRatio = correlation.agreementCount / correlation.totalSources;
    return consensusRatio >= this.CONSENSUS_THRESHOLD && 
           correlation.totalSources >= this.MIN_SOURCES;
  }

  private createAggregatedSignal(symbol: string, signals: Signal[], correlation: SignalCorrelation): AggregatedSignal {
    const primarySignal = signals.find(s => s.direction === correlation.direction) || signals[0];
    
    // Calculate weighted average of key metrics
    const weightedPrice = this.calculateWeightedAverage(
      signals.map(s => ({ value: s.entry_price || s.price, weight: s.score / 100 }))
    );
    
    const weightedStopLoss = this.calculateWeightedAverage(
      signals.filter(s => s.stop_loss).map(s => ({ value: s.stop_loss!, weight: s.score / 100 }))
    );
    
    const weightedTakeProfit = this.calculateWeightedAverage(
      signals.filter(s => s.take_profit).map(s => ({ value: s.take_profit!, weight: s.score / 100 }))
    );

    const consensusScore = correlation.agreementCount / correlation.totalSources;
    const reliability = correlation.avgConfidence / 100;
    const conflictLevel = 1 - consensusScore;
    
    return {
      ...primarySignal,
      id: `aggregated-${symbol}-${Date.now()}`,
      symbol,
      direction: correlation.direction,
      entry_price: weightedPrice,
      stop_loss: weightedStopLoss || primarySignal.stop_loss,
      take_profit: weightedTakeProfit || primarySignal.take_profit,
      score: Math.round(correlation.avgConfidence * consensusScore),
      sources: this.sources,
      consensusScore,
      reliability,
      conflictLevel,
      aggregatedConfidence: Math.round(reliability * consensusScore * 100),
      signal_type: 'AGGREGATED'
    };
  }

  private calculateWeightedAverage(items: { value: number; weight: number }[]): number {
    if (items.length === 0) return 0;
    
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = items.reduce((sum, item) => sum + (item.value * item.weight), 0);
    
    return weightedSum / totalWeight;
  }

  async validateSignalQuality(signal: AggregatedSignal): Promise<boolean> {
    // Enhanced validation for aggregated signals
    const checks = [
      signal.consensusScore >= this.CONSENSUS_THRESHOLD,
      signal.reliability >= 0.7,
      signal.conflictLevel <= 0.4,
      signal.sources.length >= this.MIN_SOURCES,
      signal.aggregatedConfidence >= 75
    ];
    
    const passed = checks.filter(Boolean).length;
    const score = passed / checks.length;
    
    console.log(`📊 Signal Quality Check for ${signal.symbol}:`, {
      consensusScore: signal.consensusScore,
      reliability: signal.reliability,
      conflictLevel: signal.conflictLevel,
      sources: signal.sources.length,
      confidence: signal.aggregatedConfidence,
      passed: `${passed}/${checks.length}`,
      score
    });
    
    return score >= 0.8; // 80% of checks must pass
  }

  updateSourceReliability(sourceId: string, performance: number) {
    const source = this.sources.find(s => s.id === sourceId);
    if (source) {
      // Update reliability based on performance (0-1 scale)
      source.reliabilityScore = (source.reliabilityScore * 0.8) + (performance * 0.2);
      source.lastUpdate = new Date();
      
      console.log(`📈 Updated source reliability for ${source.name}: ${source.reliabilityScore.toFixed(3)}`);
    }
  }
}

// Singleton instance
export const smartSignalAggregator = new SmartSignalAggregator();