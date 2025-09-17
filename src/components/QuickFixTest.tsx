import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { RefreshCw, CheckCircle, XCircle, Bug } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed';
  message?: string;
  details?: any;
}

export function QuickFixTest() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runQuickTests = async () => {
    setTesting(true);
    setTestResults([]);

    const tests = [
      'Payload Serialization',
      'Connection Test', 
      'Symbol Validation (BTCUSDT)',
      'Test Trade Execution'
    ];

    // Initialize test results
    const initialResults = tests.map(name => ({ name, status: 'running' as const }));
    setTestResults(initialResults);

    const updateTest = (index: number, status: TestResult['status'], message?: string, details?: any) => {
      setTestResults(prev => prev.map((test, i) => 
        i === index ? { ...test, status, message, details } : test
      ));
    };

    try {
      // Test 1: Payload Serialization
      const testParams = {
        symbol: 'BTCUSDT',
        side: 'Buy' as const,
        amountUSD: 10,
        leverage: 1,
        price: undefined,
        stopLoss: undefined,
        takeProfit: undefined
      };

      const payload = JSON.stringify({
        action: 'place_order',
        ...testParams,
        meta: {}
      });

      const hasUndefinedObjects = payload.includes('"_type":"undefined"');
      
      updateTest(0, 
        hasUndefinedObjects ? 'failed' : 'passed', 
        hasUndefinedObjects ? 'Undefined values not properly filtered' : 'Payload clean',
        { payloadLength: payload.length, hasUndefinedObjects }
      );

      // Test 2: Connection Test
      const connectionResult = await TradingGateway.testConnection();
      updateTest(1, 
        connectionResult.ok ? 'passed' : 'failed',
        connectionResult.ok ? 'Connected successfully' : connectionResult.error || 'Connection failed',
        connectionResult
      );

      if (!connectionResult.ok) {
        updateTest(2, 'failed', 'Skipped - connection failed');
        updateTest(3, 'failed', 'Skipped - connection failed');
        setTesting(false);
        return;
      }

      // Test 3: Symbol Validation with test trade
      const symbolTestResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1,
        leverage: 1,
        scalpMode: true,
        meta: { testRun: true, timestamp: Date.now() }
      });

      if (symbolTestResult.ok) {
        updateTest(2, 'passed', 'Symbol validation successful');
      } else {
        updateTest(2, 'failed', 
          symbolTestResult.message || symbolTestResult.error || 'Symbol validation failed',
          symbolTestResult
        );
      }

      // Test 4: Full test trade execution
      const tradeResult = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 5,
        leverage: 1,
        orderType: 'Market',
        scalpMode: false,
        meta: { fullTest: true, timestamp: Date.now() }
      });

      if (tradeResult.ok) {
        updateTest(3, 'passed', 'Test trade completed successfully');
      } else {
        updateTest(3, 'failed',
          tradeResult.message || tradeResult.error || 'Trade execution failed',
          tradeResult
        );
      }

    } catch (error: any) {
      console.error('Quick test failed:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      running: 'default',
      passed: 'default', 
      failed: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Quick Fix Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runQuickTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Fix Tests...' : 'Test All Fixes'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((test, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                    {getStatusBadge(test.status)}
                  </div>
                  {test.message && (
                    <div className="text-sm text-muted-foreground max-w-md text-right">
                      {test.message}
                    </div>
                  )}
                </div>
                
                {test.details && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap max-h-20 overflow-y-auto">
                      {typeof test.details === 'string' ? test.details : JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            
            {/* Summary */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                Fix Test Summary: {testResults.filter(t => t.status === 'passed').length} passed, {' '}
                {testResults.filter(t => t.status === 'failed').length} failed
              </div>
              {testResults.filter(t => t.status === 'passed').length === testResults.length && (
                <div className="text-sm text-green-600 mt-1">
                  ✅ All fixes working! Trading system should be operational.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}