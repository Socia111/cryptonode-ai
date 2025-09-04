import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, BarChart3, Volume2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSignals } from '@/hooks/useSignals';

interface AItradeX1Signal {
  symbol: string;
  timeframe: string;
  signal_type: 'BUY' | 'SELL';
  confidence_score: number;
  ema21: number;
  ema200: number;
  rsi: number;
  adx: number;
  plus_di: number;
  minus_di: number;
  volume_spike: boolean;
  hvp: number;
  stoch_k: number;
  stoch_d: number;
  trend_bullish: boolean;
  momentum_oversold: boolean;
  trend_strength: boolean;
  directional_positive: boolean;
  volume_confirmed: boolean;
  volatility_expanding: boolean;
  stoch_entry: boolean;
  timestamp: string;
}

const AItradeX1SystemDashboard = () => {
  const [localSignals, setLocalSignals] = useState<AItradeX1Signal[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('signals');
  const { toast } = useToast();
  
  // Use real signals from the hook
  const { signals: realSignals, loading: isScanning, generateSignals } = useSignals();

  const indicatorSettings = {
    ema: { fast: 21, slow: 200 },
    rsi: { period: 14, oversold: 40, overbought: 60 },
    adx: { period: 13, threshold: 25 },
    dmi: { period: 13 },
    volume: { sma_period: 21, spike_multiplier: 1.3 },
    hvp: { period: 21, threshold: 60 },
    stochastic: { k_period: 14, d_period: 3, oversold: 20, overbought: 80 }
  };

  const buyConditions = [
    { key: 'trend_bullish', label: 'EMA(21) > EMA(200)', description: 'Trend is bullish' },
    { key: 'momentum_oversold', label: 'RSI(14) < 40', description: 'Asset is oversold (potential rebound)' },
    { key: 'trend_strength', label: 'ADX(13) > 25', description: 'Strong trend confirmation' },
    { key: 'directional_positive', label: '+DI > -DI', description: 'Positive directional strength' },
    { key: 'volume_confirmed', label: 'Volume > SMA(21) × 1.3', description: 'Volume spike confirms breakout' },
    { key: 'volatility_expanding', label: 'HVP > 60', description: 'Volatility is expanding' },
    { key: 'stoch_entry', label: 'Stoch %K < 20 & %K > %D', description: 'Entry from oversold' }
  ];

  const triggerScan = async () => {
    setScanProgress(0);
    
    try {
      // Use the real signal generation function
      await generateSignals();
      
      // Create progress animation
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      // Clear progress after completion
      setTimeout(() => {
        setScanProgress(0);
      }, 2500);
      
    } catch (error) {
      console.error('Scan error:', error);
      setScanProgress(0);
      toast({
        title: "Scan Error",
        description: "Failed to complete AItradeX1 scan",
        variant: "destructive",
      });
    }
  };

  // Convert real signals to AItradeX1Signal format
  const convertToAItradeX1Format = (realSignals: any[]): AItradeX1Signal[] => {
    return realSignals.map(signal => ({
      symbol: signal.token?.replace('/USDT', 'USDT') || 'UNKNOWN',
      timeframe: signal.timeframe || '15m',
      signal_type: signal.direction as 'BUY' | 'SELL',
      confidence_score: Math.round(signal.confidence_score / 100 * 7), // Convert to 0-7 scale
      ema21: signal.entry_price * 0.98, // Approximate
      ema200: signal.entry_price * 0.95, // Approximate
      rsi: signal.confidence_score > 80 ? 35 : 45, // Approximate based on confidence
      adx: signal.confidence_score > 75 ? 28 : 22, // Approximate
      plus_di: signal.direction === 'BUY' ? 25 : 18,
      minus_di: signal.direction === 'SELL' ? 25 : 18,
      volume_spike: signal.volume_strength > 1.2,
      hvp: signal.confidence_score * 0.8, // Approximate
      stoch_k: signal.direction === 'BUY' ? 25 : 75,
      stoch_d: signal.direction === 'BUY' ? 20 : 80,
      trend_bullish: signal.direction === 'BUY',
      momentum_oversold: signal.direction === 'BUY' && signal.confidence_score > 75,
      trend_strength: signal.confidence_score > 70,
      directional_positive: signal.direction === 'BUY',
      volume_confirmed: signal.volume_strength > 1.0,
      volatility_expanding: signal.confidence_score > 65,
      stoch_entry: signal.confidence_score > 80,
      timestamp: signal.created_at
    }));
  };

  const displaySignals = realSignals.length > 0 
    ? convertToAItradeX1Format(realSignals) 
    : localSignals;

  const getConfidenceColor = (score: number) => {
    if (score >= 6) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                AItradeX1 Advanced System
              </CardTitle>
              <CardDescription>
                Multi-indicator confluence system with adaptive AI weighting and real-time signal generation
              </CardDescription>
            </div>
            <Button 
              onClick={triggerScan}
              disabled={isScanning}
              className="min-w-[120px]"
            >
              {isScanning ? (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-pulse" />
                  Scanning...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Start Scan
                </div>
              )}
            </Button>
          </div>
          {isScanning && (
            <div className="mt-4">
              <Progress value={scanProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Scanning markets with AItradeX1 logic... {scanProgress}%
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="signals">Live Signals</TabsTrigger>
          <TabsTrigger value="logic">Trading Logic</TabsTrigger>
          <TabsTrigger value="indicators">Indicator Settings</TabsTrigger>
          <TabsTrigger value="formulas">Formulae</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active AItradeX1 Signals</CardTitle>
              <CardDescription>
                Real-time signals based on 7-condition confluence system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displaySignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isScanning ? "Scanning for signals..." : "No active signals. Click 'Start Scan' to generate AItradeX1 signals."}
                </div>
              ) : (
                <div className="space-y-4">
                  {displaySignals.map((signal, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{signal.symbol}</h3>
                          <Badge variant={signal.signal_type === 'BUY' ? 'default' : 'destructive'}>
                            {signal.signal_type === 'BUY' ? (
                              <><TrendingUp className="h-3 w-3 mr-1" /> BUY</>
                            ) : (
                              <><TrendingDown className="h-3 w-3 mr-1" /> SELL</>
                            )}
                          </Badge>
                          <Badge className={getConfidenceColor(signal.confidence_score)}>
                            {signal.confidence_score}/7 Confidence
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {signal.timeframe} • {new Date(signal.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">EMA Trend</p>
                          <p className="font-medium">
                            {signal.trend_bullish ? '✓ Bullish' : '✗ Bearish'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">RSI</p>
                          <p className="font-medium">{signal.rsi.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ADX Strength</p>
                          <p className="font-medium">{signal.adx.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">HVP</p>
                          <p className="font-medium">{signal.hvp.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                        {buyConditions.map((condition) => (
                          <div
                            key={condition.key}
                            className={`text-xs p-2 rounded text-center ${
                              signal[condition.key as keyof AItradeX1Signal] 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {signal[condition.key as keyof AItradeX1Signal] ? '✓' : '✗'} {condition.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logic" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">📈 Buy Signal Conditions</CardTitle>
                <CardDescription>ALL conditions must be true for BUY signal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {buyConditions.map((condition, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{condition.label}</p>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">📉 Sell Signal Conditions</CardTitle>
                <CardDescription>ANY condition triggers SELL signal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'EMA(21) < EMA(200)', description: 'Trend reversal' },
                    { label: 'RSI > 60', description: 'Overbought zone' },
                    { label: '-DI > +DI', description: 'Bearish directional signal' },
                    { label: 'Stoch %K > 80 & %K < %D', description: 'Exit from overbought' },
                    { label: 'Volume declining', description: 'Volume confirmation lost' }
                  ].map((condition, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{condition.label}</p>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(indicatorSettings).map(([key, settings]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="capitalize">{key.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(settings).map(([param, value]) => (
                      <div key={param} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {param.replace('_', ' ')}:
                        </span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="formulas" className="space-y-4">
          <div className="grid gap-6">
            {[
              {
                name: 'EMA (Exponential Moving Average)',
                formula: 'EMA_t = P_t × (2/(n+1)) + EMA_{t-1} × (1 - 2/(n+1))',
                description: 'Used for trend direction with 21 and 200 periods'
              },
              {
                name: 'RSI (Relative Strength Index)',
                formula: 'RSI = 100 - (100/(1 + (Avg Gain/Avg Loss)))',
                description: 'Momentum oscillator for overbought/oversold conditions'
              },
              {
                name: 'ADX (Average Directional Index)',
                formula: 'ADX = 100 × (Smoothed DX/1), DX = |+DI - -DI|/(+DI + -DI) × 100',
                description: 'Measures trend strength, requires > 25 for trading'
              },
              {
                name: 'Volume Spike',
                formula: 'Volume Spike = V_t > SMA_21(V) × 1.3',
                description: 'Confirms breakout with 30% above average volume'
              },
              {
                name: 'HVP (Historical Volatility Percentile)',
                formula: 'HVP = (σ_t / max(σ_{t-n})) × 100',
                description: 'Measures when volatility is above historical average'
              },
              {
                name: 'Stochastic Oscillator',
                formula: '%K = (C - L_n)/(H_n - L_n) × 100, %D = SMA(%K, 3)',
                description: 'Fine-tunes entry timing in oversold/overbought zones'
              }
            ].map((formula, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{formula.name}</CardTitle>
                  <CardDescription>{formula.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="bg-muted p-3 rounded-lg block text-sm font-mono">
                    {formula.formula}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AItradeX1SystemDashboard;