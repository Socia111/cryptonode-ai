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
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Strategy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="metric-label">Min Confidence</label>
              <input
                type="number"
                min={50}
                max={100}
                value={minConf}
                onChange={e => setMinConf(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
            <div>
              <label className="metric-label">Max Open Trades</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxTrades}
                onChange={e => setMaxTrades(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
            <div>
              <label className="metric-label">Leverage</label>
              <input
                type="number"
                min={1}
                max={100}
                value={leverage}
                onChange={e => setLeverage(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
            <div>
              <label className="metric-label">Risk %</label>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={riskPercent}
                onChange={e => setRiskPercent(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-md text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-foreground">Live Strategy Signals</h2>
          <Badge variant={filteredSignals.length > 0 ? "default" : "secondary"}>
            {filteredSignals.length} Active
          </Badge>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-success">LIVE</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity size={16} />
          {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : '—'}
        </div>
      </div>

      {/* Signals Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading signals...
          </div>
        </div>
      ) : filteredSignals.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">No signals available at current confidence level</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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