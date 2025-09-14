import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { FEATURES } from '@/config/featureFlags';

export const MobileSignalsList = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [executedSignals, setExecutedSignals] = useState(new Set());

  const rankedSignals = useRankedSignals(signals, { 
    hideWideSpreads: true,
    hide1MinSignals: true 
  });

  const topPicksSignals = rankedSignals.slice(0, 3);

  const executeOrder = async (signal: any) => {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      toast({
        title: "Trade Execution Failed",
        description: "HTTP 400: ('success': false, 'error': 'Order placement failed: Bybit API error: API key is invalid.. Please check your account balance and try a smaller amount.')",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(signal.id);
    
    try {
      const res = await TradingGateway.execute({ 
        symbol: signal.token, 
        side: signal.direction, 
        amountUSD: 25
      });
      
      if (res.ok) {
        toast({
          title: "✅ Trade Executed",
          description: `${signal.token} ${signal.direction} order placed`,
        });
        setExecutedSignals(prev => new Set(prev).add(signal.id));
      } else {
        toast({
          title: "Trade Execution Failed",
          description: "HTTP 400: ('success': false, 'error': 'Order placement failed: Bybit API error: API key is invalid.. Please check your account balance and try a smaller amount.')",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Trade Execution Failed",
        description: "HTTP 400: ('success': false, 'error': 'Order placement failed: Bybit API error: API key is invalid.. Please check your account balance and try a smaller amount.')",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(null);
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
    <div className="space-y-1">
      {/* Header */}
      <div className="p-4 bg-card border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">⭐ Priority Signals (Score-Ranked)</h2>
          </div>
          <Button
            onClick={generateSignals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {rankedSignals.length} ranked
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Low spread only
          </Badge>
        </div>
      </div>

      {/* Top Picks Section */}
      {topPicksSignals.length > 0 && (
        <div className="p-4 bg-card border-b">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Top Picks</h3>
          <div className="grid grid-cols-3 gap-2">
            {topPicksSignals.map((signal) => {
              const isBuy = signal.direction === 'BUY';
              const isExecuted = executedSignals.has(signal.id);
              
              return (
                <div key={signal.id} className="p-2 rounded-lg border bg-muted/20">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-bold">{signal.token}</span>
                      <Badge 
                        variant={signal.grade === 'A+' ? 'default' : 'secondary'} 
                        className="text-xs h-4"
                      >
                        {signal.grade}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                        {signal.direction}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        score {Math.round(signal.score)}%
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={isBuy ? "default" : "destructive"}
                      className="w-full h-7 text-xs"
                      onClick={() => executeOrder(signal)}
                      disabled={isExecuting === signal.id || isExecuted}
                    >
                      {isExecuting === signal.id ? 'Executing...' : isExecuted ? '✓ Executed' : 'Execute Trade'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Signals List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Scanning markets...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankedSignals.slice(0, 12).map((signal, index) => {
              const isBuy = signal.direction === 'BUY';
              const isExecuted = executedSignals.has(signal.id);
              
              return (
                <Card key={signal.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{signal.token}</span>
                          <Badge variant={isBuy ? "default" : "destructive"} className="text-xs h-5">
                            {signal.direction}
                          </Badge>
                          <Badge 
                            variant={
                              signal.grade === 'A+' ? 'default' :
                              signal.grade === 'A' ? 'secondary' : 'outline'
                            }
                            className="text-xs h-5"
                          >
                            {signal.grade}
                          </Badge>
                          <Badge variant="outline" className="text-xs h-5">
                            {signal.timeframe}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          <div className="flex justify-between">
                            <span>Entry: ${signal.entry_price?.toFixed(4)}</span>
                            <span>Score: {Math.round(signal.score)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SL: ${signal.stop_loss?.toFixed(4)}</span>
                            <span>TP: ${signal.exit_target?.toFixed(4)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(signal.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="ml-3">
                        {isExecuted && (
                          <Badge variant="outline" className="text-xs text-success mb-2 block">
                            ✓ Executed
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={isBuy ? "default" : "destructive"}
                          className="text-xs h-8"
                          onClick={() => executeOrder(signal)}
                          disabled={isExecuting === signal.id || isExecuted}
                        >
                          {isExecuting === signal.id ? 'Executing...' : 'Execute Trade'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Message at Bottom */}
      <div className="p-4 bg-destructive/10 border-t border-destructive/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-destructive">Trade Execution Failed</div>
            <div className="text-xs text-muted-foreground mt-1">
              HTTP 400: {`{'success': false, 'error': 'Order placement failed: Bybit API error: API key is invalid.. Please check your account balance and try a smaller amount.'}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};