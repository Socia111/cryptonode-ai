import * as React from 'react';
import { useGlobalTrade } from '@/store/useGlobalTrade';
import { useLocation } from 'react-router-dom';

export function GlobalTradeBar() {
  const location = useLocation();
  const { amountUSD, leverage, auto, setAmountUSD, setLeverage, setAuto } = useGlobalTrade();

  // Only show on signals pages
  const isSignalsPage = ['/x', '/x1', '/x2', '/signals', '/aitradex1original'].includes(location.pathname.toLowerCase());
  
  if (!isSignalsPage) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl px-3 py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Amount */}
        <div className="rounded-md border p-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Amount (USD)</span>
            <span>${amountUSD.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={100}
            step={0.01}
            value={amountUSD}
            onChange={(e) => setAmountUSD(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex gap-1 text-[10px] opacity-70">
            {[0.1, 1, 5, 10, 25, 50, 100].map(v => (
              <button key={v} className="px-1 py-0.5 rounded border" onClick={() => setAmountUSD(v)}>${v}</button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div className="rounded-md border p-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Leverage</span>
            <span>{leverage}x</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] opacity-70">
            <span>1x</span><span>25x</span><span>50x</span><span>75x</span><span>100x</span>
          </div>
        </div>

        {/* Auto toggle */}
        <div className="rounded-md border p-2 flex flex-col justify-between">
          <div className="text-xs mb-2">Automatic trading (A+/A signals)</div>
          <button
            onClick={() => setAuto(!auto)}
            className={`h-9 rounded-md text-sm font-medium ${
              auto ? 'bg-green-600 text-white' : 'bg-muted'
            }`}
          >
            {auto ? '⏸ Pause Auto' : '🚀 Start Auto'}
          </button>
          <div className="mt-2 text-[11px] opacity-70">
            {auto
              ? `Active • $${amountUSD.toFixed(2)} @ ${leverage}x across /x /x1 /x2 /AITRADEX1ORIGINAL`
              : 'Auto is off'}
          </div>
        </div>
      </div>
    </div>
  );
}