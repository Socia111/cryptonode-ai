// Trade queue system for reliable trade execution
import { TradingGateway, ExecuteParams } from './tradingGateway';

interface QueuedTrade extends ExecuteParams {
  id: string;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

class TradeQueue {
  private queue: QueuedTrade[] = [];
  private isProcessing = false;
  private maxConcurrent = 3;
  private processing = new Set<string>();

  addTrade(params: ExecuteParams): string {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedTrade: QueuedTrade = {
      ...params,
      id: tradeId,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending'
    };

    this.queue.push(queuedTrade);
    console.log(`📋 Trade queued: ${tradeId} for ${params.symbol} ${params.side}`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return tradeId;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log('🔄 Starting trade queue processing...');

    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const trade = this.queue.find(t => t.status === 'pending');
      if (!trade) break;

      trade.status = 'executing';
      this.processing.add(trade.id);

      // Execute trade asynchronously
      this.executeTrade(trade).finally(() => {
        this.processing.delete(trade.id);
        // Remove completed/failed trades from queue
        this.queue = this.queue.filter(t => !['completed', 'failed'].includes(t.status));
      });
    }

    // Check if we should continue processing
    setTimeout(() => {
      if (this.queue.some(t => t.status === 'pending') || this.processing.size > 0) {
        this.processQueue();
      } else {
        this.isProcessing = false;
        console.log('✅ Trade queue processing completed');
      }
    }, 1000);
  }

  private async executeTrade(trade: QueuedTrade) {
    try {
      console.log(`🚀 Executing trade ${trade.id}: ${trade.symbol} ${trade.side}`);
      
      const result = await TradingGateway.execute({
        symbol: trade.symbol,
        side: trade.side,
        amountUSD: trade.amountUSD,
        leverage: trade.leverage
      });

      if (result.ok) {
        trade.status = 'completed';
        console.log(`✅ Trade ${trade.id} completed successfully for ${trade.symbol} ${trade.side}`);
      } else {
        throw new Error(result.message || 'Trade execution failed');
      }

    } catch (error: any) {
      console.error(`❌ Trade ${trade.id} failed:`, error.message);
      
      trade.retries++;
      if (trade.retries < trade.maxRetries) {
        trade.status = 'pending'; // Retry
        console.log(`🔄 Retrying trade ${trade.id} (${trade.retries}/${trade.maxRetries})`);
      } else {
        trade.status = 'failed';
        console.log(`💀 Trade ${trade.id} failed permanently after ${trade.retries} retries`);
      }
    }
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(t => t.status === 'pending').length,
      executing: this.queue.filter(t => t.status === 'executing').length,
      completed: this.queue.filter(t => t.status === 'completed').length,
      failed: this.queue.filter(t => t.status === 'failed').length,
      processing: this.processing.size
    };
  }
}

// Global trade queue instance
export const tradeQueue = new TradeQueue();