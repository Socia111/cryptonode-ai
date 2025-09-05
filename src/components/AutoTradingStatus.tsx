import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, PauseCircle, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoTradingStatus {
  isActive: boolean;
  lastExecution: string | null;
  totalExecuted: number;
  usersProcessed: number;
  lastError: string | null;
}

export const AutoTradingStatus = () => {
  const [status, setStatus] = useState<AutoTradingStatus>({
    isActive: false,
    lastExecution: null,
    totalExecuted: 0,
    usersProcessed: 0,
    lastError: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const startAutoTrading = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-scheduler');
      
      if (error) throw error;
      
      toast({
        title: "Auto-trading started",
        description: "Automated trading system is now active",
      });
      
      setStatus(prev => ({ ...prev, isActive: true, lastExecution: new Date().toISOString() }));
    } catch (error) {
      toast({
        title: "Failed to start auto-trading",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-trading-poller');
      
      if (!error && data) {
        setStatus(prev => ({
          ...prev,
          lastExecution: new Date().toISOString(),
          totalExecuted: data.total_executed || 0,
          usersProcessed: data.users_processed || 0,
          lastError: null
        }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, lastError: error.message }));
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Auto-Trading System
          <Badge variant={status.isActive ? "default" : "secondary"}>
            {status.isActive ? "ACTIVE" : "STANDBY"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Total Executed</div>
            <div className="text-2xl font-bold text-primary">{status.totalExecuted}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Users Processed</div>
            <div className="text-2xl font-bold text-primary">{status.usersProcessed}</div>
          </div>
        </div>

        {status.lastExecution && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Last Execution</div>
            <div className="text-sm">{new Date(status.lastExecution).toLocaleString()}</div>
          </div>
        )}

        {status.lastError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm text-destructive">{status.lastError}</div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={startAutoTrading}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            {isLoading ? "Starting..." : "Start Auto-Trading"}
          </Button>
          
          <Button 
            variant="outline"
            onClick={checkStatus}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};