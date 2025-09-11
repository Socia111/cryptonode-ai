import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Props = {
  symbol: string;             // e.g. "BTCUSDT"
  side: "Buy" | "Sell";       // from the signal row
  markPrice?: number;         // optional, to preview notional
  onExecute: (p: { amountUSD: number; leverage: number }) => Promise<void>;
  isExecuting?: boolean;
};

export const TradeControls: React.FC<Props> = ({ 
  symbol, 
  side, 
  markPrice, 
  onExecute, 
  isExecuting = false 
}) => {
  const { toast } = useToast();
  const [amountUSD, setAmountUSD] = React.useState<number>(25);  // default $25
  const [leverage, setLeverage] = React.useState<number>(5);     // default 5x

  // Persist between sessions (nice touch)
  React.useEffect(() => {
    const a = localStorage.getItem("trade.amountUSD");
    const l = localStorage.getItem("trade.leverage");
    if (a) setAmountUSD(Number(a));
    if (l) setLeverage(Math.min(100, Math.max(1, Number(l))));
  }, []);
  
  React.useEffect(() => {
    localStorage.setItem("trade.amountUSD", String(amountUSD));
    localStorage.setItem("trade.leverage", String(leverage));
  }, [amountUSD, leverage]);

  const minNotional = 5; // Bybit default floor for many USDT pairs; backend still enforces.
  const belowMin = amountUSD < minNotional;

  const positionNotional = amountUSD * leverage; // rough preview
  const qtyPreview = markPrice ? (positionNotional / markPrice) : undefined;

  const quicks = [5, 10, 25, 50, 100, 250];

  const handleExecute = async () => {
    if (amountUSD <= 0 || Number.isNaN(amountUSD)) {
      toast({ 
        title: "Amount required", 
        description: "Enter a valid USD amount.", 
        variant: "destructive" 
      });
      return;
    }
    if (leverage < 1 || leverage > 100) {
      toast({ 
        title: "Leverage out of range", 
        description: "Choose 1x–100x.", 
        variant: "destructive" 
      });
      return;
    }
    await onExecute({ amountUSD, leverage });
  };

  return (
    <div className="space-y-4">
      {/* Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Amount (USD)</span>
          {belowMin && <Badge variant="destructive">Min ${minNotional}</Badge>}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            step="1"
            inputMode="decimal"
            value={amountUSD}
            onChange={(e) => setAmountUSD(Number(e.target.value))}
            className="flex-1"
          />
          <div className="flex flex-wrap gap-1">
            {quicks.map(v => (
              <Button 
                key={v} 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={() => setAmountUSD(v)}
                className="px-2 text-xs"
              >
                ${v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Leverage: <span className="font-medium">{leverage}x</span> • Est. Notional: <span className="font-medium">${positionNotional.toFixed(2)}</span></div>
        {markPrice && qtyPreview !== undefined && (
          <div>Est. Qty: <span className="font-medium">{qtyPreview.toFixed(6)}</span> {symbol.replace("USDT","")}</div>
        )}
      </div>

      {/* Sticky bottom slider (mobile-friendly) */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 -mx-6 mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Leverage</span>
          <Badge variant="secondary">{leverage}x</Badge>
        </div>
        <div className="px-1">
          <Slider
            min={1}
            max={100}
            step={1}
            value={[leverage]}
            onValueChange={(v) => setLeverage(Math.min(100, Math.max(1, v[0])))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>1x</span><span>25x</span><span>50x</span><span>75x</span><span>100x</span>
          </div>
        </div>

        <Button 
          className="w-full mt-3" 
          onClick={handleExecute}
          disabled={isExecuting || belowMin}
        >
          {isExecuting ? (
            "Executing..."
          ) : (
            `${side === "Buy" ? "Buy / Long" : "Sell / Short"} ${symbol}`
          )}
        </Button>
      </div>
    </div>
  );
};