import { useState, useEffect } from 'react';
import { automatedTradingEngine, AutoTradingStatus, AutoTradingConfig } from '@/lib/automatedTrading';

export function useAutomatedTrading() {
  const [status, setStatus] = useState<AutoTradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to status updates
    automatedTradingEngine.subscribe(setStatus);
    
    // Get initial status
    setStatus(automatedTradingEngine.getStatus());
  }, []);

  const startTrading = async () => {
    setLoading(true);
    setError(null);
    try {
      await automatedTradingEngine.start();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopTrading = async () => {
    setLoading(true);
    setError(null);
    try {
      await automatedTradingEngine.stop();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (config: AutoTradingConfig) => {
    automatedTradingEngine.updateConfig(config);
  };

  return {
    status,
    loading,
    error,
    startTrading,
    stopTrading,
    updateConfig
  };
}