import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  signals_count: number;
  live_trading: boolean;
  last_signal_time: string;
  market_data_updated: string;
}

const SystemStatusSummary = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkSystemStatus = async () => {
    try {
      const { data: signals } = await supabase
        .from('signals')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const { data: prices } = await supabase
        .from('live_prices')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1);

      setStatus({
        signals_count: signals?.length || 0,
        live_trading: true,
        last_signal_time: signals?.[0]?.created_at || 'Never',
        market_data_updated: prices?.[0]?.last_updated || 'Never'
      });
    } catch (error) {
      console.error('Error checking system status:', error);
    }
  };

  const generateSignals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('production-signal-generator');
      if (error) throw error;
      
      toast({
        title: "Signals Generated",
        description: `Generated ${data?.signals_generated || 0} real signals from live market data`
      });
      
      checkSystemStatus();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    if (timestamp === 'Never') return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Status
          </div>
          <Button
            onClick={generateSignals}
            disabled={loading}
            size="sm"
            className="gap-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Generate Signals
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{status?.signals_count || 0}</div>
            <div className="text-sm text-muted-foreground">Active Signals (24h)</div>
          </div>
          
          <div className="text-center">
            <Badge variant={status?.live_trading ? "default" : "destructive"} className="mb-1">
              {status?.live_trading ? 'Live' : 'Offline'}
            </Badge>
            <div className="text-sm text-muted-foreground">Trading Status</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium">
              {formatTimeAgo(status?.last_signal_time || 'Never')}
            </div>
            <div className="text-sm text-muted-foreground">Last Signal</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium">
              {formatTimeAgo(status?.market_data_updated || 'Never')}
            </div>
            <div className="text-sm text-muted-foreground">Market Data</div>
          </div>
        </div>

        {status?.signals_count === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              No signals detected in the last 24 hours. Click "Generate Signals" to scan markets.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemStatusSummary;