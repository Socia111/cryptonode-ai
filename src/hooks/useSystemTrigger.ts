import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSystemTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const triggerAutoRefresh = async () => {
    try {
      setIsRunning(true);
      console.log('[System Trigger] Starting auto-refresh system...');
      
      const { data, error } = await supabase.functions.invoke('auto-refresh-system', {
        body: { 
          manual_trigger: true,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('[System Trigger] Auto-refresh error:', error);
        toast.error(`Auto-refresh failed: ${error.message}`);
        return false;
      }

      console.log('[System Trigger] Auto-refresh completed:', data);
      setLastRun(new Date().toISOString());
      toast.success(`Auto-refresh completed. Processed ${data?.results?.signal_generation ? 'signals' : 'market data'}`);
      return true;
    } catch (error) {
      console.error('[System Trigger] Auto-refresh exception:', error);
      toast.error('Auto-refresh system error');
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  const triggerSignalGeneration = async () => {
    try {
      setIsRunning(true);
      console.log('[System Trigger] Starting signal generation...');
      
      const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { 
          force_generation: true,
          source: 'manual_trigger',
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('[System Trigger] Signal generation error:', error);
        toast.error(`Signal generation failed: ${error.message}`);
        return false;
      }

      console.log('[System Trigger] Signal generation completed:', data);
      toast.success(`Generated ${data?.signals_generated || 0} new signals`);
      return true;
    } catch (error) {
      console.error('[System Trigger] Signal generation exception:', error);
      toast.error('Signal generation error');
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  const triggerMarketDataRefresh = async () => {
    try {
      setIsRunning(true);
      console.log('[System Trigger] Starting market data refresh...');
      
      const { data, error } = await supabase.functions.invoke('live-bybit-data-feed', {
        body: { 
          force_refresh: true,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('[System Trigger] Market data refresh error:', error);
        toast.error(`Market data refresh failed: ${error.message}`);
        return false;
      }

      console.log('[System Trigger] Market data refresh completed:', data);
      toast.success(`Market data refreshed: ${data?.data_points || 0} data points`);
      return true;
    } catch (error) {
      console.error('[System Trigger] Market data refresh exception:', error);
      toast.error('Market data refresh error');
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  const runFullSystemRefresh = async () => {
    try {
      setIsRunning(true);
      toast.info('Starting full system refresh...');
      
      // Step 1: Refresh market data
      const marketDataResult = await triggerMarketDataRefresh();
      if (!marketDataResult) return false;

      // Step 2: Wait 2 seconds for data to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Generate signals
      const signalsResult = await triggerSignalGeneration();
      if (!signalsResult) return false;

      // Step 4: Run auto-refresh for cleanup
      await triggerAutoRefresh();

      toast.success('Full system refresh completed successfully!');
      return true;
    } catch (error) {
      console.error('[System Trigger] Full refresh error:', error);
      toast.error('Full system refresh failed');
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    lastRun,
    triggerAutoRefresh,
    triggerSignalGeneration,
    triggerMarketDataRefresh,
    runFullSystemRefresh
  };
}