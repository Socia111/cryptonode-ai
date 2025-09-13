import * as React from 'react';
import { useAutoTradeStore } from '@/store/autoTradeStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

export function GlobalTradeBar() {
  const { toast } = useToast();
  const location = useLocation();
  const { enabled, amountUSD, leverage, setEnabled, setAmountUSD, setLeverage } = useAutoTradeStore();

  // Only show on signals pages
  const isSignalsPage = ['/x', '/x1', '/x2', '/signals', '/aitradex1original'].includes(location.pathname.toLowerCase());
  
  if (!isSignalsPage) return null;

  const onAmountSlide = (v: number[]) => setAmountUSD(v[0]);
  const onLevSlide = (v: number[]) => setLeverage(v[0]);

  const minAmt = 0.10;
  const maxAmt = 100;

  const toggleAuto = () => {
    const next = !enabled;
    setEnabled(next);
    toast({
      title: next ? '🚀 Auto Trading ON' : '⏸️ Auto Trading OFF',
      description: next
        ? `All signals pages will auto-trade A+/A signals with $${amountUSD.toFixed(2)} @ ${leverage}x`
        : 'Automatic execution paused on all pages',
    });
    
    // Broadcast to other components
    window.dispatchEvent(new CustomEvent('autotrade:toggle', { detail: { enabled: next } }));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Amount Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-muted-foreground">Amount (USD)</span>
            <Badge variant="outline" className="text-xs">
              ${amountUSD.toFixed(2)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={minAmt}
              max={maxAmt}
              step="0.01"
              value={amountUSD}
              onChange={(e) => setAmountUSD(parseFloat(e.target.value))}
              className="h-8 w-24 rounded border px-2 text-xs"
              placeholder="Amount"
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

        {/* Leverage Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-muted-foreground">Leverage</span>
            <Badge variant="outline" className="text-xs">
              {leverage}x
            </Badge>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={100}
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value || '1', 10))}
              className="h-8 w-16 rounded border px-2 text-xs"
              placeholder="Lev"
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

        {/* Auto Trading Toggle */}
        <div className="flex items-center gap-3 sm:min-w-0">
          <div className="flex items-center gap-2">
            <Switch 
              checked={enabled} 
              onCheckedChange={toggleAuto}
              className="data-[state=checked]:bg-green-600"
            />
            <span className="text-xs font-medium whitespace-nowrap">
              {enabled ? (
                <span className="text-green-600">Auto: ON (A+/A)</span>
              ) : (
                <span className="text-muted-foreground">Auto: OFF</span>
              )}
            </span>
          </div>
          
          <Button
            size="sm"
            variant={enabled ? 'destructive' : 'default'}
            onClick={toggleAuto}
            className={`text-xs whitespace-nowrap ${
              enabled ? '' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {enabled ? '⏸️ Pause' : '🚀 Start Auto'}
          </Button>
        </div>
      </div>
      
      {/* Status Indicator */}
      {enabled && (
        <div className="border-t bg-green-50/50 dark:bg-green-950/20 px-4 py-1">
          <div className="text-center text-xs text-green-700 dark:text-green-300">
            🎯 Auto-trading active across all signals pages • A+/A grades only • ${amountUSD.toFixed(2)} @ {leverage}x
          </div>
        </div>
      )}
    </div>
  );
}