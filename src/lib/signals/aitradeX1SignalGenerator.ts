import { 
  Candle, 
  calculateSMA, 
  calculateEMA, 
  calculateATR, 
  calculateADX, 
  calculateStochastic,
  detectVolumeSpike,
  calculateHVP
} from '../indicators/technicalIndicators';
import { BybitDataProvider } from '../dataProviders/bybitProvider';
import { FallbackDataProvider } from '../dataProviders/fallbackProvider';

export interface AItradeX1Signal {
  symbol: string;
  timeframe: string;
  signal_type: "LONG" | "SHORT" | "PRE_CROSS";
  algorithm: string;
  confidence: number;
  grade: string;
  tags: string[];
  context: string;
  timestamp: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  indicators: {
    sma250: number;
    ema21: number;
    atr: number;
    adx?: { ADX: number; plusDI: number; minusDI: number };
    stochastic?: { K: number; D: number };
    hvp?: number;
    volumeSpike: boolean;
  };
}

export class AItradeX1SignalGenerator {
  private bybitProvider: BybitDataProvider;
  private fallbackProvider: FallbackDataProvider;
  private cooldownMap: Map<string, Map<string, number>> = new Map(); // symbol -> signal_type -> timestamp
  private readonly COOLDOWN_HOURS = 6;

  constructor() {
    this.bybitProvider = new BybitDataProvider();
    this.fallbackProvider = new FallbackDataProvider();
  }

