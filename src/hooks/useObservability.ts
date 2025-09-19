import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemStatus {
  service_name: string;
  status: string;
  last_update: string;
  success_count?: number;
  error_count?: number;
  metadata?: any;
}

interface DebugKPIs {
  signals_30m: number;
  orders_30m: number;
  latest_signal: string | null;
  latest_order: string | null;
}

export const useObservability = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [kpis, setKPIs] = useState<DebugKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSystemStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('last_update', { ascending: false });

      if (error) {
        console.error('Failed to fetch system status:', error);
        return;
      }

      setSystemStatus(data || []);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchKPIs = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_debug_kpis');

      if (error) {
        console.error('Failed to fetch KPIs:', error);
        return;
      }

      if (data && data.length > 0) {
        setKPIs(data[0]);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchSystemStatus(), fetchKPIs()]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();

    // Set up real-time subscriptions
    const statusChannel = supabase
      .channel('system_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_status'
        },
        () => {
          fetchSystemStatus();
        }
      )
      .subscribe();

    const signalsChannel = supabase
      .channel('signals_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        () => {
          fetchKPIs();
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_orders'
        },
        () => {
          fetchKPIs();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const getServiceStatus = (serviceName: string): SystemStatus | null => {
    return systemStatus.find(s => s.service_name === serviceName) || null;
  };

  const isSystemHealthy = (): boolean => {
    const criticalServices = ['signal_engine', 'trade_executor', 'live_scanner'];
    return criticalServices.every(service => {
      const status = getServiceStatus(service);
      return status && status.status === 'active';
    });
  };

  return {
    systemStatus,
    kpis,
    loading,
    lastUpdate,
    refreshData,
    getServiceStatus,
    isSystemHealthy
  };
};