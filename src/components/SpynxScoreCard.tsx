import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Star, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { useSpynxScores } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SpynxScoreCard = () => {
  const { scores, loading, error, updateSpynxScores } = useSpynxScores();
  const { toast } = useToast();
  const [spynxSignals, setSpynxSignals] = React.useState([]);
  const [loadingSignals, setLoadingSignals] = React.useState(false);

  const fetchSpynxSignals = async () => {
    setLoadingSignals(true);
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .contains('metadata', { spynx_engine: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setSpynxSignals(data || []);
    } catch (error) {
      console.error('Error fetching Spynx signals:', error);
    } finally {
      setLoadingSignals(false);
    }
  };

  const generateSpynxSignals = async () => {
    if (scores.length === 0) {
      toast({
        title: "No Scores Available",
        description: "Please update Spynx scores first",
        variant: "destructive",
      });
      return;
    }

    setLoadingSignals(true);
    try {
      const topSymbols = scores.slice(0, 10).map(s => s.token_symbol + 'USDT');
      
      toast({
        title: "🎯 Generating Spynx Signals",
        description: "Running Price Momentum Score analysis...",
      });

      const { data, error } = await supabase.functions.invoke('spynx-scores-engine', {
        body: {
          symbols: topSymbols,
          timeframes: ['5m', '15m', '1h'],
          exchange: 'bybit'
        }
      });

      if (error) throw error;

      await fetchSpynxSignals();
      
      toast({
        title: "⚡ Spynx Signals Generated",
        description: `Generated ${data?.signals_generated || 0} technical analysis signals`,
      });
    } catch (error: any) {
      toast({
        title: "Signal Generation Failed",
        description: error.message || "Failed to generate Spynx signals",
        variant: "destructive",
      });
    } finally {
      setLoadingSignals(false);
    }
  };

  React.useEffect(() => {
    fetchSpynxSignals();
  }, []);

  const handleUpdateScores = async () => {
    try {
      await updateSpynxScores();
      await fetchSpynxSignals();
      toast({
        title: "✅ Spynx Scores™ Updated",
        description: "Comprehensive market analysis completed",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update Spynx scores",
        variant: "destructive",
      });
    }
  };

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
    return 'C';
  };

  const formatPrice = (price: number) => {
    if (price > 1) return `$${price.toFixed(2)}`;
    if (price > 0.001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-primary" />
            <span>Spynx Scores™</span>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={generateSpynxSignals}
              disabled={loadingSignals || scores.length === 0}
              className="text-xs"
            >
              <Zap className={`w-3 h-3 mr-1 ${loadingSignals ? 'animate-pulse' : ''}`} />
              PMS
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdateScores}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Update
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Calculating Spynx Scores...</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-6">
            <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No scores available</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleUpdateScores}
              className="mt-2"
            >
              Calculate Scores
            </Button>
          </div>
        ) : (
          <>
            {/* Top Spynx Scores */}
            <div className="text-xs font-semibold text-primary mb-2 flex items-center">
              <Star className="w-3 h-3 mr-1" />
              Top Spynx Scores™ (PMS Analysis)
            </div>
            {scores.slice(0, 6).map((token, index) => (
              <div 
                key={token.id || index}
                className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded-full text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold trading-mono text-sm">{token.token_symbol}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>MC: {token.market_cap ? `$${(token.market_cap / 1000000).toFixed(0)}M` : 'N/A'}</span>
                      <span className={token.price_change_24h >= 0 ? 'text-success' : 'text-destructive'}>
                        {token.price_change_24h >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                        {token.price_change_24h ? Math.abs(token.price_change_24h).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getScoreColor(token.score || 0)}`}
                    >
                      {getScoreBadge(token.score || 0)}
                    </Badge>
                    <span className={`font-bold trading-mono ${getScoreColor(token.score || 0)}`}>
                      {(token.score || 0).toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ROI: {token.roi_forecast ? token.roi_forecast.toFixed(1) : '0.0'}%
                  </p>
                </div>
              </div>
            ))}

            {/* Spynx Signals Section */}
            {spynxSignals.length > 0 && (
              <>
                <div className="border-t border-border/50 my-3"></div>
                <div className="text-xs font-semibold text-accent mb-2 flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  Live Spynx Signals (PMS Engine)
                </div>
                {spynxSignals.slice(0, 3).map((signal, index) => (
                  <div 
                    key={`${signal.symbol}-${index}`}
                    className="p-3 bg-accent/10 rounded-lg border border-accent/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold trading-mono text-sm">
                          {signal.symbol.replace('USDT', '')}
                        </span>
                        <Badge 
                          variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {signal.direction === 'LONG' ? 'BUY' : 'SELL'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {signal.timeframe}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="ml-1 font-mono">{formatPrice(signal.entry_price || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">PMS:</span>
                        <span className="ml-1 font-bold">{((signal.metadata?.pms_score || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="ml-1 font-bold">{(signal.score || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            className="flex-1 text-xs"
            onClick={() => {
              // Future implementation for full dashboard view
              console.log('View Full Dashboard clicked');
            }}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Full Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSpynxSignals}
            disabled={loadingSignals}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${loadingSignals ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
          Spynx Scores™ combine market cap, liquidity, sentiment & technical analysis
        </div>
      </CardContent>
    </Card>
  );
};

export default SpynxScoreCard;