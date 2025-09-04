import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Star, RefreshCw, Zap, Target, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SpynxScore {
  token_symbol: string;
  token_name: string;
  score: number;
  market_cap: number;
  volume_24h: number;
  price_change_24h: number;
  liquidity: number;
  holder_count: number;
  whale_activity: number;
  sentiment: number;
  roi_forecast: number;
  price: number;
  metadata: any;
  updated_at: string;
}

interface SpynxSignal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence_score: number;
  pms_score: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: string;
  timeframe: string;
  created_at: string;
}

const SpynxScoresDashboard = () => {
  const [scores, setScores] = useState<SpynxScore[]>([]);
  const [signals, setSignals] = useState<SpynxSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSpynxData = async () => {
    try {
      // Fetch Spynx Scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('spynx_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

      if (scoresError) throw scoresError;

      // Fetch recent Spynx signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .contains('metadata', { spynx_engine: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (signalsError) throw signalsError;

      setScores(scoresData || []);
      setSignals(signalsData || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching Spynx data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Spynx data",
        variant: "destructive",
      });
    }
  };

  const updateSpynxScores = async () => {
    setLoading(true);
    try {
      toast({
        title: "🔄 Updating Spynx Scores™",
        description: "Calculating comprehensive market analysis...",
      });

      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores');
      
      if (error) throw error;

      await fetchSpynxData();
      
      toast({
        title: "✅ Spynx Scores Updated",
        description: `Updated ${data?.updated || 0} token scores and generated ${data?.market_summary?.high_scores || 0} high-quality scores`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update Spynx scores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSpynxSignals = async () => {
    setLoading(true);
    try {
      toast({
        title: "🎯 Generating Spynx Signals",
        description: "Running technical analysis engine...",
      });

      const topSymbols = scores.slice(0, 10).map(s => s.token_symbol + 'USDT');
      
      const { data, error } = await supabase.functions.invoke('spynx-scores-engine', {
        body: {
          symbols: topSymbols,
          timeframes: ['5m', '15m', '1h'],
          exchange: 'bybit'
        }
      });
      
      if (error) throw error;

      await fetchSpynxData();
      
      toast({
        title: "⚡ Signals Generated",
        description: `Generated ${data?.signals_generated || 0} new Spynx signals`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate signals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpynxData();
    const interval = setInterval(fetchSpynxData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    return 'C';
  };

  const formatPrice = (price: number) => {
    if (price > 1) return `$${price.toFixed(2)}`;
    if (price > 0.001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap > 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap > 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap > 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
    return `$${marketCap.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Star className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Spynx Scores™ Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  AI-powered crypto analysis with Price Momentum Scoring (PMS)
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generateSpynxSignals}
                disabled={loading || scores.length === 0}
              >
                <Zap className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                Generate Signals
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={updateSpynxScores}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Update Scores
              </Button>
            </div>
          </CardTitle>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdate}
            </p>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spynx Scores */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-primary" />
                <span>Top Spynx Scores™</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && scores.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Calculating Spynx Scores...</p>
                </div>
              ) : scores.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No Spynx Scores available</p>
                  <Button onClick={updateSpynxScores} className="mt-4">
                    Calculate Scores
                  </Button>
                </div>
              ) : (
                scores.map((token, index) => (
                  <div 
                    key={token.token_symbol}
                    className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-full text-sm font-bold text-primary">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold trading-mono">{token.token_symbol}</h3>
                          <span className="text-sm text-muted-foreground">{token.token_name}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>MC: {formatMarketCap(token.market_cap)}</span>
                          <span>Price: {formatPrice(token.price)}</span>
                          <span className={token.price_change_24h >= 0 ? 'text-success' : 'text-destructive'}>
                            {token.price_change_24h >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            {Math.abs(token.price_change_24h).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${getScoreColor(token.score)}`}
                        >
                          {getScoreBadge(token.score)}
                        </Badge>
                        <div>
                          <div className={`text-2xl font-bold trading-mono ${getScoreColor(token.score)}`}>
                            {token.score}
                          </div>
                          <Progress value={token.score} className="w-16 h-1 mt-1" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ROI: {token.roi_forecast.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spynx Signals */}
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-primary" />
                <span>Live Spynx Signals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {signals.length === 0 ? (
                <div className="text-center py-6">
                  <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No signals generated</p>
                  <Button 
                    size="sm" 
                    onClick={generateSpynxSignals}
                    disabled={loading || scores.length === 0}
                    className="mt-2"
                  >
                    Generate Signals
                  </Button>
                </div>
              ) : (
                signals.map((signal, index) => (
                  <div 
                    key={`${signal.symbol}-${index}`}
                    className="p-3 bg-card/30 rounded-lg border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold trading-mono text-sm">
                          {signal.symbol.replace('USDT', '')}
                        </span>
                        <Badge 
                          variant={signal.direction === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {signal.direction}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {signal.timeframe}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="ml-1 font-mono">${signal.entry_price.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="ml-1 font-bold">{signal.confidence_score.toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SL:</span>
                        <span className="ml-1 font-mono text-destructive">${signal.stop_loss.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TP:</span>
                        <span className="ml-1 font-mono text-success">${signal.take_profit.toFixed(4)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          signal.signal_strength === 'STRONG' ? 'text-success' : 
                          signal.signal_strength === 'MEDIUM' ? 'text-warning' : 'text-muted-foreground'
                        }`}
                      >
                        {signal.signal_strength}
                      </Badge>
                      <div className="text-xs">
                        <span className="text-muted-foreground">PMS:</span>
                        <span className="ml-1 font-bold">{(signal.pms_score || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Algorithm Explanation */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>How Spynx Scores™ Work</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">EMA Analysis</h4>
              <p className="text-muted-foreground">
                Detects Golden Cross (bullish) and Death Cross (bearish) patterns using 21, 50, and 200 EMAs
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-warning">ADX/DMI Strength</h4>
              <p className="text-muted-foreground">
                Measures trend strength and direction using ADX with +DI/-DI indicators
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-success">Stochastic</h4>
              <p className="text-muted-foreground">
                Identifies oversold bounces (&lt;20) and overbought reversals (&gt;80)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-accent">Volume</h4>
              <p className="text-muted-foreground">
                Confirms breakouts with above-average volume (2x+ 21-period average)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-destructive">HVP</h4>
              <p className="text-muted-foreground">
                Historical Volatility Percentile for volatility spike detection (&gt;75%)
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/10 rounded-lg">
            <h4 className="font-semibold mb-2">Price Momentum Score (PMS) Formula:</h4>
            <code className="text-sm bg-background/50 p-2 rounded block">
              PMS = α(EMA) + β(ADX) + γ(Stochastic) + δ(Volume) + ε(HVP)
            </code>
            <div className="mt-2 text-xs text-muted-foreground">
              <strong>Signal Thresholds:</strong> BUY &gt; +0.5 | SELL &lt; -0.5 | HOLD -0.5 to +0.5
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpynxScoresDashboard;