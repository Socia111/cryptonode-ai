import React from 'react';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { useSignals } from '@/hooks/useSignals';
import { useWhitelistSettings } from '@/hooks/useWhitelistSettings';
import { TopPicks } from '@/components/TopPicks';
import { SignalRow } from '@/components/SignalRow';
import { EnhancedSignalCard } from '@/components/EnhancedSignalCard';
import { useLiveSignalFeed } from '@/hooks/useLiveSignalFeed';
import { TradeControls } from '@/components/TradeControls';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TradingGateway } from '@/lib/tradingGateway';
import type { UISignal } from '@/lib/signalScoring';

// Load signals directly using useSignals hook for consistency
export function SignalFeed({ signals: initialSignals }: { signals?: UISignal[] }) {
  const { toast } = useToast();
  const { signals: hookSignals, loading } = useSignals();
  const { getSymbolsForScanning } = useWhitelistSettings();
  const { 
    signals: liveSignals, 
    loading: liveLoading, 
    newSignalsCount, 
    refreshSignals,
    markSignalsAsRead 
  } = useLiveSignalFeed();
  const [hideWide, setHideWide] = React.useState(true);
  
  // Get allowed symbols from whitelist (8 selected symbols)
  const allowedSymbols = getSymbolsForScanning();
  
  // Combine all signal sources and ensure UISignal compatibility
  const combinedSignals = [
    ...liveSignals.map(s => ({ ...s, token: s.symbol, direction: s.side })),
    ...hookSignals,
    ...(initialSignals || [])
  ];
  
  // Filter signals to only show selected 8 symbols
  const filteredSignals = allowedSymbols 
    ? combinedSignals.filter(signal => {
        const symbolToCheck = signal.token || (signal as any).symbol;
        return allowedSymbols.includes(symbolToCheck);
      })
    : combinedSignals;
  
  const ranked = useRankedSignals(filteredSignals as UISignal[], { hideWideSpreads: hideWide, maxSpreadBps: 20, hide1MinSignals: true });
  const topPicks = ranked.slice(0,3);

  // Auto mode: trades only A+/A
  const [autoMode, setAutoMode] = React.useState(false);
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<UISignal & { _score: number; _grade: any } | null>(null);

  // Set up real-time subscription for new signals
  React.useEffect(() => {
    const channel = supabase
      .channel('signal-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal in feed:', payload.new);
          if (payload.new) { // Show all signals regardless of score
            // Check if it's a real signal using correct source names
            const isRealSignal = payload.new.source === 'aitradex1_real_enhanced' ||
                                payload.new.source === 'real_market_data' ||
                                payload.new.source === 'enhanced_signal_generation' ||
                                payload.new.source === 'live_market_data' ||
                                payload.new.source === 'complete_algorithm_live' ||
                                payload.new.source === 'technical_indicators_real' ||
                                (payload.new.source && 
                                 payload.new.source !== 'demo' && 
                                 payload.new.source !== 'mock' && 
                                 payload.new.source !== 'system' &&
                                 !payload.new.source.includes('mock') &&
                                 !payload.new.source.includes('demo'));
            
            if (payload.new.score >= 0) { // Show all signals
              // Show toast notification for ALL signals above 70%
              toast({
                title: "📈 New Trading Signal",
                description: `${payload.new.symbol} ${payload.new.direction} - Score: ${payload.new.score}%`,
                duration: 4000,
              });
              
              console.log('New signal added to feed:', payload.new.symbol, payload.new.source);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // =================== PROFIT-OPTIMIZED AUTO-TRADING ===================
  // Auto-exec on ONLY A+/A signals with additional quality filters
  React.useEffect(() => {
    if (!autoMode) return;
    
    const profitableSignals = ranked.filter(s => {
      // Grade filter: Only A+ and A grades
      const isHighGrade = s._grade === 'A+' || s._grade === 'A';
      
      // Timeframe filter: Exclude 1-minute signals (too noisy)
      const timeframe = s.timeframe?.toLowerCase() || '';
      const is1Min = timeframe.includes('1m') || timeframe.includes('1min');
      
      // Spread filter: Skip wide spreads that eat profit
      const spread = s.spread_bps || 0;
      const spreadOk = spread <= 20; // Max 20 bps spread
      
      // Risk:Reward filter: Only trade signals with good R:R
      const rr = s.rr || s.risk_reward_ratio || 0;
      const rrOk = rr >= 2.0; // Minimum 2:1 R:R
      
      // Score filter: Only trade high-confidence signals
      const score = s._score || 0;
      const scoreOk = score >= 0.8; // Minimum 80% composite score
      
      return isHighGrade && !is1Min && spreadOk && rrOk && scoreOk;
    });
    
    // Take first profitable signal that's not being executed (super conservative)
    const pick = profitableSignals[0];
    if (!pick || executingId) return;

    // Open trade modal for confirmation
    setSelected(pick);
  }, [ranked, autoMode, executingId]);

  const execute = async (sig: any, p: { amountUSD: number; leverage: number; orderType?: string; price?: number; timeInForce?: string }) => {
    try {
      setExecutingId(sig.id);
      
      // Basic risk guard check (UI-only safety)
      const { RiskPanel } = await import('@/lib/riskGuards');
      const riskCheck = await RiskPanel.check({
        maxDailyLossPct: 2,
        maxOpenPositions: 2,
        blockIf1m: sig.timeframe === '1m'
      });
      
      if (!riskCheck.ok) {
        toast({ 
          title: '🛡️ Risk Guard', 
          description: riskCheck.reason || 'Limits reached', 
          variant: 'destructive' 
        });
        return;
      }
      
      // Normalize direction for TradingGateway
      const side = sig.direction === 'BUY' ? 'Buy' : sig.direction === 'SELL' ? 'Sell' : sig.direction;
      const res = await TradingGateway.execute({
        symbol: sig.token,
        side,
        amountUSD: p.amountUSD,
        leverage: p.leverage,
        orderType: p.orderType as any,
        price: p.price,
        timeInForce: p.timeInForce as any,
      });
      if (res.ok) {
        // Enhanced success notification with SL/TP confirmation
        const result = res.data;
        const hasSlTp = result?.slOrder || result?.tpOrder || result?.stopLossOrder || result?.takeProfitOrder;
        
        toast({ 
          title: '✅ Trade Executed', 
          description: `${sig.token} ${sig.direction} (${p.leverage}x)${hasSlTp ? ' + SL/TP' : ' (No SL/TP)'}` 
        });
        
        // Additional notifications for risk management
        if (result?.slOrder || result?.stopLossOrder) {
          console.log('🛡️ Stop Loss attached:', result.slOrder || result.stopLossOrder);
        }
        if (result?.tpOrder || result?.takeProfitOrder) {
          console.log('🎯 Take Profit attached:', result.tpOrder || result.takeProfitOrder);
        }
        
        setSelected(null);
      } else {
        toast({ title: '❌ Trade Failed', description: res.message ?? 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: '❌ Trade Error', description: e?.message ?? 'Failed', variant: 'destructive' });
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">Sort: <b>⭐ Priority (score)</b></div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hideWide} onCheckedChange={setHideWide} />
            Hide spread &gt; 20 bps
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={autoMode} onCheckedChange={setAutoMode} />
            Auto (A+/A only)
          </label>
          <Button 
            onClick={refreshSignals} 
            variant="outline" 
            size="sm"
            className="h-8"
          >
            Refresh ({newSignalsCount > 0 ? newSignalsCount : 0})
          </Button>
          {newSignalsCount > 0 && (
            <Button 
              onClick={markSignalsAsRead} 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs"
            >
              Mark Read
            </Button>
          )}
        </div>
      </div>

      {/* Profit optimization banner */}
      {autoMode && (
        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            <span className="text-emerald-600">🎯</span>
            Profit-Optimized Auto Trading Active
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            Only A+/A signals • Max 20 bps spread • Min 2:1 R:R • Auto SL: -2% / TP: +4%
          </div>
        </div>
      )}

      {/* Top Picks */}
      <TopPicks
        items={topPicks as any}
        onClick={(id) => {
          const s = ranked.find(r => r.id === id);
          if (s) setSelected(s as any);
        }}
      />

      {/* Enhanced Signal Feed */}
      <div className="space-y-3">
        {ranked.map(s => (
          <EnhancedSignalCard 
            key={s.id} 
            signal={s as any} 
            onTrade={(sig) => {
              console.log('🚀 Signal trade clicked:', sig);
              setSelected(sig as any);
            }}
            onDetails={(signal) => console.log('View technical details for:', signal)}
          />
        ))}
        {ranked.length === 0 && (
          <div className="text-sm opacity-70 text-center py-8">
            {loading || liveLoading ? 'Loading signals...' : 'No signals (check filters)'}
          </div>
        )}
      </div>

      {/* Minimal trade drawer/modal substitute */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto max-w-md rounded-t-xl border bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Execute Trade • {selected.token}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div className="text-xs opacity-70 mb-3">
              {selected.direction} • score {(selected._score*100|0)}% • R:R {selected.rr ?? selected.risk_reward_ratio ?? '—'}
            </div>
            <TradeControls
              symbol={selected.token}
              side={selected.direction === 'BUY' ? 'Buy' : selected.direction === 'SELL' ? 'Sell' : selected.direction as 'Buy' | 'Sell'}
              markPrice={selected.entry_price}
              isExecuting={executingId === selected.id}
              onExecute={(p) => execute(selected, p)}
            />
          </div>
        </div>
      )}
    </div>
  );
}