// Trade queue system for reliable trade execution
import { TradingGateway } from './tradingGateway';
import { ExecuteParams, normalizeSide, type Side } from './tradingTypes';

export interface QueuedTrade extends ExecuteParams {
  id: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
}

class TradeQueueManager {
  private queue: QueuedTrade[] = [];
  private isProcessing = false;
  private status: 'idle' | 'processing' | 'error' = 'idle';
  private metrics = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    lastProcessedAt: undefined as Date | undefined
  };
  private maxRetries = 3;
  private processingDelay = 2000; // 2 seconds between trades

  private listeners: ((queue: QueuedTrade[]) => void)[] = [];

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  subscribe(listener: (queue: QueuedTrade[]) => void) {
    this.listeners.push(listener);
    listener([...this.queue]);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  addTrade(params: ExecuteParams): string {
    const trade: QueuedTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };
    
    this.queue.push(trade);
    this.notifyListeners();
    
    console.log(`📋 Trade queued: ${trade.symbol} ${trade.side} $${trade.amountUSD}`);
    
    if (!this.isProcessing) {
      this.startProcessing();
    }
    
    return trade.id;
  }

  private async startProcessing() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    this.status = 'processing';
    
    while (this.queue.length > 0) {
      const trade = this.queue[0];
      console.log(`🎯 Executing trade: ${trade.symbol} ${trade.side}`);
      
      const result = await TradingGateway.execute(trade);
      console.log(`📊 Trade result for ${trade.symbol}:`, result);
      console.log(`📈 ${trade.side} ${trade.amountUSD || 'unknown'} USD`);
      
      if (result.ok) {
        trade.status = 'completed';
        this.metrics.successCount++;
        console.log(`✅ Trade completed: ${trade.symbol}`);
      } else {
        trade.attempts++;
        if (trade.attempts >= this.maxRetries) {
          trade.status = 'failed';
          trade.error = result.message || 'Max retries exceeded';
          this.metrics.errorCount++;
          console.log(`❌ Trade failed permanently: ${trade.symbol} after ${trade.attempts} attempts`);
        } else {
          console.log(`⚠️ Trade failed, will retry: ${trade.symbol} (attempt ${trade.attempts}/${this.maxRetries})`);
          // Keep in queue for retry
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
          continue;
        }
      }
      
      this.queue.shift();
      this.metrics.totalProcessed++;
      this.metrics.lastProcessedAt = new Date();
      this.notifyListeners();
      
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }
    
    this.isProcessing = false;
    this.status = 'idle';
    console.log(`🏁 Queue processing complete. Metrics:`, this.metrics);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getStatus() {
    return this.status;
  }

  clearQueue() {
    this.queue = [];
    this.notifyListeners();
  }
}

export const tradeQueue = new TradeQueueManager();