  /**
   * Generate AItradeX1 signal for a specific symbol and timeframe
   */
  async generateSignal(symbol: string, timeframe: string): Promise<AItradeX1Signal | null> {
    try {
      console.log(`[AItradeX1] Analyzing ${symbol} ${timeframe}`);

      // Step 1: Fetch sufficient candle data
      let candles = await this.fetchCandleData(symbol, timeframe);
      if (candles.length < 252) { // Need at least 252 for SMA(250) + buffer
        console.log(`[AItradeX1] Insufficient data for ${symbol}: ${candles.length} candles`);
        return null;
      }

      // Step 2: Calculate all required indicators
      const indicators = this.calculateIndicators(candles);
      if (!indicators.sma250 || !indicators.ema21) {
        console.log(`[AItradeX1] Missing core indicators for ${symbol}`);
        return null;
      }

      // Step 3: Detect crossover signals
      const crossoverSignal = this.detectCrossover(candles, indicators);
      if (!crossoverSignal) {
        return null;
      }

      // Step 4: Check confirmations
      const confirmations = this.checkConfirmations(candles, indicators);
      
      // Step 5: Apply signal rules
      const signalType = this.determineSignalType(crossoverSignal, confirmations);
      if (!signalType) {
        return null;
      }

      // Step 6: Check cooldown
      if (this.isOnCooldown(symbol, signalType)) {
        console.log(`[AItradeX1] ${symbol} ${signalType} signal on cooldown`);
        return null;
      }

      // Step 7: Calculate confidence and grade
      const { confidence, grade } = this.calculateConfidenceAndGrade(confirmations);

      // Step 8: Calculate price levels
      const priceLevels = this.calculatePriceLevels(candles, indicators, signalType);

      // Step 9: Build context and tags
      const { context, tags } = this.buildContextAndTags(crossoverSignal, confirmations, indicators);

      // Step 10: Record signal timestamp for cooldown
      this.recordSignalTimestamp(symbol, signalType);

      const signal: AItradeX1Signal = {
        symbol,
        timeframe,
        signal_type: signalType,
        algorithm: "AItradeX1",
        confidence,
        grade,
        tags,
        context,
        timestamp: Date.now(),
        entry_price: priceLevels.entry,
        stop_loss: priceLevels.stopLoss,
        take_profit: priceLevels.takeProfit,
        indicators: {
          sma250: indicators.sma250,
          ema21: indicators.ema21,
          atr: indicators.atr || 0,
          adx: indicators.adx,
          stochastic: indicators.stochastic,
          hvp: indicators.hvp,
          volumeSpike: indicators.volumeSpike
        }
      };

      console.log(`[AItradeX1] ✅ Generated ${signalType} signal for ${symbol} (confidence: ${confidence}%, grade: ${grade})`);
      return signal;

    } catch (error) {
      console.error(`[AItradeX1] Error generating signal for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch candle data with fallback
   */
  private async fetchCandleData(symbol: string, timeframe: string): Promise<Candle[]> {
    try {
      // Try Bybit first
      let candles = await this.bybitProvider.fetchHistoricalCandles(symbol, timeframe, 300);
      
      // If insufficient data, use fallback
      if (candles.length < 252) {
        console.log(`[AItradeX1] Using fallback data for ${symbol}`);
        const fallbackCandles = await this.fallbackProvider.fetchFallbackCandles(symbol, timeframe, 300);
        candles = this.fallbackProvider.mergeCandles(candles, fallbackCandles);
      }

      return candles;
    } catch (error) {
      console.error(`[AItradeX1] Data fetch error for ${symbol}:`, error);
      // Use fallback as last resort
      return await this.fallbackProvider.fetchFallbackCandles(symbol, timeframe, 300);
    }
  }

  /**
   * Calculate all technical indicators
   */
  private calculateIndicators(candles: Candle[]) {
    return {
      sma250: calculateSMA(candles, 250),
      ema21: calculateEMA(candles, 21),
      atr: calculateATR(candles, 14),
      adx: calculateADX(candles, 14),
      stochastic: calculateStochastic(candles, 14, 3),
      hvp: calculateHVP(candles, 21),
      volumeSpike: detectVolumeSpike(candles, 21, 1.5)
    };
  }

  /**
   * Detect EMA/SMA crossover
   */
  private detectCrossover(candles: Candle[], indicators: any): 'CROSS_UP' | 'CROSS_DOWN' | 'NEAR_CROSS' | null {
    const currentEMA = indicators.ema21;
    const currentSMA = indicators.sma250;
    
    // Calculate previous EMA/SMA
    const prevCandles = candles.slice(0, -1);
    const prevEMA = calculateEMA(prevCandles, 21);
    const prevSMA = calculateSMA(prevCandles, 250);
    
    if (!prevEMA || !prevSMA) return null;

    // Detect crossovers
    if (currentEMA > currentSMA && prevEMA <= prevSMA) {
      return 'CROSS_UP';
    } else if (currentEMA < currentSMA && prevEMA >= prevSMA) {
      return 'CROSS_DOWN';
    }

    // Check for near cross (within 1% of SMA)
    const distance = Math.abs(currentEMA - currentSMA) / currentSMA;
    if (distance < 0.01) {
      return 'NEAR_CROSS';
    }

    return null;
  }

  /**
   * Check confirmation conditions
   */
  private checkConfirmations(candles: Candle[], indicators: any): {
    adxTrend: boolean;
    stochasticMomentum: boolean;
    volumeConfirmation: boolean;
    risingATR: boolean;
    count: number;
  } {
    const confirmations = {
      adxTrend: false,
      stochasticMomentum: false,
      volumeConfirmation: false,
      risingATR: false,
      count: 0
    };

    // ADX trend confirmation
    if (indicators.adx && indicators.adx.ADX > 25) {
      confirmations.adxTrend = true;
      confirmations.count++;
    }

    // Stochastic momentum
    if (indicators.stochastic) {
      const { K, D } = indicators.stochastic;
      if ((K > D && K < 80) || (K < 20 && K > D)) {
        confirmations.stochasticMomentum = true;
        confirmations.count++;
      }
    }

    // Volume confirmation
    if (indicators.volumeSpike) {
      const lastCandle = candles[candles.length - 1];
      // Volume spike with price movement in signal direction
      if (lastCandle.close !== lastCandle.open) {
        confirmations.volumeConfirmation = true;
        confirmations.count++;
      }
    }

    // Rising ATR (volatility expansion)
    if (indicators.atr) {
      const prevCandles = candles.slice(0, -1);
      const prevATR = calculateATR(prevCandles, 14);
      if (prevATR && indicators.atr > prevATR) {
        confirmations.risingATR = true;
        confirmations.count++;
      }
    }

    return confirmations;
  }

  /**
   * Determine final signal type
   */
  private determineSignalType(crossover: string, confirmations: any): AItradeX1Signal["signal_type"] | null {
    // Require at least 2 confirmations for strong signals
    if (crossover === 'CROSS_UP' && confirmations.count >= 2) {
      return 'LONG';
    } else if (crossover === 'CROSS_DOWN' && confirmations.count >= 2) {
      return 'SHORT';
    } else if (crossover === 'NEAR_CROSS') {
      return 'PRE_CROSS';
    }
    
    return null;
  }

  /**
   * Calculate confidence score and grade
   */
  private calculateConfidenceAndGrade(confirmations: any): { confidence: number; grade: string } {
    let confidence = 70 + Math.max(0, (confirmations.count - 2)) * 5; // Base 70, +5 per extra confirmation
    confidence = Math.min(confidence, 95); // Cap at 95%

    let grade = "C";
    if (confidence >= 90) grade = "A+";
    else if (confidence >= 85) grade = "A";
    else if (confidence >= 80) grade = "B+";
    else if (confidence >= 75) grade = "B";

    return { confidence, grade };
  }

  /**
   * Calculate entry, stop loss, and take profit levels
   */
  private calculatePriceLevels(candles: Candle[], indicators: any, signalType: string): {
    entry: number;
    stopLoss: number;
    takeProfit: number;
  } {
    const lastCandle = candles[candles.length - 1];
    const entry = lastCandle.close;
    const atr = indicators.atr || (entry * 0.02); // Use 2% if ATR unavailable
    
    let stopLoss: number;
    let takeProfit: number;

    if (signalType === 'LONG') {
      stopLoss = entry - (atr * 2); // 2 ATR stop loss
      takeProfit = entry + (atr * 3); // 3 ATR take profit (1:1.5 R:R)
    } else if (signalType === 'SHORT') {
      stopLoss = entry + (atr * 2);
      takeProfit = entry - (atr * 3);
    } else { // PRE_CROSS
      stopLoss = entry - (atr * 1.5);
      takeProfit = entry + (atr * 2);
    }

    return {
      entry: Math.round(entry * 10000) / 10000,
      stopLoss: Math.round(stopLoss * 10000) / 10000,
      takeProfit: Math.round(takeProfit * 10000) / 10000
    };
  }

  /**
   * Build context description and tags
   */
  private buildContextAndTags(crossover: string, confirmations: any, indicators: any): {
    context: string;
    tags: string[];
  } {
    const tags: string[] = [];
    const contextParts: string[] = [];

    // Main signal
    if (crossover === 'CROSS_UP') {
      contextParts.push("EMA21 crossed above SMA250");
      tags.push("EMA_CROSS_UP");
    } else if (crossover === 'CROSS_DOWN') {
      contextParts.push("EMA21 crossed below SMA250");
      tags.push("EMA_CROSS_DOWN");
    } else if (crossover === 'NEAR_CROSS') {
      contextParts.push("EMA21 approaching SMA250");
      tags.push("PRE_CROSS");
    }

    // Confirmations
    if (confirmations.adxTrend && indicators.adx) {
      contextParts.push(`ADX=${indicators.adx.ADX.toFixed(1)} (+DI=${indicators.adx.plusDI.toFixed(1)}, -DI=${indicators.adx.minusDI.toFixed(1)})`);
      tags.push("ADX_TREND");
    }

    if (confirmations.stochasticMomentum && indicators.stochastic) {
      contextParts.push(`Stoch K=${indicators.stochastic.K.toFixed(1)}, D=${indicators.stochastic.D.toFixed(1)}`);
      tags.push("STOCH_MOMENTUM");
    }

    if (confirmations.volumeConfirmation) {
      contextParts.push("Volume spike detected");
      tags.push("VOLUME_SPIKE");
    }

    if (confirmations.risingATR) {
      contextParts.push("Rising volatility (ATR)");
      tags.push("RISING_ATR");
    }

    return {
      context: contextParts.join("; "),
      tags
    };
  }

  /**
   * Check if signal is on cooldown
   */
  private isOnCooldown(symbol: string, signalType: string): boolean {
    const symbolCooldowns = this.cooldownMap.get(symbol);
    if (!symbolCooldowns) return false;

    const lastSignalTime = symbolCooldowns.get(signalType);
    if (!lastSignalTime) return false;

    const cooldownMs = this.COOLDOWN_HOURS * 60 * 60 * 1000;
    return Date.now() - lastSignalTime < cooldownMs;
  }

  /**
   * Record signal timestamp for cooldown tracking
   */
  private recordSignalTimestamp(symbol: string, signalType: string): void {
    if (!this.cooldownMap.has(symbol)) {
      this.cooldownMap.set(symbol, new Map());
    }
    this.cooldownMap.get(symbol)!.set(signalType, Date.now());
  }

  /**
   * Batch generate signals for multiple symbols and timeframes
   */
  async generateBatchSignals(
    symbols: string[], 
    timeframes: string[]
  ): Promise<AItradeX1Signal[]> {
    const signals: AItradeX1Signal[] = [];
    const batchPromises: Promise<AItradeX1Signal | null>[] = [];

    // Create all signal generation promises
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        batchPromises.push(this.generateSignal(symbol, timeframe));
      }
    }

    console.log(`[AItradeX1] Processing ${batchPromises.length} symbol/timeframe combinations`);

    // Execute all in parallel with some batching to avoid overwhelming APIs
    const batchSize = 10;
    for (let i = 0; i < batchPromises.length; i += batchSize) {
      const batch = batchPromises.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          signals.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`[AItradeX1] Batch signal generation failed:`, result.reason);
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < batchPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[AItradeX1] Generated ${signals.length} signals from ${symbols.length} symbols across ${timeframes.length} timeframes`);
    return signals;
  }
}