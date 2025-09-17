import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { RefreshCw, CheckCircle, XCircle, Play } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

export function TradingSystemTest() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runTradingTests = async () => {
    setTesting(true);
    setTestResults([]);

    const tests = [
      'Connection Test',
      'Balance Check',
      'Test Trade Execution',
      'Position Check'
    ];

    // Initialize test results
    const initialResults = tests.map(name => ({ name, status: 'running' as const }));
    setTestResults(initialResults);

    const updateTest = (index: number, status: TestResult['status'], message?: string, data?: any) => {
      setTestResults(prev => prev.map((test, i) => 
        i === index ? { ...test, status, message, data } : test
      ));
    };

    try {
      // Test 1: Connection Test
      const connectionResult = await TradingGateway.testConnection();
      if (connectionResult.ok) {
        updateTest(0, 'passed', 'Trading gateway connected successfully');
      } else {
        updateTest(0, 'failed', connectionResult.error || connectionResult.message || 'Connection failed');
        
        // If connection fails, mark all subsequent tests as failed
        updateTest(1, 'failed', 'Skipped - connection failed');
        updateTest(2, 'failed', 'Skipped - connection failed');
        updateTest(3, 'failed', 'Skipped - connection failed');
        setTesting(false);
        return;
      }

      // Test 2: Balance Check
      try {
        const balanceResult = await TradingGateway.getBalance();
        if (balanceResult.ok) {
          updateTest(1, 'passed', 'Balance retrieved successfully');
        } else {
          updateTest(1, 'failed', balanceResult.error || 'Balance check failed');
        }
      } catch (error: any) {
        updateTest(1, 'failed', error.message);
      }

      // Test 3: Test Trade Execution
      try {
        const tradeResult = await TradingGateway.execute({
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          leverage: 1,
          scalpMode: true,
          meta: { testTrade: true }
        });

        if (tradeResult.ok) {
          updateTest(2, 'passed', 'Test trade executed successfully');
        } else {
          const errorMsg = tradeResult.message || tradeResult.error || 'Trade execution failed';
          updateTest(2, 'failed', errorMsg);
          
          // Show specific error handling based on error type
          if (tradeResult.error === 'AUTH_REQUIRED') {
            toast({
              title: 'Authentication Required',
              description: 'Please sign in to execute trades.',
              variant: 'destructive'
            });
          } else if (tradeResult.error === 'CREDENTIALS_REQUIRED') {
            toast({
              title: 'API Credentials Required',
              description: 'Please add your Bybit API credentials.',
              variant: 'destructive'
            });
          }
        }
      } catch (error: any) {
        updateTest(2, 'failed', error.message);
      }

      // Test 4: Position Check
      try {
        const positionsResult = await TradingGateway.getPositions();
        if (positionsResult.ok) {
          updateTest(3, 'passed', 'Positions retrieved successfully');
        } else {
          updateTest(3, 'failed', positionsResult.error || 'Position check failed');
        }
      } catch (error: any) {
        updateTest(3, 'failed', error.message);
      }

    } catch (error: any) {
      console.error('Trading test failed:', error);
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
          <Play className="w-5 h-5" />
          Trading System Tests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTradingTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Tests...' : 'Run Trading System Tests'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
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
            ))}
            
            {/* Summary */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                Test Summary: {testResults.filter(t => t.status === 'passed').length} passed, {' '}
                {testResults.filter(t => t.status === 'failed').length} failed
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}