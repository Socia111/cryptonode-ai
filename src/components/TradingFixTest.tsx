import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/components/ui/use-toast';

export function TradingFixTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runTradingTest = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔧 Testing fixed trading execution...');
      
      // Test 1: Connection Test
      const connectionTest = await TradingGateway.testConnection();
      console.log('Connection test:', connectionTest);
      
      if (!connectionTest.ok) {
        throw new Error(`Connection failed: ${connectionTest.error || 'Unknown error'}`);
      }
      
      // Test 2: Small Market Order Test
      const testSymbols = ['BTCUSDT', 'ETHUSDT']; // Use high-liquidity symbols
      const tradeTests = [];
      
      for (const symbol of testSymbols) {
        try {
          console.log(`🚀 Testing ${symbol} execution...`);
          
          const tradeResult = await TradingGateway.execute({
            symbol,
            side: 'Buy',
            amountUSD: 10, // Minimum test size
            leverage: 1
          });
          
          tradeTests.push({
            symbol,
            success: tradeResult.ok,
            result: tradeResult,
            error: tradeResult.ok ? null : tradeResult.message
          });
          
          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          tradeTests.push({
            symbol,
            success: false,
            result: null,
            error: error.message
          });
        }
      }
      
      setTestResults({
        connectionTest,
        tradeTests,
        timestamp: new Date().toISOString(),
        success: tradeTests.some(t => t.success)
      });
      
      // Show toast notification
      const successCount = tradeTests.filter(t => t.success).length;
      if (successCount > 0) {
        toast({
          title: "✅ Trading Fix Test",
          description: `${successCount}/${tradeTests.length} test trades executed successfully`,
        });
      } else {
        toast({
          title: "❌ Trading Fix Test",
          description: "All test trades failed - check results below",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      });
      
      toast({
        title: "❌ Test Error",
        description: error.message,
        variant: "destructive"
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">🔧 Trading System Fix Test</h2>
          <p className="text-sm text-muted-foreground">
            Tests the fixed order execution (no more "reduce-only" errors)
          </p>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={runTradingTest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Testing Fixed System...' : 'Test Fixed Trading System'}
          </Button>
        </div>

        {testResults && (
          <div className="space-y-4">
            {testResults.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Test Failed</p>
                <p className="text-red-600 text-sm">{testResults.error}</p>
              </div>
            ) : (
              <>
                {/* Connection Test Results */}
                <div className={`p-4 border rounded-lg ${testResults.connectionTest.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h3 className={`font-medium mb-2 ${testResults.connectionTest.ok ? 'text-green-800' : 'text-red-800'}`}>
                    🔌 Connection Test
                  </h3>
                  <p className="text-sm">
                    Status: <b>{testResults.connectionTest.ok ? 'CONNECTED' : 'FAILED'}</b>
                  </p>
                  {testResults.connectionTest.data && (
                    <div className="text-xs mt-2 bg-gray-100 p-2 rounded">
                      Trading Enabled: <b>{testResults.connectionTest.data.trading_enabled ? 'YES' : 'NO'}</b>
                    </div>
                  )}
                </div>

                {/* Trade Test Results */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-800">🚀 Order Execution Tests</h3>
                  {testResults.tradeTests.map((test: any, i: number) => (
                    <div key={i} className={`p-4 border rounded-lg ${test.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={test.success ? 'success' : 'destructive'}>
                            {test.symbol}
                          </Badge>
                          <span className="text-sm font-medium">
                            {test.success ? '✅ SUCCESS' : '❌ FAILED'}
                          </span>
                        </div>
                      </div>
                      
                      {test.error && (
                        <p className="text-red-600 text-sm mb-2">{test.error}</p>
                      )}
                      
                      {test.success && test.result?.data && (
                        <div className="text-xs bg-gray-100 p-2 rounded">
                          <div>Main Order ID: <b>{test.result.data.mainOrder?.result?.orderId || 'N/A'}</b></div>
                          {test.result.data.stopLossOrderId && (
                            <div>Stop Loss ID: <b>{test.result.data.stopLossOrderId}</b></div>
                          )}
                          {test.result.data.takeProfitOrderId && (
                            <div>Take Profit ID: <b>{test.result.data.takeProfitOrderId}</b></div>
                          )}
                          {test.result.data.riskManagement && (
                            <div>Risk Management: <b>{test.result.data.riskManagement.riskRewardRatio}</b></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className={`p-4 border rounded-lg ${testResults.success ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <h3 className="font-medium text-blue-800 mb-2">📊 Test Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total Tests: <b>{testResults.tradeTests.length}</b></div>
                    <div>Successful: <b>{testResults.tradeTests.filter((t: any) => t.success).length}</b></div>
                    <div>Failed: <b>{testResults.tradeTests.filter((t: any) => !t.success).length}</b></div>
                    <div>Fix Status: <b>{testResults.success ? 'WORKING' : 'NEEDS MORE FIXES'}</b></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Test completed at {new Date(testResults.timestamp).toLocaleString()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}