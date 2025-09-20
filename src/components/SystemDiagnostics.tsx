import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

const SystemDiagnostics: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Simple Test Function', status: 'pending' },
    { name: 'Database Connection', status: 'pending' },
    { name: 'Mock Trade Test', status: 'pending' },
    { name: 'Real-time Subscription', status: 'pending' },
    { name: 'Markets Table Access', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTestStatus = (index: number, status: TestResult['status'], message?: string, data?: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, data } : test
    ));
  };

  const runTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' })));

    try {
      // Test 1: Simple Test Function
      updateTestStatus(0, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('simple-test', {
          body: { action: 'status' }
        });
        
        if (error) throw error;
        updateTestStatus(0, 'passed', 'Function responded successfully', data);
      } catch (err: any) {
        updateTestStatus(0, 'failed', err.message);
      }

      // Test 2: Database Connection
      updateTestStatus(1, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('simple-test', {
          body: { action: 'db_test' }
        });
        
        if (error) throw error;
        updateTestStatus(1, 'passed', 'Database connection successful', data);
      } catch (err: any) {
        updateTestStatus(1, 'failed', err.message);
      }

      // Test 3: Mock Trade Test
      updateTestStatus(2, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('simple-test', {
          body: { action: 'mock_trade' }
        });
        
        if (error) throw error;
        updateTestStatus(2, 'passed', 'Mock trade executed successfully', data);
      } catch (err: any) {
        updateTestStatus(2, 'failed', err.message);
      }

      // Test 4: Real-time Subscription
      updateTestStatus(3, 'running');
      try {
        const channel = supabase
          .channel('test-channel')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'signals' },
            (payload) => console.log('Realtime test:', payload)
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              updateTestStatus(3, 'passed', 'Real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              updateTestStatus(3, 'failed', 'Real-time subscription failed');
            }
          });

        // Clean up after 2 seconds
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 2000);
      } catch (err: any) {
        updateTestStatus(3, 'failed', err.message);
      }

      // Test 5: Markets Table Access
      updateTestStatus(4, 'running');
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('symbol, status')
          .limit(1);

        if (error) throw error;
        updateTestStatus(4, 'passed', 'Markets table accessible', { count: data?.length || 0 });
      } catch (err: any) {
        updateTestStatus(4, 'failed', err.message);
      }

      // Show completion toast
      const passedTests = tests.filter(t => t.status === 'passed').length;
      const totalTests = tests.length;
      
      toast({
        title: "Diagnostics Complete",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <Badge variant="default" className="bg-green-100 text-green-800">PASS</Badge>;
      case 'failed': return <Badge variant="destructive">FAIL</Badge>;
      case 'running': return <Badge variant="secondary">RUNNING</Badge>;
      default: return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>System Diagnostics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {passedCount > 0 && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                {passedCount} Passed
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive">
                {failedCount} Failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Full System Test'
          )}
        </Button>

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <div>
                  <h4 className="font-medium">{test.name}</h4>
                  {test.message && (
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(test.status)}
            </div>
          ))}
        </div>

        {tests.some(t => t.data) && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h5 className="font-medium mb-2">Test Results:</h5>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(tests.filter(t => t.data).map(t => ({ name: t.name, data: t.data })), null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemDiagnostics;