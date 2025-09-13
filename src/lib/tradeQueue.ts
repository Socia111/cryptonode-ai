import { TradingGateway, ExecuteParams, ExecResult } from './tradingGateway';

interface QueuedTrade extends ExecuteParams {
  id: string;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class TradeQueue {
  private queue: QueuedTrade[] = [];
  private isProcessing = false;
  private maxConcurrent = 1;
  private processing = new Set<string>();

  addTrade(params: ExecuteParams): string {
    const trade: QueuedTrade = {
      ...params,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending'
    };

    this.queue.push(trade);
    console.log(`📝 Trade queued: ${trade.symbol} ${trade.side} $${trade.amountUSD}`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return trade.id;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log(`🔄 Processing trade queue (${this.queue.length} trades)`);

    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const trade = this.queue.shift();
      if (!trade) continue;

      this.processing.add(trade.id);
      trade.status = 'processing';

      // Process trade without awaiting (concurrent processing)
      this.executeTrade(trade).finally(() => {
        this.processing.delete(trade.id);
      });
    }

    // Wait for all current trades to complete
    while (this.processing.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Continue processing if more trades were added
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    } else {
      this.isProcessing = false;
      console.log('✅ Trade queue processing completed');
    }
  }

  private async executeTrade(trade: QueuedTrade) {
    try {
      console.log(`🔄 Processing trade: ${trade.symbol} ${trade.side} $${trade.amountUSD}`);
      const result = await TradingGateway.execute(trade);
      console.log(`✅ Trade executed: ${trade.symbol} ${trade.side}`);
      console.log(`💰 Amount: $${trade.amountUSD}`);
      
      if (result.ok) {
        trade.status = 'completed';
        console.log(`✅ Trade ${trade.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }
    } catch (error: any) {
      console.error(`❌ Trade ${trade.id} failed:`, error.message);
      
      trade.retries++;
      if (trade.retries < trade.maxRetries) {
        console.log(`🔄 Retrying trade ${trade.id} (${trade.retries}/${trade.maxRetries})`);
        trade.status = 'pending';
        // Add back to queue for retry
        this.queue.unshift(trade);
      } else {
        trade.status = 'failed';
        console.error(`❌ Trade ${trade.id} failed permanently after ${trade.maxRetries} retries`);
      }
    }
  }

  getQueueStatus() {
    return {
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size
    };
  }
}

// Export singleton instance
export const tradeQueue = new TradeQueue();