import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RefreshStatus {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  dataPoints: number;
  signalsGenerated: number;
  errors: string[];
}

export function useAutoRefresh(intervalMinutes: number = 2) {
  const [status, setStatus] = useState<RefreshStatus>({
    isRefreshing: false,
    lastRefresh: null,
    dataPoints: 0,
    signalsGenerated: 0,
    errors: []
  });
  
  const { toast } = useToast();

  const triggerRefresh = useCallback(async () => {
    if (status.isRefreshing) return;

    setStatus(prev => ({ ...prev, isRefreshing: true, errors: [] }));
    
    try {
      console.log('🔄 Triggering auto-refresh system...');
      
      // Trigger the auto-refresh system
      const { data, error } = await supabase.functions.invoke('auto-refresh-system', {
        body: { 
          manual_trigger: true,
          timestamp: new Date().toISOString() 
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setStatus(prev => ({
          ...prev,
          isRefreshing: false,
          lastRefresh: new Date(),
          dataPoints: data.results?.market_data_refresh ? 18 : 0,
          signalsGenerated: data.results?.signal_generation ? 10 : 0,
          errors: data.results?.errors || []
        }));

        toast({
          title: "🔄 Data Refreshed",
          description: `Market data and signals updated from live Bybit API`,
          variant: "default"
        });
      } else {
        throw new Error(data?.error || 'Refresh failed');
      }

    } catch (err: any) {
      console.error('Auto-refresh error:', err);
      setStatus(prev => ({
        ...prev,
        isRefreshing: false,
        errors: [err.message]
      }));

      toast({
        title: "❌ Refresh Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  }, [status.isRefreshing, toast]);

  // Auto-refresh at specified interval
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRefresh();
    }, intervalMinutes * 60 * 1000);

    // Initial refresh
    setTimeout(() => triggerRefresh(), 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, triggerRefresh]);

  return {
    ...status,
    triggerRefresh,
    nextRefreshIn: status.lastRefresh 
      ? Math.max(0, intervalMinutes * 60 - Math.floor((Date.now() - status.lastRefresh.getTime()) / 1000))
      : 0
  };
}