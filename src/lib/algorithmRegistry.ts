import { TradingAlgorithm, AlgorithmStatus } from '@/types/algorithms';
import { supabase } from '@/integrations/supabase/client';

export class AlgorithmRegistry {
  private algorithms: Map<string, TradingAlgorithm> = new Map();
  private statusMap: Map<string, AlgorithmStatus> = new Map();
  private subscribers: ((algorithms: TradingAlgorithm[]) => void)[] = [];

  constructor() {
    this.initializeAlgorithms();
  }

  private initializeAlgorithms() {
    const defaultAlgorithms: TradingAlgorithm[] = [
      {
        id: 'aitradex1-enhanced',
        name: 'AItradeX1 Enhanced Scanner',
        description: 'Advanced real-time market scanner with enhanced indicators',
        functionName: 'aitradex1-enhanced-scanner',
        category: 'scanner',
        status: 'active',
        performance: { profit: 15.2, winRate: 68, avgScore: 85 },
        config: {
          enabled: true,
          priority: 1,
          weight: 1.0,
          minScore: 80,
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'BNBUSDT'],
          timeframes: ['15m', '30m', '1h']
        }
      },
      {
        id: 'enhanced-signal-generation',
        name: 'Enhanced Signal Generator',
        description: 'Multi-timeframe signal generation with consensus scoring',
        functionName: 'enhanced-signal-generation',
        category: 'generator',
        status: 'active',
        performance: { profit: 12.8, winRate: 72, avgScore: 82 },
        config: {
          enabled: true,
          priority: 2,
          weight: 0.9,
          minScore: 75,
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
          timeframes: ['30m', '1h', '4h']
        }
      },
      {
        id: 'aitradex1-original',
        name: 'AItradeX1 Original Scanner',
        description: 'Classic market scanning algorithm with proven results',
        functionName: 'aitradex1-original-scanner',
        category: 'scanner',
        status: 'inactive',
        performance: { profit: 8.5, winRate: 65, avgScore: 78 },
        config: {
          enabled: false,
          priority: 3,
          weight: 0.7,
          minScore: 70,
          symbols: ['BTCUSDT', 'ETHUSDT'],
          timeframes: ['1h', '4h']
        }
      },
      {
        id: 'all-symbols-scanner',
        name: 'Universal Symbol Scanner',
        description: 'Comprehensive scanner covering all available trading pairs',
        functionName: 'all-symbols-scanner',
        category: 'scanner',
        status: 'inactive',
        performance: { profit: 6.2, winRate: 58, avgScore: 75 },
        config: {
          enabled: false,
          priority: 4,
          weight: 0.5,
          minScore: 75,
          symbols: [],
          timeframes: ['15m', '30m', '1h']
        }
      },
      {
        id: 'live-scanner-production',
        name: 'Production Live Scanner',
        description: 'High-performance production-grade scanning system',
        functionName: 'live-scanner-production',
        category: 'scanner',
        status: 'inactive',
        performance: { profit: 11.3, winRate: 64, avgScore: 81 },
        config: {
          enabled: false,
          priority: 2,
          weight: 0.8,
          minScore: 80,
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
          timeframes: ['15m', '30m']
        }
      }
    ];

    defaultAlgorithms.forEach(algo => {
      this.algorithms.set(algo.id, algo);
      this.statusMap.set(algo.id, {
        id: algo.id,
        status: algo.config?.enabled ? 'running' : 'stopped',
        lastUpdate: new Date(),
        metrics: { signalsGenerated: 0, successCount: 0, errorCount: 0 }
      });
    });
  }

  getAlgorithms(): TradingAlgorithm[] {
    return Array.from(this.algorithms.values());
  }

  getAlgorithm(id: string): TradingAlgorithm | undefined {
    return this.algorithms.get(id);
  }

  getActiveAlgorithms(): TradingAlgorithm[] {
    return this.getAlgorithms().filter(algo => algo.config?.enabled);
  }

  getAlgorithmStatus(id: string): AlgorithmStatus | undefined {
    return this.statusMap.get(id);
  }

  async toggleAlgorithm(id: string, enabled: boolean): Promise<void> {
    const algorithm = this.algorithms.get(id);
    if (!algorithm || !algorithm.config) return;

    const wasEnabled = algorithm.config.enabled;
    algorithm.config.enabled = enabled;

    const status = this.statusMap.get(id);
    if (status) {
      status.status = enabled ? 'running' : 'stopped';
      status.lastUpdate = new Date();
    }

    // If enabling, trigger the algorithm
    if (enabled && !wasEnabled) {
      await this.triggerAlgorithm(id);
    }

    this.notifySubscribers();
  }

  async updateAlgorithmConfig(id: string, config: Partial<TradingAlgorithm['config']>): Promise<void> {
    const algorithm = this.algorithms.get(id);
    if (!algorithm || !algorithm.config) return;

    algorithm.config = { ...algorithm.config, ...config };
    this.notifySubscribers();
  }

  async triggerAlgorithm(id: string): Promise<void> {
    const algorithm = this.algorithms.get(id);
    if (!algorithm || !algorithm.config?.enabled) return;

    try {
      console.log(`🚀 Triggering algorithm: ${algorithm.name}`);
      
      const status = this.statusMap.get(id);
      if (status) {
        status.status = 'running';
        status.lastUpdate = new Date();
      }

      // Invoke the corresponding Supabase function
      const { data, error } = await supabase.functions.invoke(algorithm.functionName, {
        body: {
          mode: 'full',
          symbols: algorithm.config.symbols,
          timeframes: algorithm.config.timeframes,
          minScore: algorithm.config.minScore
        }
      });

      if (error) {
        console.error(`❌ Algorithm ${algorithm.name} failed:`, error);
        if (status) {
          status.status = 'error';
          status.error = error.message;
          status.metrics!.errorCount++;
        }
        algorithm.status = 'error';
      } else {
        console.log(`✅ Algorithm ${algorithm.name} completed successfully`);
        if (status) {
          status.status = 'running';
          status.error = undefined;
          status.metrics!.successCount++;
        }
        algorithm.status = 'active';
        algorithm.lastRun = new Date();
      }

    } catch (error) {
      console.error(`❌ Failed to trigger algorithm ${algorithm.name}:`, error);
      const status = this.statusMap.get(id);
      if (status) {
        status.status = 'error';
        status.error = error instanceof Error ? error.message : 'Unknown error';
        status.metrics!.errorCount++;
      }
    }

    this.notifySubscribers();
  }

  async triggerAllActiveAlgorithms(): Promise<void> {
    const activeAlgorithms = this.getActiveAlgorithms();
    console.log(`🎯 Triggering ${activeAlgorithms.length} active algorithms`);
    
    await Promise.all(
      activeAlgorithms.map(algo => this.triggerAlgorithm(algo.id))
    );
  }

  subscribe(callback: (algorithms: TradingAlgorithm[]) => void): void {
    this.subscribers.push(callback);
  }

  private notifySubscribers(): void {
    const algorithms = this.getAlgorithms();
    this.subscribers.forEach(callback => callback(algorithms));
  }

  // Update algorithm performance based on signal results
  updateAlgorithmPerformance(algorithmId: string, signalId: string, profit: number): void {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm || !algorithm.performance) return;

    // Update performance metrics (simplified)
    algorithm.performance.profit += profit;
    algorithm.performance.winRate = profit > 0 ? 
      Math.min(95, algorithm.performance.winRate + 0.5) :
      Math.max(5, algorithm.performance.winRate - 0.5);

    this.notifySubscribers();
  }
}

export const algorithmRegistry = new AlgorithmRegistry();