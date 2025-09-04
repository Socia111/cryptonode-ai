import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AutoTradingStatus {
  isEnabled: boolean;
  isConnected: boolean;
  lastExecution: string | null;
  signalsProcessed: number;
  errors: string[];
}

export function AutoTradingMonitor() {
  const [status, setStatus] = useState<AutoTradingStatus>({
    isEnabled: false,
    isConnected: false,
    lastExecution: null,
    signalsProcessed: 0,
    errors: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
      
      // First try to get existing config, then update/insert with proper UUID
      const { data: existingConfig } = await supabase
        .from('trading_configs')
        .select('id')
        .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
        .single();

      const configId = existingConfig?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
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
        body: { action: 'auto-trade' }
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
    checkTradingStatus();
    
    // Load trading config
    const loadConfig = async () => {
      const { data } = await supabase
        .from('trading_configs')
        .select('auto_trade_enabled')
        .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
        .single();
      
      setStatus(prev => ({ 
        ...prev, 
        isEnabled: data?.auto_trade_enabled || false
      }));
    };
    loadConfig();

    // Auto-refresh
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(checkTradingStatus, 30000); // Every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Auto-Trading Monitor</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkTradingStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Switch
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
            aria-label="Auto-refresh"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status</span>
          <Badge variant={status.isConnected ? "default" : "destructive"}>
            {status.isConnected ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        {/* Auto-Trading Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto-Trading</span>
          <Switch
            checked={status.isEnabled}
            onCheckedChange={toggleAutoTrading}
            disabled={isLoading}
          />
        </div>

        {/* Trading Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Signals Processed</span>
            <p className="font-medium">{status.signalsProcessed}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Execution</span>
            <p className="font-medium">
              {status.lastExecution 
                ? new Date(status.lastExecution).toLocaleTimeString()
                : "Never"
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={triggerAutoTrade}
            disabled={isLoading || !status.isConnected}
            size="sm"
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Execute Auto-Trade
          </Button>
        </div>

        {/* Error Display */}
        {status.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {status.errors[status.errors.length - 1]}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Description */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          {status.isEnabled ? (
            <p>🟢 Auto-trading is active. High-confidence signals (80%+) will execute automatically.</p>
          ) : (
            <p>🔴 Auto-trading is disabled. All signals require manual approval.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}