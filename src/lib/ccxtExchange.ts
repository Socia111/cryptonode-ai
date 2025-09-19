import ccxt from 'ccxt';

// CCXT Exchange Integration for multi-exchange support
export class CCXTExchangeManager {
  private exchanges: Map<string, any> = new Map();
  private initialized = false;

  constructor() {
    this.initializeExchanges();
  }

  private async initializeExchanges() {
    try {
      // Initialize multiple exchanges with CCXT
      const exchanges = {
        bybit: new ccxt.bybit({
          apiKey: '', // Will be set from user credentials
          secret: '', 
          sandbox: false, // Live trading enabled
          enableRateLimit: true,
          options: {
            defaultType: 'swap' // For perpetual futures
          }
        }),
        binance: new ccxt.binance({
          apiKey: '',
          secret: '',
          sandbox: false,
          enableRateLimit: true,
          options: {
            defaultType: 'future'
          }
        }),
        okx: new ccxt.okx({
          apiKey: '',
          secret: '',
          sandbox: false,
          enableRateLimit: true,
          options: {
            defaultType: 'swap'
          }
        })
      };

      // Store exchanges
      for (const [name, exchange] of Object.entries(exchanges)) {
        this.exchanges.set(name, exchange);
      }

      this.initialized = true;
      console.log('🔗 CCXT Exchanges initialized:', Array.from(this.exchanges.keys()));
    } catch (error) {
      console.error('❌ Failed to initialize CCXT exchanges:', error);
    }
  }

  async getExchange(exchangeName: string) {
    if (!this.initialized) {
      await this.initializeExchanges();
    }
    return this.exchanges.get(exchangeName.toLowerCase());
  }

  async getAllUSDTSymbols(exchangeName: string = 'bybit'): Promise<string[]> {
    try {
      const exchange = await this.getExchange(exchangeName);
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      await exchange.loadMarkets();
      const markets = exchange.markets;
      
      // Filter for USDT perpetual trading pairs
      const usdtSymbols = Object.keys(markets).filter(symbol => {
        const market = markets[symbol];
        return (
          market.quote === 'USDT' &&
          market.active &&
          (market.type === 'swap' || market.type === 'future') &&
          market.linear === true
        );
      });

      console.log(`📊 Found ${usdtSymbols.length} USDT symbols on ${exchangeName}`);
      return usdtSymbols.slice(0, 100); // Limit to top 100 for performance
    } catch (error) {
      console.error(`❌ Failed to get USDT symbols from ${exchangeName}:`, error);
      return [];
    }
  }

  async getMarketData(exchangeName: string, symbol: string) {
    try {
      const exchange = await this.getExchange(exchangeName);
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      const [ticker, ohlcv] = await Promise.all([
        exchange.fetchTicker(symbol),
        exchange.fetchOHLCV(symbol, '1h', undefined, 50) // Last 50 hours of data
      ]);

      // Calculate technical indicators
      const prices = ohlcv.map(candle => candle[4]); // Close prices
      const volumes = ohlcv.map(candle => candle[5]); // Volumes
      
      const rsi = this.calculateRSI(prices, 14);
      const ema21 = this.calculateEMA(prices, 21);
      const sma200 = this.calculateSMA(prices, Math.min(200, prices.length));
      const atr = this.calculateATR(ohlcv, 14);

      return {
        symbol,
        exchange: exchangeName,
        price: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        volume: ticker.baseVolume,
        volume_quote: ticker.quoteVolume,
        change_24h: ticker.change,
        change_24h_percent: ticker.percentage,
        high_24h: ticker.high,
        low_24h: ticker.low,
        rsi_14: rsi,
        ema21: ema21,
        sma200: sma200,
        atr_14: atr,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get market data for ${symbol} on ${exchangeName}:`, error);
      return null;
    }
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private calculateATR(ohlcv: number[][], period: number): number {
    if (ohlcv.length < period + 1) {
      const latest = ohlcv[ohlcv.length - 1];
      return (latest[2] - latest[3]) / latest[4] * 100; // (high - low) / close * 100
    }
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < ohlcv.length; i++) {
      const [, , high, low, close] = ohlcv[i];
      const prevClose = ohlcv[i - 1][4];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    return atr;
  }

  async getSupportedExchanges(): Promise<string[]> {
    return Array.from(this.exchanges.keys());
  }

  async testExchangeConnection(exchangeName: string): Promise<boolean> {
    try {
      const exchange = await this.getExchange(exchangeName);
      if (!exchange) return false;
      
      await exchange.fetchStatus();
      return true;
    } catch (error) {
      console.error(`❌ Failed to test ${exchangeName} connection:`, error);
      return false;
    }
  }
}

// Global instance
export const ccxtManager = new CCXTExchangeManager();