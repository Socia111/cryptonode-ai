import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';

export const TradingConnectionTest = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const runConnectionTest = async () => {
    setIsTesting(true);
    try {
      const result = await TradingGateway.testConnection();
      setLastResult(result);
      
      if (result.ok) {
        toast({
          title: "Connection Test Passed ✅",
          description: "Trading system is ready for execution",
          variant: "default"
        });
      } else {
        let errorMessage = "Connection failed";
        
        // Enhanced error mapping
        if (result.status === 401 || result.status === 403) {
          errorMessage = "Authentication failed - please log in";
        } else if (result.status === 404) {
          errorMessage = "Trading executor not deployed or misconfigured";
        } else if (result.status >= 500) {
          errorMessage = "Server error - check function logs";
        } else if (result.error?.includes('10004')) {
          errorMessage = "Bybit signature error - check API keys and system time";
        } else if (result.error?.includes('10005')) {
          errorMessage = "Bybit permission denied - enable trading in API settings";
        } else if (result.error?.includes('10003')) {
          errorMessage = "Invalid Bybit API key";
        } else if (result.error) {
          errorMessage = result.error;
        }
        
        toast({
          title: "Connection Test Failed ❌",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setLastResult({ ok: false, error: errorMessage });
      
      toast({
        title: "Connection Test Error ❌", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runTradeTest = async () => {
    setIsTesting(true);
    try {
      const result = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'BUY',
        notionalUSD: 10
      });
      
      if (result.ok) {
        toast({
          title: "Test Trade Executed ✅",
          description: "Demo order placed successfully",
          variant: "default"
        });
      } else {
        // Enhanced error handling for specific Bybit codes
        let errorMessage = result.message || "Trade execution failed";
        
        if (result.code === 'DISABLED') {
          errorMessage = "Auto-trading is disabled in feature flags";
        } else if (result.message?.includes('10004')) {
          errorMessage = "Bybit signature mismatch - check API keys and system time";
        } else if (result.message?.includes('10005')) {
          errorMessage = "Bybit permissions missing - enable trading in API settings";
        } else if (result.message?.includes('110004')) {
          errorMessage = "Insufficient balance for this trade";
        } else if (result.message?.includes('110001')) {
          errorMessage = "Order quantity too small for this symbol";
        } else if (result.message?.includes('Below min notional')) {
          errorMessage = "Order value below exchange minimum ($5)";
        }
        
        toast({
          title: "Test Trade Failed ❌",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Test Trade Error ❌",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runConnectionTest} 
            disabled={isTesting}
            variant="outline"
            size="sm"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          
          <Button 
            onClick={runTradeTest} 
            disabled={isTesting}
            size="sm"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Trade'
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {lastResult.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={lastResult.ok ? "default" : "destructive"}>
                {lastResult.ok ? "PASSED" : "FAILED"}
              </Badge>
            </div>
            
            {lastResult.data && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show response details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(lastResult.data, null, 2)}
                </pre>
              </details>
            )}
            
            {lastResult.error && (
              <p className="text-sm text-red-600 mt-2">{lastResult.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};