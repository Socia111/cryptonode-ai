import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { SignalFeed } from '@/components/SignalFeed';
import { useSignals } from '@/hooks/useSignals';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { GlobalTradeBar } from '@/components/GlobalTradeBar';
import { useAutoPilot } from '@/hooks/useAutoPilot';

const Signals = () => {
  const { signals, loading, generateSignals } = useSignals();
  const { autoTradeSettings } = useAutoPilot();

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8 pb-20">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Trading Signals
          </h1>
          <p className="text-muted-foreground">
            Advanced AI-powered signals with 80%+ confidence and real-time market analysis
          </p>
          {autoTradeSettings.enabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm">
              🤖 Auto Pilot Active (A+/A signals)
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Signal Feed</h2>
          <Button onClick={generateSignals} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate New Signals
          </Button>
        </div>
        
        {loading ? (
          <div className="py-10 text-center opacity-70">Loading…</div>
        ) : (
          <SignalFeed signals={signals as any} />
        )}
      </div>
      <GlobalTradeBar />
    </MainLayout>
  );
};

export default Signals;