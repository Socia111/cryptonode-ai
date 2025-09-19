export interface TradingAlgorithm {
  id: string;
  name: string;
  description: string;
  functionName: string;
  category: 'scanner' | 'generator' | 'analyzer';
  status: 'active' | 'inactive' | 'error';
  lastRun?: Date;
  successRate?: number;
  signalsGenerated?: number;
  performance?: {
    profit: number;
    winRate: number;
    avgScore: number;
  };
  config?: {
    enabled: boolean;
    priority: number;
    weight: number;
    minScore: number;
    symbols?: string[];
    timeframes?: string[];
  };
}

export interface AlgorithmStatus {
  id: string;
  status: 'running' | 'stopped' | 'error';
  lastUpdate: Date;
  error?: string;
  metrics?: {
    signalsGenerated: number;
    successCount: number;
    errorCount: number;
  };
}

export interface AlgorithmConfig {
  enabled: boolean;
  priority: number;
  weight: number;
  minScore: number;
  symbols: string[];
  timeframes: string[];
  riskLevel: 'low' | 'medium' | 'high';
  parameters?: Record<string, any>;
}