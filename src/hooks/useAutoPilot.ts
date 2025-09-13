import { useState, useEffect } from 'react';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { useAutoExec } from '@/hooks/useAutoExec';
import { UISignal, gradeFromComposite, compositeScore } from '@/lib/signalScoring';
import { useToast } from '@/hooks/use-toast';

// Convert Signal to UISignal with grading
function signalToUISignal(signal: any): UISignal & { grade: 'A+'|'A'|'B'|'C' } {
  const score = compositeScore(signal);
  const grade = gradeFromComposite(score);
  
  return {
    ...signal,
    token: signal.token,
    direction: signal.direction,
    entry_price: signal.entry_price,
    take_profit: signal.exit_target,
    stop_loss: signal.stop_loss,
    score: signal.confidence_score,
    confidence_score: signal.confidence_score,
    timeframe: signal.timeframe,
    spread_bps: 10, // Assume low spread for demo
    grade
  };
}

export function useAutoPilot() {
  const { signals, loading } = useSignals();
  const { toast } = useToast();
  
  // Auto-trade settings from localStorage
  const [amountUSD, setAmountUSD] = useState(() => +(localStorage.getItem('autotrade.amount') || '5'));
  const [leverage, setLeverage] = useState(() => +(localStorage.getItem('autotrade.lev') || '5'));
  const [enabled, setEnabled] = useState(() => JSON.parse(localStorage.getItem('autotrade.enabled') || 'false'));

  // Convert signals to UISignals with grades
  const uiSignals = signals.map(signalToUISignal);
  
  // Use ranking hook with auto-pilot optimized settings
  const rankedSignals = useRankedSignals(uiSignals, {
    hideWideSpreads: true,
    maxSpreadBps: 20,
    hide1MinSignals: true,
    excludeInnovationZone: true
  });

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      const { amountUSD: newAmount, leverage: newLev, enabled: newEnabled } = e.detail;
      setAmountUSD(newAmount);
      setLeverage(newLev);
      setEnabled(newEnabled);
    };

    window.addEventListener('autotrade:settings', handleSettingsChange);
    return () => window.removeEventListener('autotrade:settings', handleSettingsChange);
  }, []);

  // Auto-exec hook
  useAutoExec({
    rankedSignals,
    amountUSD,
    leverage,
    useLimit: true, // Use limit orders by default
    scalpMode: false,
    enabled,
    maxSpreadBps: 20,
    onSuccess: (signal, result) => {
      toast({
        title: '✅ Auto Trade Executed',
        description: `${signal.token} ${signal.direction} - TP/SL attached`,
        duration: 8000
      });
    },
    onError: (signal, error) => {
      toast({
        title: '❌ Auto Trade Failed',
        description: `${signal.token}: ${error.message}`,
        variant: 'destructive',
        duration: 8000
      });
    }
  });

  return {
    signals: rankedSignals,
    loading,
    autoTradeSettings: {
      amountUSD,
      leverage,
      enabled
    }
  };
}