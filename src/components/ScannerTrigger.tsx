import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ScannerTrigger = () => {
  const [scanning, setScanning] = useState(false);
  const [pollerRunning, setPollerRunning] = useState(false);
  const { toast } = useToast();

  const triggerScanner = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('live-scanner-production', {
        body: { timeframe: '15m' }
      });

      if (error) throw error;

      toast({
        title: '✅ Scanner Triggered',
        description: `Generated ${data?.signalsGenerated || 0} signals`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Scanner Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const triggerPoller = async () => {
    setPollerRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-trading-poller');

      if (error) throw error;

      toast({
        title: '✅ Poller Executed',
        description: `Processed ${data?.signals_processed || 0} signals, executed ${data?.trades_executed || 0} trades`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Poller Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPollerRunning(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Live Trading Controls
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manual triggers for testing (auto-runs via cron)
            </p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            Production Live
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={triggerScanner}
            disabled={scanning}
            className="w-full"
            variant="default"
          >
            {scanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Scanner
              </>
            )}
          </Button>

          <Button
            onClick={triggerPoller}
            disabled={pollerRunning}
            className="w-full"
            variant="secondary"
          >
            {pollerRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Polling...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Poller
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
          <p className="font-medium mb-1">🤖 Automated Schedule:</p>
          <p>• Scanner: Every 15 minutes</p>
          <p>• Poller: Every 1 minute</p>
          <p className="mt-2 text-yellow-600">⚡ Real Bybit API • Live Executions</p>
        </div>
      </div>
    </Card>
  );
};
