import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
  error?: string;
}

const ComprehensiveSystemTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Simple Test Function', status: 'pending' },
    { name: 'Database Connection Test', status: 'pending' },
    { name: 'Mock Trade Execution', status: 'pending' },
    { name: 'Markets Table Access', status: 'pending' },
    { name: 'Edge Event Log Access', status: 'pending' },
    { name: 'System Status Access', status: 'pending' },
    { name: 'API Keys Table Access', status: 'pending' },
    { name: 'Generate Test Signals', status: 'pending' },
    { name: 'Fetch Active Signals', status: 'pending' },
    { name: 'Real-time Signals Subscription', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTestStatus = (index: number, status: TestResult['status'], message?: string, data?: any, error?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, data, error } : test
    ));
  };

  const runComprehensiveTests = async () => {
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
        updateTestStatus(0, 'passed', 'Function working correctly', data);
      } catch (err: any) {
        updateTestStatus(0, 'failed', 'Function failed', null, err.message);
      }

      // Test 2: Database Connection Test
      updateTestStatus(1, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('simple-test', {
          body: { action: 'db_test' }
        });
        
        if (error) throw error;
        updateTestStatus(1, 'passed', 'Database connection successful', data);
      } catch (err: any) {
        updateTestStatus(1, 'failed', 'Database connection failed', null, err.message);
      }

      // Test 3: Mock Trade Execution
      updateTestStatus(2, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('simple-test', {
          body: { action: 'mock_trade' }
        });
        
        if (error) throw error;
        updateTestStatus(2, 'passed', 'Mock trade executed successfully', data);
      } catch (err: any) {
        updateTestStatus(2, 'failed', 'Mock trade execution failed', null, err.message);
      }

      // Test 4: Markets Table Access
      updateTestStatus(3, 'running');
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('symbol, status')
          .limit(5);

        if (error) throw error;
        updateTestStatus(3, 'passed', `Found ${data?.length || 0} markets`, { count: data?.length || 0 });
      } catch (err: any) {
        updateTestStatus(3, 'failed', 'Markets table access failed', null, err.message);
      }

      // Test 5: Edge Event Log Access
      updateTestStatus(4, 'running');
      try {
        const { data, error } = await supabase
          .from('edge_event_log')
          .select('fn, stage')
          .limit(5);

        if (error) throw error;
        updateTestStatus(4, 'passed', `Found ${data?.length || 0} log entries`, { count: data?.length || 0 });
      } catch (err: any) {
        updateTestStatus(4, 'failed', 'Edge event log access failed', null, err.message);
      }

      // Test 6: System Status Access
      updateTestStatus(5, 'running');
      try {
        const { data, error } = await supabase
          .from('system_status')
          .select('service_name, status')
          .limit(5);

        if (error) throw error;
        updateTestStatus(5, 'passed', `Found ${data?.length || 0} system services`, { count: data?.length || 0 });
      } catch (err: any) {
        updateTestStatus(5, 'failed', 'System status access failed', null, err.message);
      }

      // Test 7: API Keys Table Access
      updateTestStatus(6, 'running');
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('service, is_active')
          .limit(5);

        if (error) throw error;
        updateTestStatus(6, 'passed', `Found ${data?.length || 0} API keys`, { count: data?.length || 0 });
      } catch (err: any) {
        updateTestStatus(6, 'failed', 'API keys table access failed', null, err.message);
      }

      // Test 8: Generate Test Signals
      updateTestStatus(7, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('test-signal-generation');
        
        if (error) throw error;
        updateTestStatus(7, 'passed', 'Test signals generated successfully', data);
      } catch (err: any) {
        updateTestStatus(7, 'failed', 'Test signal generation failed', null, err.message);
      }

      // Test 9: Fetch Active Signals
      updateTestStatus(8, 'running');
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .eq('is_active', true)
          .gte('score', 60)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        updateTestStatus(8, 'passed', `Found ${data?.length || 0} active signals`, { count: data?.length || 0, signals: data });
      } catch (err: any) {
        updateTestStatus(8, 'failed', 'Signals fetch failed', null, err.message);
      }

      // Test 10: Real-time Subscription
      updateTestStatus(9, 'running');
      try {
        const channel = supabase
          .channel('test-signals-channel')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'signals' },
            (payload) => console.log('Real-time signal received:', payload)
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              updateTestStatus(9, 'passed', 'Real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
              updateTestStatus(9, 'failed', 'Real-time subscription failed');
            }
          });

        // Clean up after 3 seconds
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 3000);
      } catch (err: any) {
        updateTestStatus(9, 'failed', 'Real-time subscription failed', null, err.message);
      }

      // Show completion toast
      setTimeout(() => {
        const passedTests = tests.filter(t => t.status === 'passed').length;
        const totalTests = tests.length;
        
        toast({
          title: "System Tests Complete",
          description: `${passedTests}/${totalTests} tests passed`,
          variant: passedTests === totalTests ? "default" : "destructive"
        });
      }, 5000);

    } finally {
      setTimeout(() => setIsRunning(false), 5000);
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
      case 'passed': return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">PASS</Badge>;
      case 'failed': return <Badge variant="destructive">FAIL</Badge>;
      case 'running': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">RUNNING</Badge>;
      default: return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;
  const runningCount = tests.filter(t => t.status === 'running').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Comprehensive System Tests</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {passedCount > 0 && (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                {passedCount} Passed
              </Badge>
            )}
            {runningCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                {runningCount} Running
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
          onClick={runComprehensiveTests}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running System Tests...
            </>
          ) : (
            'Run Comprehensive System Test'
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
                  {test.error && (
                    <p className="text-sm text-red-600">{test.error}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(test.status)}
            </div>
          ))}
        </div>

        {tests.some(t => t.data) && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h5 className="font-medium mb-2">Test Results Summary:</h5>
            <div className="text-xs space-y-1">
              {tests.filter(t => t.data).map((test, index) => (
                <div key={index}>
                  <strong>{test.name}:</strong> {JSON.stringify(test.data, null, 2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComprehensiveSystemTest;