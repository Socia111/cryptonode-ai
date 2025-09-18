import React from 'react';
import { EnhancedSignalCard } from '@/components/EnhancedSignalCard';
import { useLiveSignalFeed } from '@/hooks/useLiveSignalFeed';
import { useTradingExecutor } from '@/hooks/useTradingExecutor';
import { TradingSignal } from '@/types/trading';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const SimpleSignalFeed = () => {
  const { signals, loading, error, refreshSignals, markSignalsAsRead } = useLiveSignalFeed();
  const { executeSignalTrade, executing } = useTradingExecutor();

  const handleTradeSignal = async (signal: TradingSignal) => {
    try {
      console.log('🚀 Executing signal trade:', signal);
      
      // Execute with default $50 amount in paper mode
      const result = await executeSignalTrade(signal, 50, true);
      
      if (result.success) {
        console.log('✅ Signal trade executed successfully:', result);
      } else {
        console.error('❌ Signal trade failed:', result);
      }
    } catch (error) {
      console.error('❌ Error executing signal trade:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading live signals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive mb-4">Error loading signals: {error}</p>
        <Button onClick={refreshSignals} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Trading Signals</h2>
        <div className="flex gap-2">
          <Button 
            onClick={refreshSignals} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={markSignalsAsRead} 
            variant="ghost" 
            size="sm"
          >
            Mark Read
          </Button>
        </div>
      </div>

      {/* Signal Cards */}
      <div className="space-y-3">
        {signals.map((signal) => (
          <EnhancedSignalCard 
            key={`${signal.symbol}-${signal.generated_at}`} 
            signal={{
              ...signal,
              isNew: signal.generated_at ? 
                (Date.now() - new Date(signal.generated_at).getTime()) < 300000 : false // New if < 5 mins
            }} 
            onTrade={handleTradeSignal}
            onDetails={(signal) => console.log('View technical details for:', signal)}
          />
        ))}
        
        {signals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No signals available. Try refreshing or check your filters.
          </div>
        )}
      </div>

      {/* Trading Status */}
      {executing && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Executing trade...
          </div>
        </div>
      )}
    </div>
  );
};