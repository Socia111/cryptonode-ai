import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface AutoTradingStatus {
  isEnabled: boolean;
  isConnected: boolean;
  lastExecution?: string;
  signalsProcessed: number;
  errors: string[];
}

const FixedAutoTradingMonitor = () => {
  const [status, setStatus] = useState<AutoTradingStatus>({
    isEnabled: false,
    isConnected: false,
    signalsProcessed: 0,
    errors: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const checkTradingStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { 
          action: 'status',
          symbol: 'BTCUSDT',
          settleCoin: 'USDT'
        }
      });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        isConnected: true,
        lastExecution: new Date().toISOString(),
        errors: []
      }));
    } catch (error: any) {
      console.error('Trading status check failed:', error);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        errors: [...prev.errors, error.message]
      }));
    }
  };

  const toggleAutoTrading = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      
      const configId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      const { error } = await supabase
        .from('trading_configs')
        .upsert({
          id: configId,
          auto_trade_enabled: enabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatus(prev => ({ ...prev, isEnabled: enabled }));
      
      toast({
        title: enabled ? "Auto-Trading Enabled" : "Auto-Trading Disabled",
        description: enabled 
          ? "High-confidence signals will now execute automatically" 
          : "All trades now require manual approval",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAutoTrade = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('automated-trading-engine', {
        body: { 
          action: 'auto-trade',
          symbol: 'BTCUSDT',
          settleCoin: 'USDT'
        }
      });

      if (error) throw error;

      toast({
        title: "Auto-Trade Triggered",
        description: `Processed ${data.processed || 0} signals`,
      });

      await checkTradingStatus();
    } catch (error: any) {
      toast({
        title: "Auto-Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    const loadInitialData = async () => {
      await checkTradingStatus();
      
      try {
        const { data } = await supabase
          .from('trading_configs')
          .select('auto_trade_enabled')
          .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
          .single();
          
        setStatus(prev => ({ 
          ...prev, 
          isEnabled: data?.auto_trade_enabled || false 
        }));
      } catch (error) {
        console.error('Error fetching trading config:', error);
      }
    };

    loadInitialData();

    // Auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(checkTradingStatus, 10000); // Every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Auto-Trading Monitor
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={checkTradingStatus}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Auto-refresh</span>
              <Switch 
                checked={autoRefresh} 
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          <Badge variant={status.isConnected ? "default" : "destructive"}>
            {status.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Auto-Trading Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto-Trading</span>
          <Switch 
            checked={status.isEnabled} 
            onCheckedChange={toggleAutoTrading}
            disabled={isLoading || !status.isConnected}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Signals Processed</p>
            <p className="text-2xl font-bold">{status.signalsProcessed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Execution</p>
            <p className="text-sm">
              {status.lastExecution 
                ? new Date(status.lastExecution).toLocaleTimeString()
                : 'Never'
              }
            </p>
          </div>
        </div>

        {/* Manual Execute Button */}
        <Button 
          className="w-full" 
          onClick={triggerAutoTrade}
          disabled={isLoading || !status.isConnected}
        >
          {isLoading ? 'Processing...' : 'Execute Auto-Trade'}
        </Button>

        {/* Errors Display */}
        {status.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="text-sm space-y-1">
                {status.errors.slice(-3).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Description */}
        <div className="text-center text-sm text-muted-foreground">
          {status.isEnabled 
            ? "✅ Auto-trading is active. High-confidence signals will execute automatically."
            : "⏸️ Auto-trading is disabled. All signals require manual approval."
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default FixedAutoTradingMonitor;