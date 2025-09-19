import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, RefreshCw, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function SimpleSystemStatus() {
  const [status, setStatus] = useState({
    signals: 0,
    marketData: 0,
    isLoading: false,
    lastUpdate: null as Date | null
  });

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Count active signals
      const { data: signals } = await supabase
        .from('signals')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .gte('score', 60);

      // Count recent market data
      const { data: marketData } = await supabase
        .from('live_market_data')
        .select('id', { count: 'exact' })
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      setStatus({
        signals: signals?.length || 0,
        marketData: marketData?.length || 0,
        isLoading: false,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Status check failed:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const generateSignals = async () => {
    try {
      toast.info("Generating new signals...");
      
      await supabase.functions.invoke('comprehensive-trading-pipeline');
      
      toast.success("Signal generation triggered!");
      setTimeout(checkStatus, 3000);
    } catch (error) {
      console.error('Signal generation failed:', error);
      toast.error("Failed to generate signals");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={status.isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${status.isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-primary">{status.signals}</div>
            <div className="text-sm text-muted-foreground">Active Signals</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-primary">{status.marketData}</div>
            <div className="text-sm text-muted-foreground">Market Data</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Signal Generation</span>
            <div className="flex items-center gap-2">
              {status.signals > 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <Badge variant="secondary">Inactive</Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Market Data Feed</span>
            <div className="flex items-center gap-2">
              {status.marketData > 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Badge variant="destructive">Offline</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {status.lastUpdate && (
          <div className="text-xs text-muted-foreground text-center">
            Last updated: {status.lastUpdate.toLocaleTimeString()}
          </div>
        )}

        <Button onClick={generateSignals} className="w-full" size="sm">
          Generate New Signals
        </Button>
      </CardContent>
    </Card>
  );
}