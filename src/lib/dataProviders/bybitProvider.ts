import { Candle } from '../indicators/technicalIndicators';

export interface BybitKlineData {
  symbol: string;
  category: string;
  list: string[][]; // [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover]
}

export interface BybitKlineResponse {
  retCode: number;
  retMsg: string;
  result: BybitKlineData;
  time: number;
}

// Bybit timeframe mapping
const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1',
  '3m': '3', 
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '6h': '360',
  '12h': '720',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M'
};

export class BybitDataProvider {
  private baseUrl = 'https://api.bybit.com';
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second
  
  /**
   * Fetch OHLCV candles from Bybit
   * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
   * @param timeframe Timeframe (e.g., '1h', '4h', '1d')
   * @param limit Number of candles to fetch (max 1000)
   * @param startTime Start timestamp in milliseconds (optional)
   * @param endTime End timestamp in milliseconds (optional)
   */
  async fetchCandles(
    symbol: string, 
    timeframe: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]> {
    const interval = TIMEFRAME_MAP[timeframe];
    if (!interval) {
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }

    const url = new URL(`${this.baseUrl}/v5/market/kline`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', Math.min(limit, 1000).toString());
    url.searchParams.set('category', 'linear'); // For USDT perpetual contracts
    
    if (startTime) {
      url.searchParams.set('start', startTime.toString());
    }
    if (endTime) {
      url.searchParams.set('end', endTime.toString());
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[BybitProvider] Fetching ${symbol} ${timeframe} candles (attempt ${attempt})`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: BybitKlineResponse = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(`Bybit API error: ${data.retMsg} (code: ${data.retCode})`);
        }

        const candles = this.parseKlineData(data.result.list);
        console.log(`[BybitProvider] Successfully fetched ${candles.length} candles for ${symbol}`);
        return candles;

      } catch (error) {
        console.error(`[BybitProvider] Attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed to fetch ${symbol} data after ${this.maxRetries} attempts: ${error}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    return [];
  }

  /**
   * Fetch historical candles with pagination to get more data
   */
  async fetchHistoricalCandles(
    symbol: string,
    timeframe: string,
    requiredCandles: number = 300
  ): Promise<Candle[]> {
    let allCandles: Candle[] = [];
    let endTime = Date.now();
    const batchSize = 1000;
    
    // Calculate approximate time range based on timeframe
    const timeframeMs = this.getTimeframeMs(timeframe);
    
    while (allCandles.length < requiredCandles) {
      const startTime = endTime - (batchSize * timeframeMs);
      
      try {
        const batch = await this.fetchCandles(symbol, timeframe, batchSize, startTime, endTime);
        
        if (batch.length === 0) {
          console.log(`[BybitProvider] No more historical data available for ${symbol}`);
          break;
        }

        // Prepend to maintain chronological order
        allCandles = [...batch.reverse(), ...allCandles];
        
        // Set endTime to the earliest candle time for next batch
        endTime = batch[0].time - timeframeMs;
        
        console.log(`[BybitProvider] Fetched ${batch.length} candles, total: ${allCandles.length}`);
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[BybitProvider] Error fetching historical batch:`, error);
        break;
      }
    }

    // Remove duplicates and sort
    const uniqueCandles = this.removeDuplicates(allCandles);
    return uniqueCandles.slice(-requiredCandles); // Return most recent N candles
  }

  private parseKlineData(klineList: string[][]): Candle[] {
    return klineList.map(item => ({
      time: parseInt(item[0]), // startTime
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).sort((a, b) => a.time - b.time); // Ensure chronological order
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframeToMs: Record<string, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    
    return timeframeToMs[timeframe] || 60 * 60 * 1000; // Default to 1 hour
  }

  private removeDuplicates(candles: Candle[]): Candle[] {
    const seen = new Set<number>();
    return candles.filter(candle => {
      if (seen.has(candle.time)) {
        return false;
      }
      seen.add(candle.time);
      return true;
    });
  }
}