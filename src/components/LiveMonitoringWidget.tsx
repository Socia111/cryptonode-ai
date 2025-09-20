import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Signal,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveMetrics {
  signalsCount: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  lastSignalTime: string | null;
  avgScore: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

interface RecentSignal {
  id: string;
  symbol: string;
  direction: string;
  score: number;
  timeframe: string;
  created_at: string;
}

const LiveMonitoringWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    signalsCount: 0,
    systemHealth: 'healthy',
    lastSignalTime: null,
    avgScore: 0,
    connectionStatus: 'connecting'
  });
  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Fetch latest metrics
  const fetchMetrics = async () => {
    try {
      // Get recent signals (last 1 hour)
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const activeSignals = signals?.filter(s => s.is_active) || [];
      const avgScore = signals?.length ? 
        signals.reduce((sum, s) => sum + s.score, 0) / signals.length : 0;

      setMetrics({
        signalsCount: activeSignals.length,
        systemHealth: avgScore > 70 ? 'healthy' : avgScore > 50 ? 'warning' : 'error',
        lastSignalTime: signals?.[0]?.created_at || null,
        avgScore,
        connectionStatus: 'connected'
      });

      setRecentSignals(signals?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setMetrics(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchMetrics();

    // Set up real-time subscription
    const channel = supabase
      .channel('live-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal detected:', payload);
          fetchMetrics(); // Refresh metrics
          
          // Show toast for high-quality signals
          const newSignal = payload.new as any;
          if (newSignal.score >= 75) {
            toast({
              title: "High Quality Signal",
              description: `${newSignal.symbol} ${newSignal.direction} - Score: ${newSignal.score}%`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Live monitoring subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('Live monitoring channel error - will retry');
        }
      });

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now.getTime() - signalTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <Card className={`fixed bottom-4 right-4 transition-all duration-300 z-50 ${
      isExpanded ? 'w-96 h-auto' : 'w-80 h-32'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {metrics.connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <CardTitle className="text-sm font-medium">Live Monitor</CardTitle>
            {getHealthIcon(metrics.systemHealth)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <Activity className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Signal className="h-4 w-4 text-primary" />
            <span className="font-medium">{metrics.signalsCount}</span>
            <span className="text-muted-foreground">signals</span>
          </div>
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium">{metrics.avgScore.toFixed(0)}%</span>
            <span className="text-muted-foreground">avg</span>
          </div>
        </div>

        {/* Last Signal Time */}
        {metrics.lastSignalTime && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last signal: {formatTimeAgo(metrics.lastSignalTime)}</span>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recent Signals</h4>
              <Badge variant="outline" className="text-xs">
                {recentSignals.length}
              </Badge>
            </div>

            {recentSignals.length === 0 ? (
              <div className="text-center py-4">
                <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No recent signals</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentSignals.map((signal) => (
                  <div key={signal.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                    <div className="flex items-center space-x-2">
                      {signal.direction === 'LONG' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="font-medium">{signal.symbol}</span>
                      <Badge variant="secondary" className="text-xs">
                        {signal.timeframe}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{signal.score}%</p>
                      <p className="text-muted-foreground">
                        {formatTimeAgo(signal.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* System Status */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  metrics.systemHealth === 'healthy' ? 'bg-green-500' : 
                  metrics.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                } animate-pulse`} />
                <span className="text-xs text-muted-foreground">
                  System {metrics.systemHealth}
                </span>
              </div>
              <Badge variant={metrics.connectionStatus === 'connected' ? 'default' : 'destructive'} className="text-xs">
                {metrics.connectionStatus}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMonitoringWidget;