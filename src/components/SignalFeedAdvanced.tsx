import React from 'react';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { TopPicks } from '@/components/TopPicks';
import { SignalRow } from '@/components/SignalRow';
import { TradeControls } from '@/components/TradeControls';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { isAutoTradeable } from '@/lib/signalQuality';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import type { UISignal } from '@/lib/signalScoring';

type AlgorithmType = 'advanced' | 'confluence' | 'enhanced' | 'original';

interface AlgorithmConfig {
  name: string;
  description: string;
  defaultMinDepth: number;
  defaultMaxSpread: number;
  defaultMinRR: number;
  trendWeight: number;
  momentumWeight: number;
  volatilityWeight: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ALGORITHM_CONFIGS: Record<AlgorithmType, AlgorithmConfig> = {
  advanced: {
    name: 'AItradeX1 Advanced',
    description: 'Trend + momentum + volatility with adaptive AI weighting',
    defaultMinDepth: 1500,
    defaultMaxSpread: 12,
    defaultMinRR: 2.2,
    trendWeight: 0.4,
    momentumWeight: 0.35,
    volatilityWeight: 0.25,
    icon: TrendingUp,
    color: 'blue'
  },
  confluence: {
    name: 'AItradeX1 Confluence',
    description: 'Multi-indicator confluence with EMA stack + ADX/DMI + Stochastic',
    defaultMinDepth: 2000,
    defaultMaxSpread: 10,
    defaultMinRR: 2.5,
    trendWeight: 0.5,
    momentumWeight: 0.3,
    volatilityWeight: 0.2,
    icon: Activity,
    color: 'purple'
  },
  enhanced: {
    name: 'AItradeX2 Enhanced',
    description: 'Next-gen system with live feeds and comprehensive analysis',
    defaultMinDepth: 1000,
    defaultMaxSpread: 15,
    defaultMinRR: 2.0,
    trendWeight: 0.35,
    momentumWeight: 0.4,
    volatilityWeight: 0.25,
    icon: Zap,
    color: 'green'
  },
  original: {
    name: 'AItradeX1 Original',
    description: 'Pure canonical algorithm with exact 8-factor scoring',
    defaultMinDepth: 1200,
    defaultMaxSpread: 15,
    defaultMinRR: 1.8,
    trendWeight: 0.375, // 3/8 factors
    momentumWeight: 0.25, // 2/8 factors
    volatilityWeight: 0.375, // 3/8 factors
    icon: Activity,
    color: 'orange'
  }
};

interface SignalFeedAdvancedProps {
  signals: UISignal[];
  algorithm: AlgorithmType;
  title?: string;
}

export function SignalFeedAdvanced({ signals, algorithm, title }: SignalFeedAdvancedProps) {
  const { toast } = useToast();
  const config = ALGORITHM_CONFIGS[algorithm];
  const Icon = config.icon;
  
  const [hideWide, setHideWide] = React.useState(true);
  const [minDepth, setMinDepth] = React.useState(config.defaultMinDepth);
  const [maxSpread, setMaxSpread] = React.useState(config.defaultMaxSpread);
  const [minRR, setMinRR] = React.useState(config.defaultMinRR);
  const [useEnhanced, setUseEnhanced] = React.useState(true);
  const [autoMode, setAutoMode] = React.useState(false);
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<UISignal & { _score: number; _grade: any } | null>(null);
  
  // Algorithm-specific enhanced gate options
  const enhancedGateOptions = React.useMemo(() => ({
    maxSpreadBps: maxSpread,
    minDepth,
    minRR,
    // Algorithm-specific adjustments
    excludeInnovationZone: algorithm === 'confluence' || algorithm === 'original', // Stricter for confluence/original
    ban1m: algorithm !== 'enhanced', // Enhanced allows 1m for scalping
  }), [maxSpread, minDepth, minRR, algorithm]);
  
  const ranked = useRankedSignals(signals, { 
    hideWideSpreads: hideWide, 
    maxSpreadBps: maxSpread, 
    hide1MinSignals: algorithm !== 'enhanced', // Enhanced allows 1m
    useEnhancedScoring: useEnhanced,
    minDepth,
    minRR,
    enhancedGateOptions
  });
  
  const topPicks = ranked.slice(0, 3);

  // Algorithm-specific auto-trading logic
  React.useEffect(() => {
    if (!autoMode) return;
    
    const tradableSignals = ranked.filter(s => {
      if (useEnhanced) {
        // Apply algorithm-specific additional filters
        const baseCheck = isAutoTradeable(s as any);
        if (!baseCheck) return false;
        
        // Algorithm-specific enhancements
        switch (algorithm) {
          case 'confluence':
            // Confluence requires even higher standards
            return s._score >= 0.85 && (s.rr || s.risk_reward_ratio || 0) >= 2.5;
          case 'original':
            // Original follows canonical 8-factor scoring
            return s._score >= 0.8 && (s.rr || s.risk_reward_ratio || 0) >= 1.8;
          case 'enhanced':
            // Enhanced is more flexible but requires good momentum
            const volumeStrength = (s as any).volume_strength || 1;
            return s._score >= 0.75 && volumeStrength >= 1.2;
          case 'advanced':
          default:
            return baseCheck;
        }
      }
      return false;
    });
    
    const pick = tradableSignals[0];
    if (!pick || executingId) return;

    setSelected(pick);
  }, [ranked, autoMode, executingId, useEnhanced, algorithm]);

  const execute = async (sig: any, p: { amountUSD: number; leverage: number }) => {
    try {
      setExecutingId(sig.id);
      const side = sig.direction === 'BUY' ? 'Buy' : sig.direction === 'SELL' ? 'Sell' : sig.direction;
      
      const res = await TradingGateway.execute({
        symbol: sig.token.replace('/', ''),
        side,
        amountUSD: p.amountUSD,
        leverage: p.leverage,
        uiEntry: sig.entry_price,
        uiTP: sig.take_profit,
        uiSL: sig.stop_loss,
      });
      
      if (res.ok) {
        toast({ 
          title: `✅ ${config.name} Trade Executed`, 
          description: `${sig.token} ${sig.direction} (${p.leverage}x)` 
        });
        setSelected(null);
      } else {
        toast({ 
          title: '❌ Trade Failed', 
          description: res.message ?? 'Unknown error', 
          variant: 'destructive' 
        });
      }
    } catch (e: any) {
      toast({ 
        title: '❌ Trade Error', 
        description: e?.message ?? 'Failed', 
        variant: 'destructive' 
      });
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon className={`w-6 h-6 text-${config.color}-500`} />
          <span>{title || config.name} Signals</span>
          <Badge variant="outline" className={`bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}>
            Enhanced Quality
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enhanced Filter Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-70">Sort: <b>⭐ {config.name} Quality</b></div>
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
          
          {/* Algorithm-specific filters */}
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
                step={1}
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
                max={35}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">{minRR.toFixed(1)}:1</div>
            </div>
          </div>
        </div>

        {/* Auto Pilot Status Banner */}
        {autoMode && (
          <div className={`rounded-lg bg-gradient-to-r from-${config.color}-50 to-${config.color}-100 dark:from-${config.color}-950 dark:to-${config.color}-900 border border-${config.color}-200 dark:border-${config.color}-800 p-3`}>
            <div className={`flex items-center gap-2 text-sm font-medium text-${config.color}-800 dark:text-${config.color}-200`}>
              <Icon className={`w-4 h-4 text-${config.color}-600`} />
              {config.name} Auto Pilot Active
            </div>
            <div className={`text-xs text-${config.color}-700 dark:text-${config.color}-300 mt-1`}>
              Algorithm-optimized filtering • Max {maxSpread} bps spread • Min {minRR}:1 R:R • Min ${minDepth.toLocaleString()} depth
            </div>
            <div className={`text-xs text-${config.color}-600 dark:text-${config.color}-400 mt-1`}>
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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {ranked.map(s => (
            <SignalRow key={s.id} signal={s as any} onTrade={(sig) => setSelected(sig)} />
          ))}
          {ranked.length === 0 && (
            <div className="text-sm opacity-70 text-center py-8">
              No {config.name.toLowerCase()} signals found (check filters)
            </div>
          )}
        </div>

        {/* Algorithm Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold">{ranked.length}</div>
            <div className="text-xs text-muted-foreground">Quality Signals</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {ranked.filter(s => s._grade === 'A+' || s._grade === 'A').length}
            </div>
            <div className="text-xs text-muted-foreground">A+/A Grade</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {ranked.length > 0 ? ((ranked.filter(s => s._score >= 0.8).length / ranked.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">High Confidence</div>
          </div>
        </div>

        {/* Trade Modal */}
        {selected && (
          <div className="fixed inset-x-0 bottom-0 z-40">
            <div className="mx-auto max-w-md rounded-t-xl border bg-background p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{config.name} Trade • {selected.token}</div>
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
      </CardContent>
    </Card>
  );
}

export default SignalFeedAdvanced;