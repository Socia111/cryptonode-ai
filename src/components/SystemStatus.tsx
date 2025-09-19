import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface SystemStatusData {
  signals: { count: number; status: 'ok' | 'error' };
  marketData: { count: number; status: 'ok' | 'error' };
  tradingSystem: { status: 'ok' | 'error' };
  signalGeneration: { status: 'active' | 'inactive' };
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Check signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('id')
        .eq('is_active', true)
        .gte('score', 60);

      // Check market data
      const { data: marketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('id')
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      // Check execution orders
      const { data: executionData, error: executionError } = await supabase
        .from('execution_orders')
        .select('id')
        .limit(1);

      setStatus({
        signals: {
          count: signalsData?.length || 0,
          status: signalsError ? 'error' : 'ok'
        },
        marketData: {
          count: marketData?.length || 0,
          status: marketError ? 'error' : 'ok'
        },
        tradingSystem: {
          status: executionError ? 'error' : 'ok'
        },
        signalGeneration: {
          status: (signalsData?.length || 0) > 0 ? 'active' : 'inactive'
        }
      });

      console.log("System status updated:", {
        signals: signalsData?.length || 0,
        marketData: marketData?.length || 0,
        signalsError,
        marketError,
        executionError
      });
    } catch (error) {
      console.error('Status check error:', error);
      toast.error("Failed to check system status");
    } finally {
      setLoading(false);
    }
  };

  const triggerSignalGeneration = async () => {
    try {
      toast.info("Triggering signal generation...");
      
      const { error } = await supabase.functions.invoke('comprehensive-trading-pipeline');
      
      if (error) {
        toast.error(`Signal generation failed: ${error.message}`);
      } else {
        toast.success("Signal generation triggered successfully");
        setTimeout(checkSystemStatus, 3000);
      }
    } catch (error) {
      console.error('Signal generation error:', error);
      toast.error("Failed to trigger signal generation");
    }
  };

  const getStatusIcon = (status: 'ok' | 'error' | 'active' | 'inactive') => {
    switch (status) {
      case 'ok':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const getStatusBadge = (status: 'ok' | 'error' | 'active' | 'inactive') => {
    switch (status) {
      case 'ok':
        return <Badge variant="default" className="bg-green-100 text-green-800">OK</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          System Status
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemStatus}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.signals.status)}
                <span className="text-sm font-medium">Active Signals</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{status.signals.count}</span>
                {getStatusBadge(status.signals.status)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.marketData.status)}
                <span className="text-sm font-medium">Market Data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{status.marketData.count}</span>
                {getStatusBadge(status.marketData.status)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.tradingSystem.status)}
                <span className="text-sm font-medium">Trading System</span>
              </div>
              {getStatusBadge(status.tradingSystem.status)}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.signalGeneration.status)}
                <span className="text-sm font-medium">Signal Generation</span>
              </div>
              {getStatusBadge(status.signalGeneration.status)}
            </div>

            <div className="pt-3 border-t">
              <Button onClick={triggerSignalGeneration} className="w-full" size="sm">
                Generate New Signals
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading system status...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}