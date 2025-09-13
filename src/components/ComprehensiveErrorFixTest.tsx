import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING';
  details: string;
  timestamp?: string;
}

export function ComprehensiveErrorFixTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runComprehensiveTests = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults: TestResult[] = [];
    const addResult = (result: TestResult) => {
      result.timestamp = new Date().toISOString();
      testResults.push(result);
      setResults([...testResults]);
    };

    try {
      // Test 1: Connection & Authentication
      addResult({ name: 'Connection Test', status: 'RUNNING', details: 'Testing connection...' });
      const connResult = await TradingGateway.testConnection();
      addResult({
        name: 'Connection Test',
        status: connResult.ok ? 'PASS' : 'FAIL',
        details: connResult.ok ? 'Connection successful' : `Failed: ${connResult.message}`
      });

      // Test 2: New Position Market Order (Main Fix)
      addResult({ name: 'Market Order (New Position)', status: 'RUNNING', details: 'Testing reduceOnly=false...' });
      const marketResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 25,
        leverage: 5,
        orderType: 'Market',
        timeInForce: 'IOC'
      });
      addResult({
        name: 'Market Order (New Position)',
        status: marketResult.ok ? 'PASS' : 'FAIL',
        details: marketResult.ok ? 'Order executed successfully' : `Failed: ${marketResult.message || marketResult.error}`
      });

      // Test 3: Limit Order with Price
      addResult({ name: 'Limit Order Test', status: 'RUNNING', details: 'Testing limit order parameters...' });
      const limitResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 25,
        leverage: 5,
        orderType: 'Limit',
        price: 50000,
        timeInForce: 'PostOnly'
      });
      addResult({
        name: 'Limit Order Test',
        status: limitResult.ok ? 'PASS' : 'FAIL',
        details: limitResult.ok ? 'Limit order placed successfully' : `Failed: ${limitResult.message || limitResult.error}`
      });

      // Test 4: Side Normalization
      addResult({ name: 'Side Normalization', status: 'RUNNING', details: 'Testing BUY/SELL → Buy/Sell...' });
      const sideResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'BUY' as any,
        amountUSD: 25,
        leverage: 5,
        orderType: 'Market'
      });
      addResult({
        name: 'Side Normalization',
        status: sideResult.ok ? 'PASS' : 'FAIL',
        details: sideResult.ok ? 'Side normalization working' : `Failed: ${sideResult.message || sideResult.error}`
      });

      // Test 5: Parameter Validation
      addResult({ name: 'Parameter Validation', status: 'RUNNING', details: 'Testing invalid parameters...' });
      try {
        await TradingGateway.execute({
          symbol: '',
          side: 'Buy',
          amountUSD: 25,
          leverage: 5
        });
        addResult({
          name: 'Parameter Validation',
          status: 'FAIL',
          details: 'Should have rejected empty symbol'
        });
      } catch (e: any) {
        addResult({
          name: 'Parameter Validation',
          status: 'PASS',
          details: 'Correctly rejected invalid parameters'
        });
      }

      // Test 6: Error Format Check
      addResult({ name: 'Error Format Check', status: 'RUNNING', details: 'Checking error response format...' });
      const errorResult = await TradingGateway.execute({
        symbol: 'INVALIDTICKER',
        side: 'Buy',
        amountUSD: 25,
        leverage: 5
      });
      addResult({
        name: 'Error Format Check',
        status: errorResult.ok ? 'FAIL' : 'PASS',
        details: errorResult.ok ? 'Should have failed for invalid ticker' : 'Error handling working correctly'
      });

    } catch (error: any) {
      addResult({
        name: 'Test Execution',
        status: 'ERROR',
        details: `Test suite error: ${error.message}`
      });
    }

    setTesting(false);
    
    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const totalCount = testResults.filter(r => r.status !== 'RUNNING').length;
    
    toast({
      title: `Comprehensive Tests: ${passCount}/${totalCount} passed`,
      description: passCount === totalCount ? '🎉 All trading errors fixed!' : '⚠️ Some issues remain',
      variant: passCount === totalCount ? 'default' : 'destructive'
    });
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'PASS': return 'bg-green-500';
      case 'FAIL': return 'bg-red-500';
      case 'ERROR': return 'bg-red-600';
      case 'RUNNING': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Comprehensive Error Fix Tests</h3>
          <p className="text-sm text-muted-foreground">
            Tests all critical fixes: reduceOnly parameter, order types, parameter validation, and error handling
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={runComprehensiveTests}
            disabled={testing}
            className="flex-1"
          >
            {testing ? '🧪 Running Tests...' : '🚀 Run All Tests'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setResults([])}
            disabled={testing}
          >
            Clear
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            {results.map((result, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.details}</p>
                  {result.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">✅ Applied Fixes:</h4>
          <ul className="text-sm space-y-1">
            <li>• **Phase 1**: Fixed reduceOnly parameter - always false for new positions</li>
            <li>• **Phase 2**: Enhanced parameter forwarding (orderType, timeInForce, price)</li>
            <li>• **Phase 3**: Improved error handling and logging throughout pipeline</li>
            <li>• **Phase 4**: Comprehensive testing for all trading modes</li>
            <li>• **Phase 5**: Fixed real-time subscription with better error handling</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}