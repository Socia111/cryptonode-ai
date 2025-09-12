import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';

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
  onExecute: (p: { amountUSD: number; leverage: number }) => Promise<void>|void;
  isExecuting?: boolean;
}) {

  const { toast } = useToast();
  const [amountUSD, setAmountUSD] = React.useState<number>(25); // min $10 default to $25
  const [lev, setLev] = React.useState<number>(5);

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
    if (belowMin) {
      toast({ title: 'Amount too low', description: `Minimum is $${minNotional}`, variant: 'destructive' });
      return;
    }
    await onExecute({ amountUSD: Math.max(amountUSD, minNotional), leverage: lev });
  };

  const quicks = [10, 25, 50, 100, 250, 500];

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
            min={10}
            step="1"
            value={amountUSD}
            onChange={(e) => setAmountUSD(Math.max(10, Number(e.target.value)))}
            className="flex-1 h-9 rounded-md border px-2 text-sm"
          />
          <div className="flex gap-1">
            {quicks.map(v => (
              <Button key={v} variant="outline" size="sm" onClick={() => setAmountUSD(v)}>${v}</Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted p-2 text-xs">
        Leverage: <b>{lev}x</b> • Est. Notional: <b>${notional.toFixed(2)}</b>
        {markPrice && qty !== undefined && (
          <> • Est. Qty: <b>{qty.toFixed(6)}</b> {symbol.replace('USDT','')}</>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium">Leverage</label>
          <span className="text-xs">{lev}x</span>
        </div>
        <Slider
          value={[lev]}
          min={1}
          max={100}
          step={1}
          onValueChange={(v) => setLev(Math.min(100, Math.max(1, v[0])))}
        />
        <div className="flex justify-between text-[10px] opacity-70 mt-1">
          <span>1x</span><span>25x</span><span>50x</span><span>75x</span><span>100x</span>
        </div>
      </div>

      <Button disabled={isExecuting} onClick={go} className={side === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
        {isExecuting ? 'Executing…' : `${side === 'Buy' ? 'Buy / Long' : 'Sell / Short'} ${symbol}`}
      </Button>
    </div>
  );
}