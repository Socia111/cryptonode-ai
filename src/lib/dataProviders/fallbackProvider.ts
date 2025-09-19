import { Candle } from '../indicators/technicalIndicators';

/**
 * Fallback data provider for when primary source fails
 * This can be extended to use TradingView, Binance, or other data sources
 */
export class FallbackDataProvider {
  /**
   * Mock/generated fallback data for when real APIs fail
   * In production, this should connect to alternative data sources
   */
  async fetchFallbackCandles(
    symbol: string,
    timeframe: string,
    requiredCandles: number = 300
  ): Promise<Candle[]> {
    console.log(`[FallbackProvider] Generating fallback data for ${symbol} ${timeframe}`);
    
    // Generate synthetic OHLCV data for testing
    // In production, replace with actual alternative API calls
    const candles: Candle[] = [];
    const now = Date.now();
    const timeframeMs = this.getTimeframeMs(timeframe);
    
    // Base price for the symbol
    const basePrice = this.getBasePrice(symbol);
    let currentPrice = basePrice;
    
    for (let i = requiredCandles - 1; i >= 0; i--) {
      const time = now - (i * timeframeMs);
      
      // Generate realistic price movement
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const range = open * 0.01 * Math.random(); // 1% max range
      
      const high = open + Math.abs(range);
      const low = open - Math.abs(range);
      const close = open * (1 + change);
      
      // Ensure OHLC logic is maintained
      const ohlc = {
        open,
        high: Math.max(open, close, high),
        low: Math.min(open, close, low),
        close
      };
      
      candles.push({
        time,
        ...ohlc,
        volume: 1000000 + Math.random() * 5000000 // Random volume
      });
      
      currentPrice = close;
    }
    
    console.log(`[FallbackProvider] Generated ${candles.length} fallback candles`);
    return candles.sort((a, b) => a.time - b.time);
  }

  /**
   * Merge candles from primary and fallback sources
   * Prioritizes primary source data
   */
  mergeCandles(primary: Candle[], fallback: Candle[]): Candle[] {
    if (primary.length === 0) return fallback;
    if (fallback.length === 0) return primary;
    
    // Use primary if it has sufficient data
    if (primary.length >= 250) return primary;
    
    // Otherwise, try to fill gaps with fallback data
    const merged = [...primary];
    const primaryTimes = new Set(primary.map(c => c.time));
    
    // Add fallback candles that don't exist in primary
    for (const candle of fallback) {
      if (!primaryTimes.has(candle.time)) {
        merged.push(candle);
      }
    }
    
    return merged.sort((a, b) => a.time - b.time);
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
    
    return timeframeToMs[timeframe] || 60 * 60 * 1000;
  }

  private getBasePrice(symbol: string): number {
    // Base prices for common symbols
    const basePrices: Record<string, number> = {
      'BTCUSDT': 43000,
      'ETHUSDT': 2400,
      'BNBUSDT': 320,
      'ADAUSDT': 0.35,
      'SOLUSDT': 100,
      'DOTUSDT': 5.5,
      'LINKUSDT': 14,
      'AVAXUSDT': 25,
      'MATICUSDT': 0.85,
      'UNIUSDT': 7.5
    };
    
    return basePrices[symbol] || 100; // Default price
  }
}
