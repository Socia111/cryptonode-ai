import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';

const TradingSystemTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const { toast } = useToast();

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFn();
      
      setResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
      
      toast({
        title: `✅ ${testName} Passed`,
        description: result.message || 'Test completed successfully'
      });
    } catch (error: any) {
      console.error(`❌ Test failed: ${testName}`, error);
      
      setResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message }
      }));
      
      toast({
        title: `❌ ${testName} Failed`,
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const tests = {
    'Connection Test': async () => {
      return await TradingGateway.testConnection();
    },
    'Balance Check': async () => {
      return await TradingGateway.getBalance();
    },
    'Scalp Mode Order ($1)': async () => {
      return await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1,
        leverage: 1,
        scalpMode: true
      });
    },
    'Normal Mode Order ($5)': async () => {
      return await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 5,
        leverage: 1,
        scalpMode: false
      });
    },
    'Symbol Format Test': async () => {
      return await TradingGateway.execute({
        symbol: 'ETH/USDT',
        side: 'Buy', 
        amountUSD: 2,
        leverage: 1
      });
    }
  };

  const runAllTests = async () => {
    for (const [testName, testFn] of Object.entries(tests)) {
      await runTest(testName, testFn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const passedTests = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Trading System Tests</CardTitle>
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          {totalTests > 0 && (
            <Badge variant={passedTests === totalTests ? 'default' : 'destructive'}>
              {passedTests}/{totalTests} tests passed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(tests).map(([testName, testFn]) => (
            <div key={testName} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <span className="font-medium">{testName}</span>
                {results[testName] && (
                  <Badge variant={results[testName].success ? 'default' : 'destructive'}>
                    {results[testName].success ? 'Passed' : 'Failed'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => runTest(testName, testFn)}
                  disabled={loading}
                >
                  Run Test
                </Button>
                {results[testName] && !results[testName].success && (
                  <span className="text-xs text-red-500 max-w-md truncate">
                    {results[testName].error}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {totalTests > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Summary:</h3>
              <p>{passedTests}/{totalTests} tests passed</p>
              {passedTests < totalTests && (
                <p className="text-sm text-muted-foreground mt-1">
                  Check failed tests and ensure proper API configuration.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingSystemTest;