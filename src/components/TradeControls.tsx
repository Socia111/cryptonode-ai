import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { BalanceChecker } from './BalanceChecker';
import { tradingSettings } from '@/lib/tradingSettings';

export function TradeControls({
  symbol,
  side,
  markPrice,
  entryPrice,
  onExecute,
  isExecuting = false,
}: {
  symbol: string;
  side: 'Buy'|'Sell';
  markPrice?: number;
  entryPrice?: number;
  onExecute: (p: { amountUSD: number; leverage: number; scalpMode?: boolean; entryPrice?: number }) => Promise<void>|void;
  isExecuting?: boolean;
}) {

  const { toast } = useToast();
  const [amountUSD, setAmountUSD] = React.useState<number>(5);
  const [lev, setLev] = React.useState<number>(10);
  const [scalpMode, setScalpMode] = React.useState<boolean>(true);
  const [useLimit, setUseLimit] = React.useState<boolean>(false);
  const [globalSettings, setGlobalSettings] = React.useState(tradingSettings.getSettings());

  React.useEffect(() => {
    const a = localStorage.getItem('trade.amountUSD');
    const l = localStorage.getItem('trade.leverage');
    const s = localStorage.getItem('trade.scalpMode');
    const ul = localStorage.getItem('trade.useLimit');
    if (a) setAmountUSD(Math.max(1, Number(a)));
    if (l) setLev(Math.min(globalSettings.maxLeverage, Math.max(1, Number(l))));
    if (s) setScalpMode(s === 'true');
    if (ul) setUseLimit(ul === 'true');
    
    // Subscribe to global settings changes
    const unsubscribe = tradingSettings.subscribe(setGlobalSettings);
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    localStorage.setItem('trade.amountUSD', String(amountUSD));
    localStorage.setItem('trade.leverage', String(lev));
    localStorage.setItem('trade.scalpMode', String(scalpMode));
    localStorage.setItem('trade.useLimit', String(useLimit));
  }, [amountUSD, lev, scalpMode, useLimit]);

  const minNotional = scalpMode ? 1 : 5;
  const belowMin = amountUSD < minNotional;
  const notional = amountUSD * lev;
  const displayPrice = entryPrice || markPrice;
  const qty = displayPrice ? notional / displayPrice : undefined;
  
  // Calculate TP/SL using global settings
  const riskPrices = React.useMemo(() => {
    if (!displayPrice) return null;
    return tradingSettings.calculateRiskPrices(displayPrice, side);
  }, [displayPrice, side, globalSettings]);

  const go = async () => {
    const minNotional = scalpMode ? 1 : 5;
    if (amountUSD < minNotional) {
      toast({ title: 'Amount too low', description: `Minimum is $${minNotional} for ${scalpMode ? 'scalping' : 'normal trading'}`, variant: 'destructive' });
      return;
    }
    
    // Use signal entry price for limit orders
    const tradeParams = { 
      amountUSD: Math.max(amountUSD, minNotional), 
      leverage: lev, 
      scalpMode,
      orderType: useLimit ? 'Limit' : 'Market',
      price: useLimit ? (entryPrice || markPrice) : undefined,
      timeInForce: useLimit ? 'PostOnly' : 'ImmediateOrCancel',
      entryPrice: entryPrice || markPrice
    };
    
    await onExecute(tradeParams);
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
        <div className="flex items-center gap-4">
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
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useLimit"
              checked={useLimit}
              onChange={(e) => setUseLimit(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useLimit" className="text-xs font-medium">
              📋 Use Limit (Post-Only)
            </label>
          </div>
        </div>
        
        <div className="rounded-md bg-muted p-2 text-xs space-y-1">
          <div>
            Leverage: <b>{lev}x</b> • Est. Notional: <b>${notional.toFixed(2)}</b>
            {markPrice && qty !== undefined && (
              <> • Est. Qty: <b>{qty.toFixed(6)}</b> {symbol.replace('USDT','')}</>
            )}
          </div>
          {displayPrice && riskPrices && (
            <div className="text-[10px] opacity-80 border-t pt-1 mt-1">
              <div className="flex justify-between">
                <span>Entry: <b>${displayPrice.toFixed(4)}</b> {useLimit ? '(Limit)' : '(Market)'}</span>
                <span className="text-green-600">
                  TP: <b>${riskPrices.takeProfit.toFixed(4)}</b> 
                  (+{globalSettings.scalpTPPct ? (globalSettings.scalpTPPct * 100).toFixed(2) : (globalSettings.defaultTPPct * 100).toFixed(2)}%)
                </span>
                <span className="text-red-600">
                  SL: <b>${riskPrices.stopLoss.toFixed(4)}</b> 
                  (-{globalSettings.scalpSLPct ? (globalSettings.scalpSLPct * 100).toFixed(2) : (globalSettings.defaultSLPct * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="text-center mt-1 text-emerald-600">
                <b>Risk/Reward: {(globalSettings.defaultTPPct / globalSettings.defaultSLPct).toFixed(1)}:1 
                • Limit Orders</b>
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
          max={Math.min(globalSettings.maxLeverage, scalpMode ? 25 : 100)}
          step={1}
          onValueChange={(v) => setLev(Math.min(globalSettings.maxLeverage, Math.max(1, v[0])))}
        />
        <div className="flex justify-between text-[10px] opacity-70 mt-1">
          <span>1x</span>
          <span>{Math.floor(globalSettings.maxLeverage * 0.25)}x</span>
          <span>{Math.floor(globalSettings.maxLeverage * 0.5)}x</span>
          <span>{Math.floor(globalSettings.maxLeverage * 0.75)}x</span>
          <span>{globalSettings.maxLeverage}x</span>
        </div>
      </div>
      
      <BalanceChecker />

      <Button disabled={isExecuting} onClick={go} className={side === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
        {isExecuting ? 'Executing…' : `${side === 'Buy' ? 'Buy / Long' : 'Sell / Short'} ${symbol}`}
      </Button>
    </div>
  );
}