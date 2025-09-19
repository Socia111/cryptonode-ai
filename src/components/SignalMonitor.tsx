import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SystemStatus {
  signalCount: number;
  lastSignalTime: string | null;
  liveDataCount: number;
  queueCount: number;
  isRealTimeConnected: boolean;
}

export function SignalMonitor() {
  const [status, setStatus] = useState<SystemStatus>({
    signalCount: 0,
    lastSignalTime: null,
    liveDataCount: 0,
    queueCount: 0,
    isRealTimeConnected: false
  });

  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      // Get total signal count
      const { count: signalCount } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get recent signals
      const { data: signals } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get live market data count
      const { count: liveDataCount } = await supabase
        .from('live_market_data')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      // Get execution queue count
      const { count: queueCount } = await supabase
        .from('execution_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      setStatus({
        signalCount: signalCount || 0,
        lastSignalTime: signals?.[0]?.created_at || null,
        liveDataCount: liveDataCount || 0,
        queueCount: queueCount || 0,
        isRealTimeConnected: true
      });

      setRecentSignals(signals || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch status:', error);
      toast.error('Failed to fetch system status');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds

    // Set up real-time subscriptions
    const signalsChannel = supabase
      .channel('signals-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('🎯 New signal received:', payload.new);
          toast.success(`New ${payload.new.symbol} signal: ${payload.new.direction} (Score: ${payload.new.score})`);
          fetchStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data'
        },
        (payload) => {
          console.log('📊 Live market data updated:', payload.new);
          setStatus(prev => ({ ...prev, isRealTimeConnected: true }));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(signalsChannel);
    };
  }, []);

  const getTimeSinceLastSignal = () => {
    if (!status.lastSignalTime) return 'Never';
    const diff = Date.now() - new Date(status.lastSignalTime).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  };

  const triggerSignalGeneration = async () => {
    try {
      console.log('🚀 Triggering signal generation...');
      toast.info('Triggering signal generation...');
      
      const response = await supabase.functions.invoke('comprehensive-trading-pipeline');
      
      if (response.error) {
        console.error('Pipeline error:', response.error);
        toast.error('Failed to trigger signal generation');
      } else {
        console.log('✅ Pipeline triggered successfully');
        toast.success('Signal generation triggered successfully');
        setTimeout(fetchStatus, 2000); // Refresh after 2 seconds
      }
    } catch (error) {
      console.error('Failed to trigger pipeline:', error);
      toast.error('Failed to trigger signal generation');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Signal Generation Monitor</CardTitle>
          <Button 
            onClick={fetchStatus} 
            size="sm" 
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{status.signalCount}</div>
              <div className="text-sm text-muted-foreground">Active Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status.liveDataCount}</div>
              <div className="text-sm text-muted-foreground">Live Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{status.queueCount}</div>
              <div className="text-sm text-muted-foreground">Queued Trades</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                {status.isRealTimeConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <Badge variant={status.isRealTimeConnected ? "default" : "destructive"}>
                  {status.isRealTimeConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Real-time</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Last Signal:</span>
              <span className="text-sm text-muted-foreground">{getTimeSinceLastSignal()}</span>
            </div>
            
            <Button 
              onClick={triggerSignalGeneration}
              size="sm"
              className="w-full"
            >
              <Activity className="h-4 w-4 mr-2" />
              Generate New Signals
            </Button>
          </div>
        </CardContent>
      </Card>

      {recentSignals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{signal.symbol}</Badge>
                    <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                      {signal.direction}
                    </Badge>
                    <span className="text-sm font-medium">Score: {signal.score}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(signal.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}