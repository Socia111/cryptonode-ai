import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { TradeControls } from './TradeControls';
import { supabase } from '@/integrations/supabase/client';
import { Play, User, Wallet, Activity } from 'lucide-react';

export function TradeExecutionTest() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [lastResult, setLastResult] = useState<any>(null);

  const checkAuthentication = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setAuthStatus(`Authenticated as ${session.user.email}`);
        return true;
      } else {
        setAuthStatus('Not authenticated - please sign in');
        return false;
      }
    } catch (error: any) {
      setAuthStatus(`Auth error: ${error.message}`);
      return false;
    }
  };

  const testConnection = async () => {
    const isAuth = await checkAuthentication();
    
    if (!isAuth) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to test trading connection",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await TradingGateway.testConnection();
      setIsConnected(result.ok);
      setLastResult(result);
      
      toast({
        title: result.ok ? "Connection Successful" : "Connection Failed",
        description: result.ok ? "Trading API is responsive" : result.error || "Connection test failed",
        variant: result.ok ? "default" : "destructive",
      });
    } catch (error: any) {
      setIsConnected(false);
      setLastResult({ error: error.message });
      
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTradeExecution = async (params: { amountUSD: number; leverage: number; scalpMode?: boolean }) => {
    console.log('🎯 Trade execution initiated:', params);
    
    try {
      const result = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'BUY',
        ...params
      });
      
      setLastResult(result);
      
      if (result.ok) {
        toast({
          title: "Trade Executed Successfully",
          description: `BUY BTCUSDT - $${params.amountUSD} (${params.leverage}x)`,
          variant: "default",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: result.message || 'Trade execution failed',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Trade execution error:', error);
      setLastResult({ error: error.message });
      
      toast({
        title: "Trade Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    checkAuthentication();
  }, []);

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={authStatus.includes('Authenticated') ? 'default' : 'destructive'}>
              {authStatus.includes('Authenticated') ? 'Connected' : 'Disconnected'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">{authStatus}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              API Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isConnected === true ? 'default' : isConnected === false ? 'destructive' : 'secondary'}>
              {isConnected === true ? 'Online' : isConnected === false ? 'Offline' : 'Unknown'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected === true ? 'API responsive' : isConnected === false ? 'API unavailable' : 'Not tested'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Trading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={lastResult?.ok ? 'default' : lastResult ? 'destructive' : 'secondary'}>
              {lastResult?.ok ? 'Ready' : lastResult ? 'Error' : 'Pending'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {lastResult?.ok ? 'Last trade successful' : lastResult ? 'Last trade failed' : 'No trades executed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Connection Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testConnection} className="w-full mb-4">
            <Play className="w-4 h-4 mr-2" />
            Test API Connection
          </Button>
          
          {lastResult && (
            <div className="p-3 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Trade Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Live Trade Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TradeControls
            symbol="BTCUSDT"
            side="Buy"
            markPrice={45000}
            onExecute={handleTradeExecution}
          />
        </CardContent>
      </Card>
    </div>
  );
}