import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, TrendingUp, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatusMetrics {
  signals_30m: number;
  orders_30m: number;
  latest_signal: string | null;
  latest_order: string | null;
}

export const SystemStatus = () => {
  const [metrics, setMetrics] = useState<StatusMetrics | null>(null);
  const [cronStatus, setCronStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      // Fetch KPI metrics
      const { data: kpiData } = await supabase.rpc('get_debug_kpis');
      if (kpiData && kpiData.length > 0) {
        setMetrics(kpiData[0]);
      }

      // Fetch cron job status
      const { data: cronData } = await supabase
        .from('cron.job')
        .select('jobname, schedule, active')
        .in('jobname', ['live-scanner-15m', 'auto-trading-poller-1m']);
      
      if (cronData) setCronStatus(cronData);
      
    } catch (error) {
      console.error('Status fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Live System Status
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time monitoring • Production environment
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Operational
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Signals (30m)
            </p>
            <p className="text-2xl font-bold text-blue-600">{metrics?.signals_30m || 0}</p>
            <p className="text-xs text-muted-foreground">
              Last: {formatTime(metrics?.latest_signal || null)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Orders (30m)
            </p>
            <p className="text-2xl font-bold text-green-600">{metrics?.orders_30m || 0}</p>
            <p className="text-xs text-muted-foreground">
              Last: {formatTime(metrics?.latest_order || null)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Scanner
            </p>
            <p className="text-lg font-semibold text-orange-600">Every 15m</p>
            <p className="text-xs text-muted-foreground">Auto-scheduled</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Poller
            </p>
            <p className="text-lg font-semibold text-purple-600">Every 1m</p>
            <p className="text-xs text-muted-foreground">Auto-scheduled</p>
          </div>
        </div>

        {/* Cron Jobs Status */}
        {cronStatus.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Automated Tasks</h4>
            <div className="space-y-2">
              {cronStatus.map((job) => (
                <div key={job.jobname} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{job.jobname}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{job.schedule}</code>
                    <Badge 
                      variant={job.active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {job.active ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />Inactive</>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Indicator */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <div>
              <p className="font-medium text-sm">🚀 Production System Active</p>
              <p className="text-xs text-muted-foreground">
                Real Bybit API • Live market data • Automated execution
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
