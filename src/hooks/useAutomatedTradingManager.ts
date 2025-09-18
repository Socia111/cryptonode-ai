import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AutoTradingConfig {
  maxPositionSize: number;
  riskPerTrade: number;
  autoTradingEnabled: boolean;
  stopLossEnabled: boolean;
  takeProfitEnabled: boolean;
  leverage: number;
  accountType: 'testnet' | 'mainnet';
}

export interface AutoTradingStatus {
  isRunning: boolean;
  activePositions: number;
  todayPnL: number;
  totalTrades: number;
  successRate: number;
  lastProcessedSignal: string | null;
  config: AutoTradingConfig | null;
}

export function useAutomatedTradingManager() {
  const [status, setStatus] = useState<AutoTradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AutoTradingManager] Loading automated trading status...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('automated-trading-orchestrator', {
        body: {
          action: 'get_status',
          userId: user.id
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('[AutoTradingManager] Status loaded:', response.data);
      setStatus(response.data);
      
    } catch (err: any) {
      console.error('[AutoTradingManager] Error loading status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startAutomatedTrading = async (config: AutoTradingConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AutoTradingManager] Starting automated trading with config:', config);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('automated-trading-orchestrator', {
        body: {
          action: 'start',
          userId: user.id,
          config
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('[AutoTradingManager] Automated trading started:', response.data);
      
      // Reload status to get updated data
      await loadStatus();
      
      return response.data;
      
    } catch (err: any) {
      console.error('[AutoTradingManager] Error starting automated trading:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopAutomatedTrading = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AutoTradingManager] Stopping automated trading...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('automated-trading-orchestrator', {
        body: {
          action: 'stop',
          userId: user.id
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('[AutoTradingManager] Automated trading stopped:', response.data);
      
      // Reload status to get updated data
      await loadStatus();
      
      return response.data;
      
    } catch (err: any) {
      console.error('[AutoTradingManager] Error stopping automated trading:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processSignal = async (signalId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AutoTradingManager] Processing signal for automation:', signalId);
      
      const response = await supabase.functions.invoke('automated-trading-orchestrator', {
        body: {
          action: 'process_signal',
          signalId
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('[AutoTradingManager] Signal processed:', response.data);
      
      // Reload status to get updated data
      await loadStatus();
      
      return response.data;
      
    } catch (err: any) {
      console.error('[AutoTradingManager] Error processing signal:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Set up periodic status refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading]);

  return {
    status,
    loading,
    error,
    startAutomatedTrading,
    stopAutomatedTrading,
    processSignal,
    refreshStatus: loadStatus
  };
}