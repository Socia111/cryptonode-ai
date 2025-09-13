import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TradingGateway } from '@/lib/tradingGateway';
import { TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

export function TradingTest() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: TestResult[] = [
      { test: 'Connection Test', status: 'running' },
      { test: 'Balance Check', status: 'running' },
      { test: 'Scalp Mode Order ($5)', status: 'running' },
      { test: 'Normal Mode Order ($10)', status: 'running' },
      { test: 'Symbol Format Test', status: 'running' }
    ];

    setResults([...tests]);

    // Test 1: Connection
    try {
      const connection = await TradingGateway.testConnection();
      tests[0] = {
        test: 'Connection Test',
        status: connection.ok ? 'passed' : 'failed',
        message: connection.ok ? 'API connection successful' : 'API connection failed',
        data: connection
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[0] = {
        test: 'Connection Test',
        status: 'failed',
        message: error.message
      };
      setResults([...tests]);
    }

    // Test 2: Balance
    try {
      const balance = await TradingGateway.getBalance();
      tests[1] = {
        test: 'Balance Check',
        status: balance.ok ? 'passed' : 'failed',
        message: balance.ok ? `Balance: $${balance.data?.availableBalance || 'N/A'}` : 'Balance check failed',
        data: balance.data
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[1] = {
        test: 'Balance Check',
        status: 'failed',
        message: error.message
      };
      setResults([...tests]);
    }

    // Test 3: Scalp Mode Test Order
    try {
      const scalpTest = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 5, // Use $5 to meet Bybit minimum
        leverage: 5,
        scalpMode: true
      });
      
      tests[2] = {
        test: 'Scalp Mode Order ($5)',
        status: scalpTest.ok ? 'passed' : 'failed',
        message: scalpTest.ok ? 'Scalp order validated' : scalpTest.message || 'Scalp order failed',
        data: scalpTest.data
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[2] = {
        test: 'Scalp Mode Order ($5)',
        status: 'failed',
        message: error.message
      };
      setResults([...tests]);
    }

    // Test 4: Normal Mode Test Order
    try {
      const normalTest = await TradingGateway.execute({
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 10, // Use $10 for normal mode
        leverage: 5,
        scalpMode: false
      });
      
      tests[3] = {
        test: 'Normal Mode Order ($10)',
        status: normalTest.ok ? 'passed' : 'failed',
        message: normalTest.ok ? 'Normal order validated' : normalTest.message || 'Normal order failed',
        data: normalTest.data
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[3] = {
        test: 'Normal Mode Order ($10)',
        status: 'failed',
        message: error.message
      };
      setResults([...tests]);
    }

    // Test 5: Symbol Format Test
    try {
      const symbolTest = await TradingGateway.execute({
        symbol: 'BTC/USDT', // Test with slash format
        side: 'Buy',
        amountUSD: 5, // Use $5 minimum
        leverage: 5,
        scalpMode: true
      });
      
      tests[4] = {
        test: 'Symbol Format Test',
        status: symbolTest.ok ? 'passed' : 'failed',
        message: symbolTest.ok ? 'Symbol format handled correctly' : symbolTest.message || 'Symbol format failed',
        data: symbolTest.data
      };
      setResults([...tests]);
    } catch (error: any) {
      tests[4] = {
        test: 'Symbol Format Test',
        status: 'failed',
        message: error.message
      };
      setResults([...tests]);
    }

    setIsRunning(false);
    
    const passedTests = tests.filter(t => t.status === 'passed').length;
    const totalTests = tests.length;
    
    toast({
      title: 'Trading Tests Complete',
      description: `${passedTests}/${totalTests} tests passed`,
      variant: passedTests === totalTests ? 'default' : 'destructive'
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running...</Badge>;
      case 'passed':
        return <Badge className="bg-green-500 hover:bg-green-600">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Trading System Tests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={isRunning} className="w-full">
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.test}</div>
                    {result.message && (
                      <div className="text-sm text-muted-foreground">
                        {result.message}
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && !isRunning && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <strong>Summary:</strong> {results.filter(r => r.status === 'passed').length}/{results.length} tests passed
            </div>
            {results.some(r => r.status === 'failed') && (
              <div className="text-sm text-red-600 mt-1">
                Check failed tests and ensure proper API configuration.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}