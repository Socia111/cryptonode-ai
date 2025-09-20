import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SignalCard from './SignalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Activity } from 'lucide-react';

type SignalRow = {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  score: number;
  confidence: number | null;
  metadata: any;
  is_active: boolean;
  created_at: string;
};

export default function StrategySignalsTab() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [minConf, setMinConf] = useState<number>(70);
  const [maxTrades, setMaxTrades] = useState<number>(5);
  const [leverage, setLeverage] = useState<number>(10);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Fetch initial signals
  useEffect(() => {
    let mounted = true;
    
    const fetchSignals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .ilike('symbol', '%USDT')
        .gte('score', minConf)
        .order('score', { ascending: false })
        .limit(50);

      if (!mounted) return;
      if (!error && data) {
        setSignals(data as SignalRow[]);
        setLastUpdate(new Date());
        setIsLive(true);
      }
      setLoading(false);
    };

    fetchSignals();

    // Polling fallback every 5 seconds
    const interval = setInterval(fetchSignals, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [minConf]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('strategy-signals')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'signals',
          filter: `is_active=eq.true`
        },
        (payload) => {
          const signal = payload.new as SignalRow;
          if (!signal || !signal.symbol?.includes('USDT') || signal.score < minConf) return;
          
          setSignals(prev => {
            const existing = new Map(prev.map(s => [s.id, s]));
            existing.set(signal.id, signal);
            
            return Array.from(existing.values())
              .filter(s => s.is_active && s.score >= minConf)
              .sort((a, b) => b.score - a.score)
              .slice(0, maxTrades);
          });
          
          setLastUpdate(new Date());
          setIsLive(true);
          
          // Reset live indicator after 2 seconds
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [minConf, maxTrades]);

  const filteredSignals = useMemo(() => 
    signals
      .filter(s => s.is_active && s.score >= minConf)
      .slice(0, maxTrades),
    [signals, minConf, maxTrades]
  );

  const calculateRR = (signal: SignalRow) => {
    const { entry_price, stop_loss, take_profit, direction } = signal;
    if (!entry_price || !stop_loss || !take_profit) return null;
    
    if (direction === 'LONG') {
      const risk = entry_price - stop_loss;
      const reward = take_profit - entry_price;
      return risk > 0 ? reward / risk : null;
    } else {
      const risk = stop_loss - entry_price;
      const reward = entry_price - take_profit;
      return risk > 0 ? reward / risk : null;
    }
  };

  const handleExecuteSignal = (signal: SignalRow) => {
    // Dispatch custom event for order execution
    window.dispatchEvent(new CustomEvent('open-order-ticket', { 
      detail: { 
        ...signal, 
        leverage, 
        riskPercent 
      } 
    }));
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            Strategy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Min Confidence</label>
              <div className="space-y-1">
                <input
                  type="range"
                  value={minConf}
                  onChange={(e) => setMinConf(Number(e.target.value))}
                  className="w-full accent-primary"
                  min="50"
                  max="100"
                />
                <div className="text-center text-sm font-bold text-primary">{minConf}%</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Max Trades</label>
              <div className="space-y-1">
                <input
                  type="range"
                  value={maxTrades}
                  onChange={(e) => setMaxTrades(Number(e.target.value))}
                  className="w-full accent-primary"
                  min="1"
                  max="20"
                />
                <div className="text-center text-sm font-bold text-primary">{maxTrades}</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Leverage</label>
              <div className="space-y-1">
                <input
                  type="range"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full accent-primary"
                  min="1"
                  max="100"
                />
                <div className="text-center text-sm font-bold text-primary">{leverage}x</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Risk %</label>
              <div className="space-y-1">
                <input
                  type="range"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full accent-primary"
                  min="0.1"
                  max="10"
                  step="0.1"
                />
                <div className="text-center text-sm font-bold text-primary">{riskPercent}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-muted-foreground'}`}></div>
            <span className="font-bold text-foreground">
              {isLive ? 'LIVE DATA' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Active Signals:</span>
            <span className="font-bold text-lg text-primary">{filteredSignals.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity size={16} />
          Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Signals Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-muted-foreground">Loading signals...</p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="text-center py-16">
          <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-3">No Active Signals</h3>
          <p className="text-muted-foreground text-lg">
            Waiting for high-confidence trading opportunities...
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSignals.map(signal => (
            <SignalCard
              key={signal.id}
              symbol={signal.symbol}
              side={signal.direction === 'LONG' ? 'Buy' : 'Sell'}
              entry={signal.entry_price}
              sl={signal.stop_loss}
              tp={signal.take_profit}
              confidence={signal.score}
              rr={calculateRR(signal)}
              onExecute={() => handleExecuteSignal(signal)}
            />
          ))}
        </div>
      )}
    </div>
  );
}