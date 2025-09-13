import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import { GlobalTradeBar } from '@/components/GlobalTradeBar';
import { useRankedSignals } from '@/hooks/useRankedSignals';
import { useAutoExec } from '@/hooks/useAutoExec';
import { useSignals } from '@/hooks/useSignals';
import { useToast } from '@/hooks/use-toast';

const X2 = () => {
  const { signals, loading } = useSignals();
  const ranked = useRankedSignals(signals, { hideWideSpreads: true, maxSpreadBps: 10 });
  const { toast } = useToast();

  // Auto execute A+/A (skip 1m timeframe)  
  useAutoExec({
    rankedSignals: ranked as any,
    skip: (s: any) => s.timeframe === '1m',
    onSuccess: (s) => toast({ 
      title: '✅ X2 Auto Trade', 
      description: `${s.token} ${s.direction} + SL/TP` 
    }),
    onError: (s, e) => toast({ 
      title: '❌ X2 Auto Trade Failed', 
      description: `${s.token}: ${e?.message ?? 'Unknown error'}`, 
      variant: 'destructive' 
    }),
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-4 pb-32">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">X2 - Advanced Confluence</h1>
        </div>
        
        {loading ? (
          <div className="opacity-70 py-10 text-center">Loading confluence signals...</div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold mb-4">X2 Dashboard Coming Soon</h2>
            <p className="text-muted-foreground">
              Advanced confluence analysis and multi-timeframe signal validation
            </p>
          </div>
        )}
      </div>

      {/* Global persistent trade controls */}
      <GlobalTradeBar />
    </MainLayout>
  );
};

export default X2;