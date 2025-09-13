import React, { useState } from 'react';
import { normalizeSide } from '@/lib/tradingTypes';
import MainLayout from '../layouts/MainLayout';
import { SignalFeed } from '@/components/SignalFeed';
import { GlobalTradeBar } from '@/components/GlobalTradeBar';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { useAutoExec } from '@/hooks/useAutoExec';
import { useToast } from '@/hooks/use-toast';

const Signals = () => {
  const { signals, loading } = useSignals();
  const ranked = useRankedSignals(signals, { hideWideSpreads: true });
  const { toast } = useToast();

  // Auto execute A+/A (skip 1m timeframe)
  useAutoExec({
    rankedSignals: ranked as any,
    skip: (s: any) => s.timeframe === '1m',
    onSuccess: (s) => toast({ 
      title: '✅ Signals Auto Trade', 
      description: `${s.token} ${s.direction} + SL/TP` 
    }),
    onError: (s, e) => toast({ 
      title: '❌ Signals Auto Trade Failed', 
      description: `${s.token}: ${e?.message ?? 'Unknown error'}`, 
      variant: 'destructive' 
    }),
  });

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 pb-32">
        <h1 className="text-2xl font-bold mb-6">Live Trading Signals</h1>
        
        {loading ? (
          <div className="text-center py-10">Loading signals...</div>
        ) : (
          <SignalFeed signals={ranked} />
        )}
      </div>

      {/* Global persistent trade controls */}
      <GlobalTradeBar />
    </MainLayout>
  );
};

export default Signals;