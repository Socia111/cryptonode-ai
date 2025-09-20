import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

const TestSignalGenerator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Enhanced Signal Generation', status: 'pending' },
    { name: 'AItradeX1 Scanner', status: 'pending' },
    { name: 'Database Insert Test', status: 'pending' },
    { name: 'Signals Validation', status: 'pending' }
  ]);
  const { toast } = useToast();

  const updateTestStatus = (index: number, status: TestResult['status'], message?: string, data?: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, data } : test
    ));
  };

  const runSignalTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' })));

    try {
      // Test 1: Enhanced Signal Generation
      updateTestStatus(0, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
          body: { 
            timeframes: ['15m', '1h'],
            force: true,
            test_mode: true
          }
        });
        
        if (error) throw error;
        updateTestStatus(0, 'passed', `Generated ${data?.signals_generated || 0} signals`, data);
      } catch (err: any) {
        updateTestStatus(0, 'failed', err.message);
      }

      // Test 2: AItradeX1 Scanner
      updateTestStatus(1, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
          body: { test_mode: true }
        });
        
        if (error) throw error;
        updateTestStatus(1, 'passed', 'Scanner executed successfully', data);
      } catch (err: any) {
        updateTestStatus(1, 'failed', err.message);
      }

      // Test 3: Database Insert Test (using secure edge function)
      updateTestStatus(2, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('secure-signal-test', {
          body: { action: 'test_insert' }
        });
        
        if (error) throw error;
        updateTestStatus(2, 'passed', data.message, data.data);
      } catch (err: any) {
        updateTestStatus(2, 'failed', err.message);
      }

      // Test 4: Signals Validation (using secure edge function)
      updateTestStatus(3, 'running');
      try {
        const { data, error } = await supabase.functions.invoke('secure-signal-test', {
          body: { action: 'validate_signals' }
        });
        
        if (error) throw error;
        updateTestStatus(3, 'passed', data.message, data.data);
      } catch (err: any) {
        updateTestStatus(3, 'failed', err.message);
      }

      // Show completion toast
      const passedTests = tests.filter(t => t.status === 'passed').length;
      const totalTests = tests.length;
      
      toast({
        title: "Signal Generation Tests Complete",
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
      default: return <PlayCircle className="h-4 w-4 text-gray-400" />;
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
            <PlayCircle className="h-5 w-5" />
            <span>Signal Generation Tests</span>
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
          onClick={runSignalTests}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Signal Tests...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Signal Generation Tests
            </>
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

export default TestSignalGenerator;