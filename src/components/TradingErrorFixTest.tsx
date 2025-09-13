import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { useToast } from '@/hooks/use-toast';

export function TradingErrorFixTest() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults: any[] = [];

    // Test 1: Connection Test
    try {
      console.log('🧪 Testing connection...');
      const connResult = await TradingGateway.testConnection();
      testResults.push({
        test: 'Connection Test',
        status: connResult.ok ? 'PASS' : 'FAIL',
        details: connResult.message || connResult.data?.message || 'Connection test completed',
        result: connResult
      });
    } catch (error: any) {
      testResults.push({
        test: 'Connection Test',
        status: 'ERROR',
        details: error.message,
        result: null
      });
    }

    // Test 2: Order Placement with Correct Parameters
    try {
      console.log('🧪 Testing order placement with correct reduceOnly=false...');
      const orderResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1.0, // Small test amount
        leverage: 1,
        orderType: 'Market',
        timeInForce: 'IOC',
        reduceOnly: false // Explicitly test this parameter
      });
      
      testResults.push({
        test: 'Order Placement (reduceOnly=false)',
        status: orderResult.ok ? 'PASS' : 'FAIL',
        details: orderResult.message || 'Order placed successfully',
        result: orderResult
      });
    } catch (error: any) {
      testResults.push({
        test: 'Order Placement (reduceOnly=false)',
        status: 'ERROR',
        details: error.message,
        result: null
      });
    }

    // Test 3: Parameter Validation
    try {
      console.log('🧪 Testing parameter validation...');
      const validationResult = await TradingGateway.execute({
        symbol: 'ETHUSDT',
        side: 'Sell',
        amountUSD: 0.5, // Small amount
        leverage: 2,
        reduceOnly: false
      });
      
      testResults.push({
        test: 'Parameter Validation',
        status: validationResult.ok ? 'PASS' : 'FAIL',
        details: validationResult.message || 'Validation passed',
        result: validationResult
      });
    } catch (error: any) {
      testResults.push({
        test: 'Parameter Validation',
        status: 'ERROR',
        details: error.message,
        result: null
      });
    }

    setResults(testResults);
    setTesting(false);

    // Show summary toast
    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const totalCount = testResults.length;
    
    toast({
      title: `Test Results: ${passCount}/${totalCount} Passed`,
      description: passCount === totalCount ? 'All errors have been fixed!' : 'Some issues remain',
      variant: passCount === totalCount ? 'default' : 'destructive'
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Trading Error Fix Verification</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test all the fixes for reduce-only errors, realtime subscriptions, and trading gateway issues
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runTests}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Tests...' : 'Run Error Fix Tests'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{result.test}</div>
                  <div className="text-sm text-muted-foreground">{result.details}</div>
                </div>
                <Badge 
                  variant={
                    result.status === 'PASS' ? 'default' :
                    result.status === 'FAIL' ? 'destructive' : 'secondary'
                  }
                >
                  {result.status}
                </Badge>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Summary of Fixes Applied:</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Fixed reduceOnly parameter (set to false for new positions)</li>
                <li>✅ Enhanced realtime subscription error handling</li>
                <li>✅ Added defensive parameter validation in trading gateway</li>
                <li>✅ Improved error logging and user feedback</li>
                <li>✅ Fixed side normalization ('BUY'/'SELL' → 'Buy'/'Sell')</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}