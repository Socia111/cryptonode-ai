import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Play, Clock, Target, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthGuardedButton } from '@/components/AuthGuardedButton';
import { TradingGateway } from '@/lib/tradingGateway';
import { toast } from '@/hooks/use-toast';

interface Signal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  sl: number;
  tp: number;
  score: number;
  timeframe: string;
  created_at: string;
}

interface LiveSignalsPanelProps {
  onExecuteTrade: (signal: Signal) => Promise<void>;
}

const LiveSignalsPanel = ({ onExecuteTrade }: LiveSignalsPanelProps) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingSignals, setExecutingSignals] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLiveSignals();
    const interval = setInterval(fetchLiveSignals, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLiveSignals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('signals-api', {
        body: { path: '/signals/live' }
      });

      if (error) throw error;

      if (data.success && data.items) {
        // Convert the API format to our Signal interface
        const formattedSignals: Signal[] = data.items
          .filter((item: any) => item.score >= 75 && item.timeframe !== '5m') // Only high-confidence signals, exclude 5m
          .slice(0, 10) // Limit to 10 most recent
          .map((item: any) => ({
            id: String(item.id),
            symbol: item.symbol,
            direction: item.direction === 'SHORT' ? 'SHORT' : 'LONG',
            entry_price: item.price,
            sl: item.sl || item.stop_loss || 0,
            tp: item.tp || item.take_profit || 0,
            score: item.score,
            timeframe: item.timeframe,
            created_at: item.created_at
          }));
        
        setSignals(formattedSignals);
      }
    } catch (error) {
      console.error('Failed to fetch live signals:', error);
    }
  };

  const handleExecuteTrade = async (signal: Signal) => {
    setExecutingSignals(prev => new Set(prev).add(signal.id));
    try {
      await onExecuteTrade(signal);
    } finally {
      setExecutingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signal.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const signalTime = new Date(dateString);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const calculateRiskReward = (signal: Signal) => {
    const riskDistance = Math.abs(signal.entry_price - signal.sl);
    const rewardDistance = Math.abs(signal.tp - signal.entry_price);
    return rewardDistance / riskDistance;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Live Trading Signals</h3>
          <Badge variant="secondary" className="text-xs">
            {signals.length} signals
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveSignals}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No live signals available</p>
          <p className="text-xs">Signals appear when confidence ≥ 75%</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {signals.map((signal) => (
            <Card key={signal.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{signal.symbol}</h4>
                      <Badge 
                        variant={signal.direction === 'LONG' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {signal.direction === 'LONG' ? (
                          <><TrendingUp className="h-3 w-3 mr-1" /> LONG</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 mr-1" /> SHORT</>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {signal.timeframe}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(signal.created_at)} • Score: {signal.score.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Entry</p>
                        <p className="font-medium">${signal.entry_price.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" /> SL
                        </p>
                        <p className="font-medium text-red-600">${signal.sl.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> TP
                        </p>
                        <p className="font-medium text-green-600">${signal.tp.toFixed(4)}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      R:R {calculateRiskReward(signal).toFixed(2)}
                    </div>
                  </div>

                  <AuthGuardedButton
                    size="sm"
                    onClick={async () => {
                      try {
                        setExecutingSignals(prev => new Set(prev).add(signal.id));
                        const res = await TradingGateway.execute({
                          symbol: signal.symbol,
                          side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
                          amountUSD: 25
                        });
                        
                        if (res.ok) {
                          toast({
                            title: "✅ Trade Executed",
                            description: `${signal.symbol} ${signal.direction} trade placed successfully`,
                            variant: "default",
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
                          title: "❌ Trade Error",
                          description: error.message || 'Failed to execute trade',
                          variant: "destructive",
                        });
                      } finally {
                        setExecutingSignals(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(signal.id);
                          return newSet;
                        });
                      }
                    }}
                    disabled={executingSignals.has(signal.id)}
                    className="min-w-[80px]"
                  >
                    {executingSignals.has(signal.id) ? (
                      "Executing..."
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Execute
                      </>
                    )}
                  </AuthGuardedButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-500" />
          Manual Trading Safety
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Position size calculated based on your risk settings</li>
          <li>• Automatic stop-loss and take-profit orders</li>
          <li>• Only signals with 75%+ confidence shown</li>
          <li>• Real-time execution with market orders</li>
        </ul>
      </div>
    </div>
  );
};

export default LiveSignalsPanel;