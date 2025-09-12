import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { BalanceChecker } from './BalanceChecker';

export function TradeControls({
  symbol,
  side,
  markPrice,
  onExecute,
  isExecuting = false,
}: {
  symbol: string;
  side: 'Buy'|'Sell';
  markPrice?: number;
  onExecute: (p: { amountUSD: number; leverage: number; scalpMode?: boolean }) => Promise<void>|void;
  isExecuting?: boolean;
}) {

  const { toast } = useToast();
  const [amountUSD, setAmountUSD] = React.useState<number>(5); // Smaller amounts for scalping
  const [lev, setLev] = React.useState<number>(10); // Default to 10x for scalping
  const [scalpMode, setScalpMode] = React.useState<boolean>(true); // Enable scalp mode by default

  React.useEffect(() => {
    const a = localStorage.getItem('trade.amountUSD');
    const l = localStorage.getItem('trade.leverage');
    if (a) setAmountUSD(Math.max(10, Number(a)));
    if (l) setLev(Math.min(100, Math.max(1, Number(l))));
  }, []);

  React.useEffect(() => {
    localStorage.setItem('trade.amountUSD', String(amountUSD));
    localStorage.setItem('trade.leverage', String(lev));
  }, [amountUSD, lev]);

  const minNotional = 10;
  const belowMin = amountUSD < minNotional;
  const notional = amountUSD * lev;
  const qty = markPrice ? notional / markPrice : undefined;

  const go = async () => {
    const minNotional = scalpMode ? 1 : 5;
    if (amountUSD < minNotional) {
      toast({ title: 'Amount too low', description: `Minimum is $${minNotional} for ${scalpMode ? 'scalping' : 'normal trading'}`, variant: 'destructive' });
      return;
    }
    await onExecute({ amountUSD: Math.max(amountUSD, minNotional), leverage: lev, scalpMode });
  };

  const quicks = scalpMode ? [1, 2, 5, 10, 20] : [10, 25, 50, 100, 250, 500]; // Smaller amounts for scalping

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Amount (USD)</label>
          {belowMin && <span className="text-xs text-destructive">Min $${minNotional}</span>}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={scalpMode ? 1 : 5}
            step="1"
            value={amountUSD}
            onChange={(e) => setAmountUSD(Math.max(scalpMode ? 1 : 5, Number(e.target.value)))}
            className="flex-1 h-9 rounded-md border px-2 text-sm"
          />
          <div className="flex gap-1">
            {quicks.map(v => (
              <Button key={v} variant="outline" size="sm" onClick={() => setAmountUSD(v)}>${v}</Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="scalpMode"
            checked={scalpMode}
            onChange={(e) => setScalpMode(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="scalpMode" className="text-xs font-medium">
            🎯 Scalp Mode (Micro TP/SL)
          </label>
        </div>
        
        <div className="rounded-md bg-muted p-2 text-xs space-y-1">
          <div>
            Leverage: <b>{lev}x</b> • Est. Notional: <b>${notional.toFixed(2)}</b>
            {markPrice && qty !== undefined && (
              <> • Est. Qty: <b>{qty.toFixed(6)}</b> {symbol.replace('USDT','')}</>
            )}
          </div>
          {markPrice && (
            <div className="text-[10px] opacity-80 border-t pt-1 mt-1">
              <div className="flex justify-between">
                <span>Entry: <b>${markPrice.toFixed(4)}</b></span>
                <span className="text-green-600">
                  TP: <b>${(markPrice * (side === 'Buy' ? (scalpMode ? 1.005 : 1.04) : (scalpMode ? 0.995 : 0.96))).toFixed(4)}</b> 
                  ({scalpMode ? '+0.5%' : '+4%'})
                </span>
                <span className="text-red-600">
                  SL: <b>${(markPrice * (side === 'Buy' ? (scalpMode ? 0.9985 : 0.98) : (scalpMode ? 1.0015 : 1.02))).toFixed(4)}</b> 
                  ({scalpMode ? '-0.15%' : '-2%'})
                </span>
              </div>
              <div className="text-center mt-1 text-emerald-600">
                <b>{scalpMode ? '🎯 Scalping: 3.3:1 R:R (0.5%:0.15%)' : 'Auto Risk Management: 2:1 R:R'}</b>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Leverage</label>
          <span className="text-xs">{lev}x</span>
        </div>
        <Slider
          value={[lev]}
          min={1}
          max={scalpMode ? 25 : 100}
          step={1}
          onValueChange={(v) => setLev(Math.min(scalpMode ? 25 : 100, Math.max(1, v[0])))}
        />
        <div className="flex justify-between text-[10px] opacity-70 mt-1">
          <span>1x</span>
          {scalpMode ? (
            <><span>10x</span><span>15x</span><span>20x</span><span>25x</span></>
          ) : (
            <><span>25x</span><span>50x</span><span>75x</span><span>100x</span></>
          )}
        </div>
      </div>
      
      <BalanceChecker />

      <Button disabled={isExecuting} onClick={go} className={side === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
        {isExecuting ? 'Executing…' : `${side === 'Buy' ? 'Buy / Long' : 'Sell / Short'} ${symbol}`}
      </Button>
    </div>
  );
}