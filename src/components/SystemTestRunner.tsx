import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

export function SystemTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, duration?: number) => {
    setResults(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runSystemTests = async () => {
    setIsRunning(true);
    
    const tests: TestResult[] = [
      { test: 'Database Connection', status: 'pending', message: 'Waiting...' },
      { test: 'Signal Generation', status: 'pending', message: 'Waiting...' },
      { test: 'Trade Executor', status: 'pending', message: 'Waiting...' },
      { test: 'Market Data Feed', status: 'pending', message: 'Waiting...' },
      { test: 'Authentication System', status: 'pending', message: 'Waiting...' }
    ];
    
    setResults(tests);

    try {
      // Test 1: Database Connection
      updateTestResult('Database Connection', 'running', 'Testing connection...');
      const start1 = Date.now();
      
      const { data: signalsTest, error: signalsError } = await supabase
        .from('signals')
        .select('id')
        .limit(1);
        
      if (signalsError) {
        updateTestResult('Database Connection', 'failed', `Database error: ${signalsError.message}`);
      } else {
        updateTestResult('Database Connection', 'passed', 'Database connection successful', Date.now() - start1);
      }

      // Test 2: Signal Generation
      updateTestResult('Signal Generation', 'running', 'Testing signal retrieval...');
      const start2 = Date.now();
      
      const { data: recentSignals, error: signalError } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 75)
        .eq('is_active', true)
        .limit(5);
        
      if (signalError) {
        updateTestResult('Signal Generation', 'failed', `Signal error: ${signalError.message}`);
      } else {
        updateTestResult('Signal Generation', 'passed', `Found ${recentSignals?.length || 0} active signals`, Date.now() - start2);
      }

      // Test 3: Trade Executor
      updateTestResult('Trade Executor', 'running', 'Testing trade executor...');
      const start3 = Date.now();
      
      try {
        const { data: executorTest, error: executorError } = await supabase.functions.invoke('aitradex1-trade-executor', {
          body: { action: 'status' }
        });
        
        if (executorError) {
          updateTestResult('Trade Executor', 'failed', `Executor error: ${executorError.message}`);
        } else if (executorTest?.success) {
          updateTestResult('Trade Executor', 'passed', 'Trade executor is active', Date.now() - start3);
        } else {
          updateTestResult('Trade Executor', 'failed', 'Trade executor returned invalid response');
        }
      } catch (error: any) {
        updateTestResult('Trade Executor', 'failed', `Executor error: ${error.message}`);
      }

      // Test 4: Market Data Feed
      updateTestResult('Market Data Feed', 'running', 'Testing market data...');
      const start4 = Date.now();
      
      const { data: marketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .limit(5);
        
      if (marketError) {
        updateTestResult('Market Data Feed', 'failed', `Market data error: ${marketError.message}`);
      } else {
        updateTestResult('Market Data Feed', 'passed', `Found ${marketData?.length || 0} recent market updates`, Date.now() - start4);
      }

      // Test 5: Authentication System
      updateTestResult('Authentication System', 'running', 'Testing authentication...');
      const start5 = Date.now();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        updateTestResult('Authentication System', 'failed', `Auth error: ${authError.message}`);
      } else if (user) {
        updateTestResult('Authentication System', 'passed', `User authenticated: ${user.email}`, Date.now() - start5);
      } else {
        updateTestResult('Authentication System', 'failed', 'No authenticated user found');
      }

      // Summary
      const finalResults = results.filter(r => r.status !== 'pending');
      const passed = finalResults.filter(r => r.status === 'passed').length;
      const failed = finalResults.filter(r => r.status === 'failed').length;
      
      toast({
        title: "🏁 System Tests Complete",
        description: `Passed: ${passed}, Failed: ${failed}`,
        variant: failed === 0 ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('System test error:', error);
      toast({
        title: "❌ System Test Error",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsRunning(false);
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500">✅ Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">❌ Failed</Badge>;
      case 'running':
        return <Badge variant="secondary">🔄 Running</Badge>;
      default:
        return <Badge variant="outline">⏳ Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔧 System Test Runner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runSystemTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Running Tests..." : "🚀 Run System Tests"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result) => (
              <div 
                key={result.test}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.test}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {result.message}
                    {result.duration && ` (${result.duration}ms)`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}