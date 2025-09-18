/**
 * Live CCXT Feed - Continuous market data streaming
 * Streams real-time data from multiple exchanges using CCXT
 * Applies AITRADEX1 filtering logic to generate trading signals
 */

// @ts-ignore - CCXT types may not be available
import ccxt from 'ccxt';
import { supabase } from '@/lib/supabaseClient';

export interface RawMarketData {
  symbol: string;
  exchange: string;
  timestamp: number;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  high_24h: number;
  low_24h: number;
  change_24h: number;
  change_24h_percent: number;
  ohlcv?: number[][];
}

export interface AITRADEX1Signal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  timeframe: string;
  score: number;
  confidence: number;
  algo: string;
  exchange: string;
  indicators: {
    ema21: number;
    ema200: number;
    rsi_14: number;
    adx: number;
    plus_di: number;
    minus_di: number;
    volume_ratio: number;
    atr_14: number;
  };
  metadata: Record<string, any>;
}

export class LiveCCXTFeed {
  private exchanges: any[] = [];
  private isRunning = false;
  private feedInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly symbols = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT',
    'LINK/USDT', 'AVAX/USDT', 'MATIC/USDT', 'ATOM/USDT', 'NEAR/USDT',
    'FTM/USDT', 'ALGO/USDT', 'XRP/USDT', 'LTC/USDT', 'BCH/USDT',
    'UNI/USDT', 'AAVE/USDT', 'SUSHI/USDT', 'COMP/USDT', 'MKR/USDT'
  ];

  constructor() {
    this.initializeExchanges();
  }

  private initializeExchanges() {
    try {
      // Initialize multiple exchanges for data redundancy
      this.exchanges = [
        new ccxt.binance({
          sandbox: false,
          enableRateLimit: true,
          options: { defaultType: 'spot' }
        }),
        new ccxt.bybit({
          sandbox: false,
          enableRateLimit: true,
          options: { defaultType: 'spot' }
        }),
        new ccxt.okx({
          sandbox: false,
          enableRateLimit: true,
          options: { defaultType: 'spot' }
        })
      ];

      console.log('🚀 [CCXT Feed] Initialized exchanges:', this.exchanges.map(e => e.id));
    } catch (error) {
      console.error('❌ [CCXT Feed] Failed to initialize exchanges:', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ [CCXT Feed] Already running');
      return;
    }

    console.log('🟢 [CCXT Feed] Starting live data feed...');
    this.isRunning = true;

    // Start continuous data collection
    this.feedInterval = setInterval(async () => {
      await this.collectMarketData();
    }, this.UPDATE_INTERVAL);

    // Initial data collection
    await this.collectMarketData();
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('🔴 [CCXT Feed] Stopping live data feed...');
    this.isRunning = false;

    if (this.feedInterval) {
      clearInterval(this.feedInterval);
      this.feedInterval = null;
    }
  }

  private async collectMarketData() {
    try {
      console.log('📊 [CCXT Feed] Collecting market data...');

      const marketDataPromises = this.exchanges.map(async (exchange) => {
        try {
          // Fetch tickers for all symbols
          const tickers: Record<string, any> = await exchange.fetchTickers(this.symbols);
          
          // Fetch OHLCV data for signal generation
          const ohlcvPromises = this.symbols.map(async (symbol) => {
            try {
              const ohlcv1h: number[][] = await exchange.fetchOHLCV(symbol, '1h', undefined, 100);
              const ohlcv15m: number[][] = await exchange.fetchOHLCV(symbol, '15m', undefined, 100);
              const ohlcv5m: number[][] = await exchange.fetchOHLCV(symbol, '5m', undefined, 100);

              return {
                symbol,
                ohlcv: {
                  '1h': ohlcv1h,
                  '15m': ohlcv15m,
                  '5m': ohlcv5m
                }
              };
            } catch (error) {
              console.warn(`⚠️ [CCXT Feed] Failed to fetch OHLCV for ${symbol} on ${exchange.id}:`, error);
              return null;
            }
          });

          const ohlcvData = await Promise.all(ohlcvPromises);

          return {
            exchange: exchange.id,
            tickers,
            ohlcvData: ohlcvData.filter(d => d !== null)
          };
        } catch (error) {
          console.error(`❌ [CCXT Feed] Failed to fetch data from ${exchange.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(marketDataPromises);
      const validResults = results.filter(r => r !== null);

      if (validResults.length === 0) {
        console.warn('⚠️ [CCXT Feed] No valid market data collected');
        return;
      }

      // Process and store market data
      await this.processMarketData(validResults);

      // Generate signals using AITRADEX1 logic
      await this.generateAITRADEX1Signals(validResults);

    } catch (error) {
      console.error('❌ [CCXT Feed] Error in collectMarketData:', error);
    }
  }

  private async processMarketData(results: any[]) {
    try {
      const marketDataToStore: any[] = [];

      for (const result of results) {
        const { exchange, tickers } = result;

        for (const [symbol, ticker] of Object.entries(tickers as Record<string, any>)) {
          const rawData: RawMarketData = {
            symbol: symbol.replace('/', ''),
            exchange,
            timestamp: (ticker as any).timestamp || Date.now(),
            price: (ticker as any).last || 0,
            bid: (ticker as any).bid || 0,
            ask: (ticker as any).ask || 0,
            volume: (ticker as any).baseVolume || 0,
            high_24h: (ticker as any).high || 0,
            low_24h: (ticker as any).low || 0,
            change_24h: (ticker as any).change || 0,
            change_24h_percent: (ticker as any).percentage || 0
          };

          marketDataToStore.push({
            symbol: rawData.symbol,
            exchange: rawData.exchange,
            price: rawData.price,
            bid: rawData.bid,
            ask: rawData.ask,
            volume: rawData.volume,
            high_24h: rawData.high_24h,
            low_24h: rawData.low_24h,
            change_24h: rawData.change_24h,
            change_24h_percent: rawData.change_24h_percent,
            spread_bps: rawData.ask && rawData.bid ? 
              ((rawData.ask - rawData.bid) / rawData.price * 10000) : 0,
            raw_data: ticker as any,
            updated_at: new Date().toISOString()
          });
        }
      }

      // Bulk insert market data
      if (marketDataToStore.length > 0) {
        const { error } = await supabase
          .from('live_market_data')
          .upsert(marketDataToStore, {
            onConflict: 'symbol,exchange',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('❌ [CCXT Feed] Failed to store market data:', error);
        } else {
          console.log(`✅ [CCXT Feed] Stored ${marketDataToStore.length} market data points`);
        }
      }

    } catch (error) {
      console.error('❌ [CCXT Feed] Error processing market data:', error);
    }
  }

  private async generateAITRADEX1Signals(results: any[]) {
    try {
      const signals: AITRADEX1Signal[] = [];

      for (const result of results) {
        const { exchange, ohlcvData } = result;

        for (const symbolData of ohlcvData) {
          const { symbol, ohlcv } = symbolData;

          // Apply AITRADEX1 logic for each timeframe
          for (const [timeframe, candles] of Object.entries(ohlcv as Record<string, number[][]>)) {
            if (!candles || candles.length < 200) continue; // Need enough data

            const signal = this.applyAITRADEX1Logic(symbol, candles, timeframe, exchange);
            if (signal) {
              signals.push(signal);
            }
          }
        }
      }

      // Store valid signals (score >= 70)
      const validSignals = signals.filter(s => s.score >= 70);
      
      if (validSignals.length > 0) {
        const signalsToStore = validSignals.map(signal => ({
          symbol: signal.symbol.replace('/', ''),
          direction: signal.direction,
          price: signal.entry_price,
          sl: signal.stop_loss,
          tp: signal.take_profit,
          timeframe: signal.timeframe,
          score: signal.score,
          confidence: signal.confidence,
          algo: signal.algo,
          exchange: signal.exchange,
          indicators: signal.indicators,
          metadata: signal.metadata,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('signals')
          .insert(signalsToStore);

        if (error) {
          console.error('❌ [CCXT Feed] Failed to store signals:', error);
        } else {
          console.log(`🎯 [CCXT Feed] Generated ${validSignals.length} AITRADEX1 signals`);
        }
      }

    } catch (error) {
      console.error('❌ [CCXT Feed] Error generating signals:', error);
    }
  }

  private applyAITRADEX1Logic(symbol: string, candles: number[][], timeframe: string, exchange: string): AITRADEX1Signal | null {
    try {
      if (candles.length < 200) return null;

      // Extract OHLCV data
      const closes = candles.map(c => c[4]);
      const highs = candles.map(c => c[2]);
      const lows = candles.map(c => c[3]);
      const volumes = candles.map(c => c[5]);

      // Calculate technical indicators
      const ema21 = this.calculateEMA(closes, 21);
      const ema200 = this.calculateEMA(closes, 200);
      const rsi14 = this.calculateRSI(closes, 14);
      const atr14 = this.calculateATR(highs, lows, closes, 14);
      const adx = this.calculateADX(highs, lows, closes, 14);
      const { plusDI, minusDI } = this.calculateDI(highs, lows, closes, 14);
      const volumeRatio = volumes[volumes.length - 1] / this.calculateSMA(volumes, 20);

      const currentPrice = closes[closes.length - 1];
      const currentEMA21 = ema21[ema21.length - 1];
      const currentEMA200 = ema200[ema200.length - 1];
      const currentRSI = rsi14[rsi14.length - 1];
      const currentATR = atr14[atr14.length - 1];
      const currentADX = adx[adx.length - 1];
      const currentPlusDI = plusDI[plusDI.length - 1];
      const currentMinusDI = minusDI[minusDI.length - 1];

      // AITRADEX1 Logic
      let direction: 'LONG' | 'SHORT' | null = null;
      let score = 0;

      // LONG conditions
      if (
        currentPrice > currentEMA21 &&           // Price above EMA21
        currentEMA21 > currentEMA200 &&          // EMA21 above EMA200 (uptrend)
        currentRSI < 70 && currentRSI > 30 &&    // RSI not overbought/oversold
        currentADX > 25 &&                       // Strong trend
        currentPlusDI > currentMinusDI &&        // Bullish momentum
        volumeRatio > 1.2                        // Above average volume
      ) {
        direction = 'LONG';
        score = this.calculateSignalScore({
          trendAlignment: (currentEMA21 - currentEMA200) / currentEMA200 * 100,
          momentum: currentRSI,
          volatility: currentATR / currentPrice * 100,
          volume: volumeRatio,
          adx: currentADX,
          diDiff: currentPlusDI - currentMinusDI
        });
      }
      // SHORT conditions
      else if (
        currentPrice < currentEMA21 &&           // Price below EMA21
        currentEMA21 < currentEMA200 &&          // EMA21 below EMA200 (downtrend)
        currentRSI > 30 && currentRSI < 70 &&    // RSI not oversold/overbought
        currentADX > 25 &&                       // Strong trend
        currentMinusDI > currentPlusDI &&        // Bearish momentum
        volumeRatio > 1.2                        // Above average volume
      ) {
        direction = 'SHORT';
        score = this.calculateSignalScore({
          trendAlignment: (currentEMA200 - currentEMA21) / currentEMA200 * 100,
          momentum: 100 - currentRSI,
          volatility: currentATR / currentPrice * 100,
          volume: volumeRatio,
          adx: currentADX,
          diDiff: currentMinusDI - currentPlusDI
        });
      }

      if (!direction || score < 70) return null;

      // Calculate stop loss and take profit
      const atrMultiplier = timeframe === '5m' ? 1.5 : timeframe === '15m' ? 2 : 2.5;
      const stopLoss = direction === 'LONG' 
        ? currentPrice - (currentATR * atrMultiplier)
        : currentPrice + (currentATR * atrMultiplier);

      const riskReward = 2; // 1:2 risk/reward ratio
      const riskAmount = Math.abs(currentPrice - stopLoss);
      const takeProfit = direction === 'LONG'
        ? currentPrice + (riskAmount * riskReward)
        : currentPrice - (riskAmount * riskReward);

      return {
        symbol,
        direction,
        entry_price: currentPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        timeframe,
        score: Math.round(score * 10) / 10,
        confidence: Math.round(score * 10) / 10,
        algo: 'AITRADEX1',
        exchange,
        indicators: {
          ema21: currentEMA21,
          ema200: currentEMA200,
          rsi_14: currentRSI,
          adx: currentADX,
          plus_di: currentPlusDI,
          minus_di: currentMinusDI,
          volume_ratio: volumeRatio,
          atr_14: currentATR
        },
        metadata: {
          candles_count: candles.length,
          generated_at: new Date().toISOString(),
          algorithm_version: '1.0'
        }
      };

    } catch (error) {
      console.error(`❌ [AITRADEX1] Error applying logic for ${symbol}:`, error);
      return null;
    }
  }

  private calculateSignalScore(factors: {
    trendAlignment: number;
    momentum: number;
    volatility: number;
    volume: number;
    adx: number;
    diDiff: number;
  }): number {
    // Weighted scoring system
    let score = 0;

    // Trend alignment (30% weight)
    score += Math.min(Math.abs(factors.trendAlignment) * 3, 30);

    // Momentum (25% weight)
    const momentumScore = factors.momentum > 50 ? (100 - factors.momentum) : factors.momentum;
    score += (momentumScore / 100) * 25;

    // ADX strength (20% weight)
    score += Math.min(factors.adx / 50 * 20, 20);

    // Volume confirmation (15% weight)
    score += Math.min(factors.volume * 7.5, 15);

    // DI difference (10% weight)
    score += Math.min(factors.diDiff * 2, 10);

    return Math.min(score, 95); // Cap at 95%
  }

  // Technical indicator calculations
  private calculateEMA(data: number[], period: number): number[] {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    ema[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      ema[i] = data[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }
    
    return ema;
  }

  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  private calculateRSI(data: number[], period: number): number[] {
    const rsi = [];
    const gains = [];
    const losses = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    return rsi;
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const trs = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }

    const atr = [];
    for (let i = period - 1; i < trs.length; i++) {
      const avgTR = trs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      atr.push(avgTR);
    }

    return atr;
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const { plusDI, minusDI } = this.calculateDI(highs, lows, closes, period);
    const adx = [];

    for (let i = 0; i < plusDI.length; i++) {
      const dx = Math.abs(plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i]) * 100;
      adx.push(dx);
    }

    // Smooth ADX with EMA
    return this.calculateEMA(adx, period);
  }

  private calculateDI(highs: number[], lows: number[], closes: number[], period: number): { plusDI: number[], minusDI: number[] } {
    const plusDMs = [];
    const minusDMs = [];
    const trs = [];

    for (let i = 1; i < highs.length; i++) {
      const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? Math.max(highs[i] - highs[i - 1], 0) : 0;
      const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? Math.max(lows[i - 1] - lows[i], 0) : 0;
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      
      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
      trs.push(tr);
    }

    const plusDI = [];
    const minusDI = [];

    for (let i = period - 1; i < plusDMs.length; i++) {
      const smoothedPlusDM = plusDMs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      const smoothedMinusDM = minusDMs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      const smoothedTR = trs.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;

      plusDI.push(smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0);
      minusDI.push(smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0);
    }

    return { plusDI, minusDI };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      exchanges: this.exchanges.map(e => e.id),
      symbols: this.symbols,
      updateInterval: this.UPDATE_INTERVAL
    };
  }
}

// Singleton instance
export const liveCCXTFeed = new LiveCCXTFeed();