import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield } from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number | null;
  take_profit_1: number | null;
  confidence_score: number;
  timeframe: string;
  created_at: string;
  source: string;
}

export function OneClickTrading() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingSignals, setExecutingSignals] = useState<Set<string>>(new Set());
  const { executeSignalTrade } = useTradingExecutor();
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestSignals();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('one-click-trading')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal for one-click trading:', payload.new);
          if (payload.new && payload.new.score >= 75) {
            const newSignal = payload.new as Signal;
            setSignals(prev => [newSignal, ...prev.slice(0, 9)]);
            
            toast({
              title: "🚨 New Trading Signal",
              description: `${newSignal.symbol} ${newSignal.direction} - ${newSignal.confidence_score}%`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchLatestSignals, 30000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 75)
        .in('source', ['aitradex1_real_enhanced', 'real_market_data', 'enhanced_signal_generation'])
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mappedSignals = (data || []).map(signal => ({
        id: signal.id.toString(),
        symbol: signal.symbol,
        direction: (signal.direction === 'BUY' || signal.direction === 'LONG') ? 'LONG' : 'SHORT' as 'LONG' | 'SHORT',
        entry_price: signal.entry_price || signal.price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        take_profit_1: signal.take_profit || null,
        confidence_score: signal.score,
        timeframe: signal.timeframe,
        created_at: signal.created_at,
        source: signal.source
      }));

      setSignals(mappedSignals);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeOneClickTrade = async (signal: Signal, amount: number = 50) => {
    setExecutingSignals(prev => new Set(prev).add(signal.id));
    
    try {
      console.log('🚀 One-click trade execution:', { signal, amount });
      
      await executeSignalTrade(signal, amount);
      
      toast({
        title: "✅ Trade Executed",
        description: `${signal.symbol} ${signal.direction} - $${amount} USDT`,
      });
      
    } catch (error) {
      console.error('One-click trade failed:', error);
      toast({
        title: "❌ Trade Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setExecutingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signal.id);
        return newSet;
      });
    }
  };

  const formatPrice = (price: number) => price?.toFixed(4) || '0.0000';
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

  const calculateRR = (signal: Signal) => {
    const tp = signal.take_profit_1 || signal.take_profit;
    if (!tp) return 0;
    
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(tp - signal.entry_price);
    return reward / risk;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          One-Click Trading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click any signal to execute a $50 trade instantly
        </p>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-medium">No high-confidence signals available</p>
              <p className="text-sm mt-1">Waiting for signals with 75%+ confidence...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <div key={signal.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{signal.symbol}</h4>
                        <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                          {signal.direction === 'LONG' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" /> LONG</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" /> SHORT</>
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {signal.confidence_score}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(signal.created_at)} • {signal.timeframe}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-medium">${formatPrice(signal.entry_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" /> SL
                          </p>
                          <p className="font-medium text-red-600">${formatPrice(signal.stop_loss)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3" /> TP
                          </p>
                          <p className="font-medium text-green-600">
                            ${formatPrice(signal.take_profit_1 || signal.take_profit || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        R:R {calculateRR(signal).toFixed(2)}:1
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => executeOneClickTrade(signal, 25)}
                        disabled={executingSignals.has(signal.id)}
                        variant="outline"
                        className="min-w-[60px]"
                      >
                        $25
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => executeOneClickTrade(signal, 50)}
                        disabled={executingSignals.has(signal.id)}
                        className="min-w-[60px] bg-primary hover:bg-primary/90"
                      >
                        {executingSignals.has(signal.id) ? "..." : "$50"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => executeOneClickTrade(signal, 100)}
                        disabled={executingSignals.has(signal.id)}
                        variant="outline"
                        className="min-w-[60px]"
                      >
                        $100
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          ⚠️ One-click trading uses real money. Trades execute immediately on Bybit.
        </div>
      </CardContent>
    </Card>
  );
}