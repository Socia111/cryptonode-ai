import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSystemRestart() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [lastRestart, setLastRestart] = useState<Date | null>(null);

  const executeSystemRestart = useCallback(async () => {
    setIsRestarting(true);
    toast.info('Starting system restart...');

    try {
      console.log('🚀 Invoking system restart...');
      
      const { data, error } = await supabase.functions.invoke('system-restart', {
        body: { action: 'restart' }
      });

      if (error) {
        console.error('System restart error:', error);
        throw error;
      }

      console.log('✅ System restart completed:', data);
      
      setLastRestart(new Date());
      toast.success('System restart completed successfully!');

      // Refresh the page to reload all components with fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return data;

    } catch (error) {
      console.error('Failed to restart system:', error);
      toast.error('System restart failed. Please try again.');
      throw error;
    } finally {
      setIsRestarting(false);
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    try {
      // Test signals
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select('count', { count: 'exact' })
        .limit(1);

      // Test trading accounts  
      const { data: accounts, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('count', { count: 'exact' })
        .limit(1);

      return {
        signals: !signalsError,
        accounts: !accountsError,
        signalsCount: signals?.[0]?.count || 0,
        accountsCount: accounts?.[0]?.count || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        signals: false,
        accounts: false,
        signalsCount: 0,
        accountsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  return {
    isRestarting,
    lastRestart,
    executeSystemRestart,
    checkSystemHealth
  };
}