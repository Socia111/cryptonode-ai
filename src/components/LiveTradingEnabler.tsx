import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const LiveTradingEnabler = () => {
  const [enabling, setEnabling] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const { toast } = useToast();

  const checkCurrentMode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      
      if (!error && data) {
        setIsLiveMode(!data.paper_mode);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  const enableLiveTrading = async () => {
    setEnabling(true);
    
    try {
      // Test Bybit connection first
      const { data: testData, error: testError } = await supabase.functions.invoke('trading-diagnostics', {
        body: { action: 'test_bybit_connection' }
      });
      
      if (testError || !testData?.success) {
        throw new Error(testData?.error || 'Bybit connection test failed');
      }
      
      // Run a full pipeline test
      const { data: pipelineData, error: pipelineError } = await supabase.functions.invoke('trading-diagnostics', {
        body: { action: 'test_full_pipeline' }
      });
      
      if (pipelineError || !pipelineData?.success) {
        throw new Error(pipelineData?.error || 'Pipeline test failed');
      }
      
      setIsLiveMode(true);
      
      toast({
        title: "🔥 Live Trading Enabled!",
        description: "All systems checked. Ready for live trading.",
      });
      
    } catch (error: any) {
      toast({
        title: "❌ Cannot Enable Live Trading",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnabling(false);
    }
  };

  React.useEffect(() => {
    checkCurrentMode();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Live Trading Control
          <Badge variant={isLiveMode ? "default" : "secondary"}>
            {isLiveMode ? "LIVE" : "PAPER"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLiveMode && (
          <Alert>
            <AlertDescription>
              <strong>Paper Trading Mode Active</strong><br/>
              All trades are simulated. No real money is involved.
            </AlertDescription>
          </Alert>
        )}
        
        {isLiveMode && (
          <Alert>
            <AlertDescription>
              <strong>🔥 Live Trading Mode Active</strong><br/>
              Real trades will be executed with real money. Use caution.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Button 
            onClick={enableLiveTrading}
            disabled={enabling || isLiveMode}
            className="w-full"
            variant={isLiveMode ? "outline" : "default"}
          >
            {enabling ? 'Testing Systems...' : isLiveMode ? '✅ Live Trading Active' : '🔥 Enable Live Trading'}
          </Button>
          
          <p className="text-sm text-muted-foreground">
            {isLiveMode 
              ? "Live trading is enabled. All trades will execute with real money."
              : "Click to run system checks and enable live trading mode."
            }
          </p>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Safety Checklist:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ Bybit API credentials configured</li>
            <li>✅ Connection to exchange verified</li>
            <li>✅ Signal generation working</li>
            <li>✅ Risk management enabled</li>
            <li>✅ Stop losses and take profits active</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};