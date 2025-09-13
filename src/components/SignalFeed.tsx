import React from 'react';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { TopPicks } from '@/components/TopPicks';
import { SignalRow } from '@/components/SignalRow';
import { TradeControls } from '@/components/TradeControls';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { isAutoTradeable } from '@/lib/signalQuality';
import type { UISignal } from '@/lib/signalScoring';

// Props: provide raw signals array
export function SignalFeed({ signals }: { signals: UISignal[] }) {
  const { toast } = useToast();
  const [hideWide, setHideWide] = React.useState(true);
  const [minDepth, setMinDepth] = React.useState(1000);
  const [maxSpread, setMaxSpread] = React.useState(15);
  const [minRR, setMinRR] = React.useState(1.8);
  const [useEnhanced, setUseEnhanced] = React.useState(true);
  
  const ranked = useRankedSignals(signals, { 
    hideWideSpreads: hideWide, 
    maxSpreadBps: maxSpread, 
    hide1MinSignals: true,
    useEnhancedScoring: useEnhanced,
    minDepth,
    minRR,
    enhancedGateOptions: {
      maxSpreadBps: maxSpread,
      minDepth,
      minRR
    }
  });
  const topPicks = ranked.slice(0,3);

  // Auto mode: trades only A+/A
  const [autoMode, setAutoMode] = React.useState(false);
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<UISignal & { _score: number; _grade: any } | null>(null);

  // =================== ENHANCED AUTO-TRADING ===================
  // Auto-exec on ONLY the highest quality signals using new scoring system
  React.useEffect(() => {
    if (!autoMode) return;
    
    // Use the enhanced auto-tradeable filter
    const tradableSignals = ranked.filter(s => {
      if (useEnhanced) {
        return isAutoTradeable(s as any);
      } else {
        // Legacy filtering for backwards compatibility
        const isHighGrade = s._grade === 'A+' || s._grade === 'A';
        const timeframe = s.timeframe?.toLowerCase() || '';
        const is1Min = timeframe.includes('1m') || timeframe.includes('1min');
        const spread = s.spread_bps || 0;
        const spreadOk = spread <= 15; // Tighter spread for auto
        const rr = s.rr || s.risk_reward_ratio || 0;
        const rrOk = rr >= 2.0;
        const score = s._score || 0;
        const scoreOk = score >= 0.8;
        return isHighGrade && !is1Min && spreadOk && rrOk && scoreOk;
      }
    });
    
    // Take first tradable signal that's not being executed
    const pick = tradableSignals[0];
    if (!pick || executingId) return;

    // Open trade modal for confirmation
    setSelected(pick);
  }, [ranked, autoMode, executingId, useEnhanced]);

  const execute = async (sig: any, p: { amountUSD: number; leverage: number }) => {
    try {
      setExecutingId(sig.id);
      // Normalize direction for TradingGateway
      const side = sig.direction === 'BUY' ? 'Buy' : sig.direction === 'SELL' ? 'Sell' : sig.direction;
      
      // Pass TP/SL values from the signal panel
      const res = await TradingGateway.execute({
        symbol: sig.token.replace('/', ''),  // Clean symbol format
        side,
        amountUSD: p.amountUSD,
        leverage: p.leverage,
        // Pass what the user SAW on the signal card
        uiEntry: sig.entry_price,
        uiTP: sig.take_profit,
        uiSL: sig.stop_loss,
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
      {/* Enhanced Filter Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-70">Sort: <b>⭐ Execution Quality</b></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={useEnhanced} onCheckedChange={setUseEnhanced} />
              Enhanced Scoring
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={autoMode} onCheckedChange={setAutoMode} />
              Auto Pilot
            </label>
          </div>
        </div>
        
        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <label className="text-xs font-medium">Min Book Depth (USDT)</label>
            <Slider
              value={[minDepth]}
              onValueChange={([value]) => setMinDepth(value)}
              min={500}
              max={5000}
              step={250}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">${minDepth.toLocaleString()}</div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium">Max Spread (bps)</label>
            <Slider
              value={[maxSpread]}
              onValueChange={([value]) => setMaxSpread(value)}
              min={5}
              max={30}
              step={5}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">{maxSpread} bps</div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium">Min R:R Ratio</label>
            <Slider
              value={[minRR * 10]}
              onValueChange={([value]) => setMinRR(value / 10)}
              min={15}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">{minRR.toFixed(1)}:1</div>
          </div>
        </div>
      </div>

      {/* Auto Pilot Status Banner */}
      {autoMode && (
        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border border-emerald-200 dark:border-emerald-800 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            <span className="text-emerald-600">🤖</span>
            {useEnhanced ? 'Enhanced Auto Pilot Active' : 'Legacy Auto Pilot Active'}
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            {useEnhanced 
              ? `Execution-optimized filtering • Max ${maxSpread} bps spread • Min ${minRR}:1 R:R • Min $${minDepth.toLocaleString()} depth`
              : 'Only A+/A signals • Max 20 bps spread • Min 2:1 R:R • Auto SL: -2% / TP: +4%'
            }
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {ranked.length} signals passed filters • {ranked.filter(s => useEnhanced ? isAutoTradeable(s as any) : s._grade === 'A+' || s._grade === 'A').length} auto-tradeable
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