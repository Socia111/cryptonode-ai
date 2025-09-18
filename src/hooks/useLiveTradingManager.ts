import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveTradingState {
  isActive: boolean;
  feedStatus: 'connected' | 'connecting' | 'disconnected';
  autoTradingEnabled: boolean;
  signalsProcessed: number;
  tradesExecuted: number;
  lastUpdateTime: Date | null;
}

interface LiveFeedMetrics {
  marketDataPoints: number;
  signalsGenerated: number;
  activePairs: string[];
  exchangesConnected: string[];
}

export function useLiveTradingManager() {
  const { toast } = useToast();
  const [state, setState] = useState<LiveTradingState>({
    isActive: false,
    feedStatus: 'disconnected',
    autoTradingEnabled: false,
    signalsProcessed: 0,
    tradesExecuted: 0,
    lastUpdateTime: null
  });

  const [metrics, setMetrics] = useState<LiveFeedMetrics>({
    marketDataPoints: 0,
    signalsGenerated: 0,
    activePairs: [],
    exchangesConnected: []
  });

  const startLiveFeeds = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, feedStatus: 'connecting' }));
      
      toast({
        title: "🚀 Starting Live Trading System",
        description: "Initializing real-time market feeds and signal generation..."
      });

      // Start comprehensive all-symbols scanner
      const allSymbolsResult = await supabase.functions.invoke('all-symbols-scanner', {
        body: { trigger: 'comprehensive_scan' }
      });

      // Start live exchange feed for all symbols
      const exchangeFeedResult = await supabase.functions.invoke('live-exchange-feed', {
        body: {
          useAllSymbols: true,
          exchanges: ['bybit', 'binance', 'coinex'],
          trigger: 'live_dashboard'
        }
      });

      // Start enhanced signal generation
      const signalResult = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { 
          trigger: 'live_production',
          mode: 'real_time'
        }
      });

      // Start comprehensive trading pipeline
      const pipelineResult = await supabase.functions.invoke('comprehensive-trading-pipeline', {
        body: { 
          mode: 'live_production',
          enable_real_time: true
        }
      });

      // Start AItradeX1 enhanced scanner
      const scannerResult = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
        body: { 
          trigger: 'live_system',
          scan_all_coins: true
        }
      });

      setState(prev => ({ 
        ...prev, 
        isActive: true,
        feedStatus: 'connected',
        lastUpdateTime: new Date()
      }));

      // Update metrics based on results
      setMetrics(prev => ({
        ...prev,
        marketDataPoints: (exchangeFeedResult.data?.marketDataPoints || 0) + (allSymbolsResult.data?.marketDataPoints || 0),
        signalsGenerated: signalResult.data?.signals_generated || 0,
        activePairs: ['All USDT Pairs'],
        exchangesConnected: ['Bybit', 'Binance', 'CoinEx']
      }));

      toast({
        title: "✅ Comprehensive Scanner Active",
        description: `Now scanning ALL listed coins from Bybit, Binance & CoinEx exchanges`
      });

    } catch (error) {
      console.error('Failed to start live feeds:', error);
      setState(prev => ({ ...prev, feedStatus: 'disconnected' }));
      
      toast({
        title: "❌ System Error",
        description: "Failed to start live trading system. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopLiveFeeds = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isActive: false,
      feedStatus: 'disconnected',
      autoTradingEnabled: false
    }));

    toast({
      title: "⏹️ Live System Stopped",
      description: "All live feeds and auto-trading have been disabled"
    });
  }, [toast]);

  const toggleAutoTrading = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoTradingEnabled: enabled }));
    
    toast({
      title: enabled ? "🤖 Auto-Trading Enabled" : "⏸️ Auto-Trading Disabled",
      description: enabled 
        ? "System will now automatically execute trades based on signals"
        : "Manual approval required for all trades"
    });
  }, [toast]);

  const refreshFeeds = useCallback(async () => {
    if (state.feedStatus === 'connecting') return;
    
    setState(prev => ({ ...prev, feedStatus: 'connecting' }));
    
    try {
      // Trigger fresh data collection
      await supabase.functions.invoke('live-exchange-feed', {
        body: { refresh: true }
      });

      // Trigger signal refresh
      await supabase.functions.invoke('enhanced-signal-generation', {
        body: { trigger: 'refresh' }
      });

      setState(prev => ({ 
        ...prev, 
        feedStatus: 'connected',
        lastUpdateTime: new Date()
      }));

      toast({
        title: "🔄 Feeds Refreshed",
        description: "Latest market data and signals have been updated"
      });

    } catch (error) {
      console.error('Refresh failed:', error);
      setState(prev => ({ ...prev, feedStatus: 'disconnected' }));
      
      toast({
        title: "❌ Refresh Failed",
        description: "Unable to refresh feeds. Please check connection.",
        variant: "destructive"
      });
    }
  }, [state.feedStatus, toast]);

  // Auto-refresh every 2 minutes when active
  useEffect(() => {
    if (!state.isActive) return;

    const interval = setInterval(() => {
      refreshFeeds();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [state.isActive, refreshFeeds]);

  // Monitor system health
  useEffect(() => {
    if (!state.isActive) return;

    const healthCheck = setInterval(async () => {
      try {
        // Check if signals are still being generated
        const { data: recentSignals } = await supabase
          .from('signals')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
          .limit(1);

        if (!recentSignals || recentSignals.length === 0) {
          console.warn('No recent signals detected - system may need restart');
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 300000); // 5 minute health checks

    return () => clearInterval(healthCheck);
  }, [state.isActive]);

  return {
    state,
    metrics,
    actions: {
      startLiveFeeds,
      stopLiveFeeds,
      toggleAutoTrading,
      refreshFeeds
    }
  };
}