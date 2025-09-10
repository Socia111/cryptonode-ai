import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Clock, RefreshCw, Activity, Zap, Target, Shield } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { FEATURES } from '@/config/featureFlags';

const CleanSignalsList = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [executingSignals, setExecutingSignals] = useState<Set<string>>(new Set());

  // Filter for high-confidence signals only (80%+)
  const filteredSignals = useMemo(() => {
    if (!signals) return [];
    return signals
      .filter(signal => {
        const confidence = signal.confidence_score || 0;
        return confidence >= 80; // Only show 80%+ confidence signals as requested
      })
      .slice(0, 8); // Limit to 8 signals max for clean UI
  }, [signals]);

  const executeOrder = async (signal: any) => {
    if (!FEATURES.AUTOTRADE_ENABLED) {
      toast({
        title: "Trading disabled",
        description: "Auto-trading is disabled in this build.",
        variant: "default",
      });
      return;
    }

    setExecutingSignals(prev => new Set(prev).add(signal.id));
    
    try {
      const side = signal.direction;
      const res = await TradingGateway.execute({ 
        symbol: signal.token, 
        side, 
        notionalUSD: 25 // Fixed $25 per trade for clean UI
      });
      
      if (res.ok) {
        toast({
          title: "✅ Trade Executed",
          description: `${signal.token} ${signal.direction} order placed`,
        });
      } else {
        toast({
          title: "❌ Trade Failed",
          description: res.message || 'Failed to execute trade',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Execution Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecutingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signal.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  const calculateRR = (signal: any) => {
    if (!signal.entry_price || !signal.stop_loss || !signal.exit_target) return 0;
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.exit_target - signal.entry_price);
    return reward / risk;
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Live Signals</span>
            <Badge variant="outline" className="text-xs">
              {filteredSignals.length} active
            </Badge>
          </div>
          <Button
            onClick={generateSignals}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Scan
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Scanning markets...</p>
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No high-confidence signals</p>
            <p className="text-xs">Waiting for 80%+ confidence signals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSignals.map((signal) => {
              const isLong = signal.direction === 'BUY';
              const isExecuting = executingSignals.has(signal.id);
              const confidence = signal.confidence_score || 0;
              const riskReward = calculateRR(signal);
              
              return (
                <div
                  key={signal.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* Left - Signal Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {isLong ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-semibold">{signal.token}</span>
                        </div>
                        <Badge 
                          variant={isLong ? "default" : "destructive"} 
                          className="text-xs"
                        >
                          {signal.direction}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {signal.timeframe}
                        </Badge>
                      </div>
                      
                      {/* Price levels in a clean grid */}
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">Entry</p>
                          <p className="font-medium">${signal.entry_price?.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> SL
                          </p>
                          <p className="font-medium text-red-600">${signal.stop_loss?.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" /> TP
                          </p>
                          <p className="font-medium text-green-600">${signal.exit_target?.toFixed(4)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Metrics & Action */}
                    <div className="flex items-center gap-4 ml-6">
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-semibold text-primary">{confidence.toFixed(0)}%</p>
                        <p className="text-muted-foreground mt-1">R:R</p>
                        <p className="font-medium">{riskReward.toFixed(1)}</p>
                      </div>
                      
                      <div className="text-center">
                        <Button
                          size="sm"
                          variant={isLong ? "default" : "destructive"}
                          onClick={() => executeOrder(signal)}
                          disabled={isExecuting || !FEATURES.AUTOTRADE_ENABLED}
                          className="min-w-[80px]"
                        >
                          {isExecuting ? 'Executing...' : 'Execute'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(signal.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Status indicator */}
        {FEATURES.AUTOTRADE_ENABLED && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 font-medium">
              ✅ Live Trading Active - Real orders on Bybit
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CleanSignalsList;