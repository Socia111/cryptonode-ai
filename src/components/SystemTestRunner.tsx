import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TradingGateway } from '@/lib/tradingGateway';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const SystemTestRunner: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  const runTest = async (index: number, testFn: () => Promise<{ success: boolean; message: string; details?: any }>) => {
    updateTest(index, { status: 'pending' });
    try {
      const result = await testFn();
      updateTest(index, {
        status: result.success ? 'success' : 'error',
        message: result.message,
        details: result.details
      });
    } catch (error: any) {
      updateTest(index, {
        status: 'error',
        message: error.message || 'Test failed unexpectedly',
        details: error
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    
    const testDefinitions = [
      {
        name: 'Database Connection',
        test: async () => {
          const { data, error } = await supabase.from('markets').select('id').limit(1);
          return {
            success: !error,
            message: error ? `Database error: ${error.message}` : `Database connected successfully (${data?.length || 0} records accessible)`,
            details: { data, error }
          };
        }
      },
      {
        name: 'Authentication Status',
        test: async () => {
          const { data: { session }, error } = await supabase.auth.getSession();
          return {
            success: !error,
            message: session?.user ? `Authenticated as ${session.user.email}` : 'No active session',
            details: { hasSession: !!session, userId: session?.user?.id, error }
          };
        }
      },
      {
        name: 'Signals Access',
        test: async () => {
          const { data, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          return {
            success: !error,
            message: error ? `Signals error: ${error.message}` : `Signals accessible (${data?.length || 0} recent signals)`,
            details: { count: data?.length, error }
          };
        }
      },
      {
        name: 'Trading Connection',
        test: async () => {
          try {
            const result = await TradingGateway.testConnection();
            return {
              success: result.ok,
              message: result.message || (result.ok ? 'Trading connection successful' : 'Trading connection failed'),
              details: result.data
            };
          } catch (error: any) {
            return {
              success: false,
              message: `Trading connection error: ${error.message}`,
              details: error
            };
          }
        }
      },
      {
        name: 'Trade Executor Function',
        test: async () => {
          try {
            const response = await supabase.functions.invoke('aitradex1-trade-executor', {
              body: { action: 'status' }
            });
            return {
              success: !response.error,
              message: response.error 
                ? `Trade executor error: ${response.error.message}` 
                : `Trade executor operational (${response.data?.status})`,
              details: response.data
            };
          } catch (error: any) {
            return {
              success: false,
              message: `Trade executor function error: ${error.message}`,
              details: error
            };
          }
        }
      },
        {
          name: 'Realtime Subscription',
          test: async (): Promise<{ success: boolean; message: string; details?: any }> => {
            return new Promise((resolve) => {
              const timeout = setTimeout(() => {
                resolve({
                  success: false,
                  message: 'Realtime subscription test timed out',
                  details: { timeout: true }
                });
              }, 5000);

              const channel = supabase
                .channel('test-subscription')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {})
                .subscribe((status) => {
                  clearTimeout(timeout);
                  supabase.removeChannel(channel);
                  resolve({
                    success: status === 'SUBSCRIBED',
                    message: status === 'SUBSCRIBED' 
                      ? 'Realtime subscription successful' 
                      : `Realtime subscription failed: ${status}`,
                    details: { status }
                  });
                });
            });
          }
        }
    ];

    setTests(testDefinitions.map(def => ({
      name: def.name,
      status: 'pending' as const,
      message: 'Waiting to run...'
    })));

    for (let i = 0; i < testDefinitions.length; i++) {
      await runTest(i, testDefinitions[i].test);
    }

    setOverallStatus('completed');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>System Test Runner</span>
          {overallStatus === 'completed' && (
            <Badge variant={errorCount === 0 ? 'default' : 'destructive'}>
              {successCount}/{totalTests} Passed
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Run comprehensive tests to verify all system components are working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning && <Clock className="h-4 w-4 animate-spin" />}
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          {overallStatus === 'completed' && errorCount === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ All systems operational! All {totalTests} tests passed successfully.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {tests.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Test Results</h3>
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground max-w-xs truncate">
                    {test.message}
                  </span>
                  <Badge className={getStatusColor(test.status)}>
                    {test.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {overallStatus === 'completed' && errorCount > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              ❌ {errorCount} test(s) failed. Please review the errors above and check your configuration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};