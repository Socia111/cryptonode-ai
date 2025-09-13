import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

export function GlobalTradeBar() {
  const [amountUSD, setAmountUSD] = React.useState(() => +(localStorage.getItem('autotrade.amount') || '5'));
  const [leverage, setLeverage]   = React.useState(() => +(localStorage.getItem('autotrade.lev') || '5'));
  const [enabled, setEnabled]     = React.useState(() => JSON.parse(localStorage.getItem('autotrade.enabled') || 'false'));

  React.useEffect(() => {
    localStorage.setItem('autotrade.amount', String(amountUSD));
    localStorage.setItem('autotrade.lev', String(leverage));
    localStorage.setItem('autotrade.enabled', JSON.stringify(enabled));
    window.dispatchEvent(new CustomEvent('autotrade:settings', { detail: { amountUSD, leverage, enabled }}));
  }, [amountUSD, leverage, enabled]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe">
      <div className="mx-auto max-w-5xl px-3 py-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-xs mb-1 text-muted-foreground">Amount (USD): <span className="font-semibold text-foreground">${amountUSD.toFixed(2)}</span></div>
          <Slider min={0.1} max={100} step={0.1} value={[amountUSD]} onValueChange={v => setAmountUSD(+v[0].toFixed(2))}/>
        </div>
        <div>
          <div className="text-xs mb-1 text-muted-foreground">Leverage: <span className="font-semibold text-foreground">{leverage}x</span></div>
          <Slider min={1} max={100} step={1} value={[leverage]} onValueChange={v => setLeverage(v[0])}/>
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button variant={enabled ? 'default' : 'outline'} onClick={() => setEnabled(!enabled)} size="sm">
            {enabled ? '⏸️ Auto: ON (A+/A)' : '🚀 Start Auto'}
          </Button>
        </div>
      </div>
    </div>
  );
}