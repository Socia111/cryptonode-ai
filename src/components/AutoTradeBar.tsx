import * as React from 'react';
import { useAutoTradeStore } from '@/store/autoTradeStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export function AutoTradeBar() {
  const { toast } = useToast();
  const { enabled, amountUSD, leverage, setEnabled, setAmountUSD, setLeverage } = useAutoTradeStore();

  // slider supports decimals via step
  const onAmountSlide = (v: number[]) => setAmountUSD(v[0]);
  const onLevSlide = (v: number[]) => setLeverage(v[0]);

  const minAmt = 0.10;
  const maxAmt = 100;

  const toggleAuto = () => {
    const next = !enabled;
    setEnabled(next);
    toast({
      title: next ? 'Auto Trading ON' : 'Auto Trading OFF',
      description: next
        ? `All pages will trade new A+/A signals with $${amountUSD.toFixed(2)} @ ${leverage}x`
        : 'Automatic execution paused',
    });
    // Light-weight page broadcast (for any components listening)
    window.dispatchEvent(new CustomEvent('autotrade:toggle', { detail: { enabled: next } }));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur border-t">
      <div className="mx-auto max-w-5xl px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Amount */}
        <div className="w-full sm:w-[44%]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">Amount (USD)</span>
            <span className="opacity-70">${amountUSD.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={minAmt}
              max={maxAmt}
              step="0.01"
              value={amountUSD}
              onChange={(e) => setAmountUSD(parseFloat(e.target.value))}
              className="h-9 w-28 rounded-md border px-2 text-sm"
            />
            <Slider
              value={[amountUSD]}
              min={minAmt}
              max={maxAmt}
              step={0.01}
              onValueChange={onAmountSlide}
              className="flex-1"
            />
          </div>
        </div>

        {/* Leverage */}
        <div className="w-full sm:w-[44%]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">Leverage</span>
            <span className="opacity-70">{leverage}x</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={100}
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value || '1', 10))}
              className="h-9 w-20 rounded-md border px-2 text-sm"
            />
            <Slider
              value={[leverage]}
              min={1}
              max={100}
              step={1}
              onValueChange={onLevSlide}
              className="flex-1"
            />
          </div>
        </div>

        {/* Auto toggle */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={toggleAuto} />
            <span className="text-sm">{enabled ? 'Auto: ON (A+/A only)' : 'Auto: OFF'}</span>
          </div>
          <Button
            variant={enabled ? 'destructive' : 'default'}
            onClick={toggleAuto}
            className={enabled ? '' : 'bg-green-600 hover:bg-green-700'}
          >
            {enabled ? 'Pause Auto' : 'Start Auto'}
          </Button>
        </div>
      </div>
    </div>
  );
}