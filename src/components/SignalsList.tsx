
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Clock, Target, Volume2, RefreshCw } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';

const SignalsList = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();

  const handleGenerateSignals = async () => {
    try {
      await generateSignals();
      toast({
        title: "Signals Generated",
        description: "New AI signals have been generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate signals",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Live Signals</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSignals}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Generate
            </Button>
            <Badge variant="secondary" className="pulse-glow bg-primary/20 text-primary">
              {signals.length} Active (5m-4h)
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Loading signals...</p>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No active signals</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGenerateSignals}
              className="mt-2"
            >
              Generate First Signals
            </Button>
          </div>
        ) : (
          signals.map((signal) => {
            const isBuy = signal.direction === 'BUY';
            const TrendIcon = isBuy ? TrendingUp : TrendingDown;

            return (
              <div 
                key={signal.id} 
                className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                  isBuy 
                    ? 'bg-success/10 border-success/20 hover:glow-success' 
                    : 'bg-destructive/10 border-destructive/20 hover:glow-danger'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isBuy ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                    }`}>
                      <TrendIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold trading-mono">{signal.token}</h4>
                      <p className="text-xs text-muted-foreground">{signal.signal_type}</p>
                    </div>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${isBuy ? 'border-success text-success' : 'border-destructive text-destructive'}`}
                  >
                    {signal.direction}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry Price</p>
                    <p className="font-semibold trading-mono">${signal.entry_price.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Confidence</p>
                    <p className="font-semibold trading-mono">{signal.confidence_score.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timeframe</p>
                    <p className="font-semibold trading-mono">{signal.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROI Target</p>
                    <p className="font-semibold trading-mono text-success">{signal.roi_projection}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="font-semibold trading-mono text-destructive">${signal.stop_loss?.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-semibold trading-mono text-success">${signal.exit_target?.toFixed(4)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(signal.created_at)}</span>
                    <span className="text-primary">{signal.trend_projection}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={isBuy ? "default" : "destructive"}
                    className="text-xs"
                  >
                    Execute Trade
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <Button variant="outline" className="w-full mt-4">
          View All Signals
        </Button>
      </CardContent>
    </Card>
  );
};

export default SignalsList;
