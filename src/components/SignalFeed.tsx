import React from 'react';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { TopPicks } from '@/components/TopPicks';
import { SignalRow } from '@/components/SignalRow';
import { TradeControls } from '@/components/TradeControls';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import type { UISignal } from '@/lib/signalScoring';

// Props: provide raw signals array
export function SignalFeed({ signals }: { signals: UISignal[] }) {
  const { toast } = useToast();
  const [hideWide, setHideWide] = React.useState(true);
  const ranked = useRankedSignals(signals, { hideWideSpreads: hideWide, maxSpreadBps: 20 });
  const topPicks = ranked.slice(0,3);

  // Auto mode: trades only A+/A
  const [autoMode, setAutoMode] = React.useState(false);
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<UISignal & { _score: number; _grade: any } | null>(null);

  // Auto-exec on new A+/A signals (no backend change; uses TradingGateway)
  React.useEffect(() => {
    if (!autoMode) return;
    const top = ranked.filter(s => s._grade === 'A+' || s._grade === 'A');
    // Take first 1–2 that are not being executed (super conservative)
    const pick = top[0];
    if (!pick || executingId) return;

    // open trade modal for confirmation OR fire direct small order:
    setSelected(pick);
  }, [ranked, autoMode, executingId]);

  const execute = async (sig: any, p: { amountUSD: number; leverage: number }) => {
    try {
      setExecutingId(sig.id);
      // Normalize direction for TradingGateway
      const side = sig.direction === 'BUY' ? 'Buy' : sig.direction === 'SELL' ? 'Sell' : sig.direction;
      const res = await TradingGateway.execute({
        symbol: sig.token,
        side,
        amountUSD: p.amountUSD,
        leverage: p.leverage,
      });
      if (res.ok) {
        toast({ title: '✅ Trade Executed', description: `${sig.token} ${sig.direction} (${p.leverage}x)` });
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
        </div>
      </div>

      {/* Top Picks */}
      <TopPicks
        items={topPicks as any}
        onClick={(id) => {
          const s = ranked.find(r => r.id === id);
          if (s) setSelected(s as any);
        }}
      />

      {/* Feed */}
      <div className="space-y-2">
        {ranked.map(s => (
          <SignalRow key={s.id} signal={s as any} onTrade={(sig) => setSelected(sig)} />
        ))}
        {ranked.length === 0 && (
          <div className="text-sm opacity-70 text-center py-8">No signals (check filters)</div>
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