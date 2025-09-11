import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TestTube, CheckCircle2, XCircle, AlertTriangle, Loader2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export const TestnetTradeTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSymbol, setTestSymbol] = useState('BTCUSDT');
  const [testAmount, setTestAmount] = useState('10');
  const [testSide, setTestSide] = useState<'Buy' | 'Sell'>('Buy');
  const { toast } = useToast();

  const runFullTestSequence = async () => {
    setIsLoading(true);
    setTestResults([]);
    const results: TestResult[] = [];

    try {
      // Test 1: Check Bybit connection status
      const statusResult = await testBybitStatus();
      results.push(statusResult);

      if (!statusResult.success) {
        toast({
          title: "Connection Failed ❌",
          description: "Fix API credentials before testing trades",
          variant: "destructive"
        });
        setTestResults(results);
        setIsLoading(false);
        return;
      }

      // Test 2: Check account balance
      const balanceResult = await testAccountBalance();
      results.push(balanceResult);

      // Test 3: Small test trade (only if testnet)
      if (statusResult.data?.isTestnet) {
        const tradeResult = await testSmallTrade();
        results.push(tradeResult);
      } else {
        results.push({
          success: false,
          error: "NOT ON TESTNET - Live trading test skipped for safety",
          timestamp: new Date().toISOString()
        });
      }

      const successCount = results.filter(r => r.success).length;
      toast({
        title: successCount === results.length ? "All Tests Passed ✅" : "Some Tests Failed ❌",
        description: `${successCount}/${results.length} tests successful`,
        variant: successCount === results.length ? "default" : "destructive"
      });

    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testBybitStatus = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: { action: 'status' }
      });

      if (error) throw error;

      return {
        success: data.success,
        data: {
          isTestnet: data.testMode,
          baseUrl: data.data?.environment?.baseUrl,
          connected: data.data?.connectivity?.connected,
          hasCredentials: data.data?.environment?.hasApiKey && data.data?.environment?.hasApiSecret
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
        timestamp: new Date().toISOString()
      };
    }
  };

  const testAccountBalance = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: { action: 'balance' }
      });

      if (error) throw error;

      const balance = data.data?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT');
      
      return {
        success: data.success,
        data: {
          usdtBalance: balance?.walletBalance || '0',
          availableBalance: balance?.availableToWithdraw || '0'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Balance check failed",
        timestamp: new Date().toISOString()
      };
    }
  };

  const testSmallTrade = async (): Promise<TestResult> => {
    try {
      const signal = {
        symbol: testSymbol,
        side: testSide,
        orderType: 'Market' as const,
        qty: testAmount,
        timeInForce: 'IOC' as const
      };

      const { data, error } = await supabase.functions.invoke('bybit-live-trading', {
        body: { 
          action: 'place_order', 
          signal,
          testMode: true,
          idempotencyKey: `test-${Date.now()}`
        }
      });

      if (error) throw error;

      return {
        success: data.success,
        data: {
          orderId: data.data?.orderId,
          symbol: signal.symbol,
          side: signal.side,
          qty: signal.qty,
          status: data.data?.orderStatus,
          price: data.data?.price
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Test trade failed",
        timestamp: new Date().toISOString()
      };
    }
  };

  const getTestIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Testnet Trading Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Safety First:</strong> This will only execute trades on Bybit Testnet. 
            Ensure BYBIT_BASE is set to testnet URL and LIVE_TRADING_ENABLED is false.
          </AlertDescription>
        </Alert>

        {/* Test Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Select value={testSymbol} onValueChange={setTestSymbol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="side">Side</Label>
            <Select value={testSide} onValueChange={(value: 'Buy' | 'Sell') => setTestSide(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="amount">Quantity</Label>
            <Input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              placeholder="0.001"
              step="0.001"
            />
          </div>
        </div>

        <Button 
          onClick={runFullTestSequence} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Full Testnet Test
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results</h3>
            
            {testResults.map((result, index) => {
              const testNames = ['Bybit Connection', 'Account Balance', 'Test Trade'];
              return (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getTestIcon(result)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{testNames[index]}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                    
                    {result.success && result.data && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {index === 0 && (
                          <>
                            <p>🌐 Environment: {result.data.isTestnet ? 'Testnet ✅' : 'MAINNET ⚠️'}</p>
                            <p>🔗 Connected: {result.data.connected ? 'Yes' : 'No'}</p>
                            <p>🔑 Credentials: {result.data.hasCredentials ? 'Valid' : 'Missing'}</p>
                          </>
                        )}
                        {index === 1 && (
                          <>
                            <p>💰 USDT Balance: {result.data.usdtBalance}</p>
                            <p>💸 Available: {result.data.availableBalance}</p>
                          </>
                        )}
                        {index === 2 && (
                          <>
                            <p>📋 Order ID: {result.data.orderId}</p>
                            <p>🎯 {result.data.side} {result.data.qty} {result.data.symbol}</p>
                            <p>✅ Status: {result.data.status}</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Safety Checklist */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Pre-Live Trading Checklist</h4>
          <div className="text-sm space-y-1">
            <p>✅ All testnet tests pass</p>
            <p>✅ API credentials work correctly</p>
            <p>✅ Orders execute as expected</p>
            <p>✅ Balance updates properly</p>
            <p>⚠️ Ready to switch BYBIT_BASE to mainnet</p>
            <p>⚠️ Ready to set LIVE_TRADING_ENABLED=true</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};