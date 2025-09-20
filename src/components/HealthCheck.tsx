import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthTest {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  result?: string;
}

const HealthCheck = () => {
  const [tests, setTests] = useState<HealthTest[]>([
    {
      name: 'Database Connection',
      description: 'Test basic database connectivity',
      status: 'pending'
    },
    {
      name: 'Signals Table Access',
      description: 'Check if signals table is accessible',
      status: 'pending'
    },
    {
      name: 'Edge Functions',
      description: 'Test edge function connectivity',
      status: 'pending'
    },
    {
      name: 'Realtime Connection',
      description: 'Test realtime subscription capability',
      status: 'pending'
    }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTestStatus = (index: number, status: HealthTest['status'], result?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, result } : test
    ));
  };

  const runHealthChecks = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' })));

    // Test 1: Database Connection
    updateTestStatus(0, 'running');
    try {
      const { data, error } = await supabase.from('system_status').select('*').limit(1);
      if (error) throw error;
      updateTestStatus(0, 'pass', `Found ${data?.length || 0} records`);
    } catch (error) {
      updateTestStatus(0, 'fail', `Error: ${error}`);
    }

    // Test 2: Signals Table Access
    updateTestStatus(1, 'running');
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('id, symbol, score, created_at')
        .limit(5);
      if (error) throw error;
      updateTestStatus(1, 'pass', `Found ${data?.length || 0} signals`);
    } catch (error) {
      updateTestStatus(1, 'fail', `Error: ${error}`);
    }

    // Test 3: Edge Functions
    updateTestStatus(2, 'running');
    try {
      const { data, error } = await supabase.functions.invoke('simple-test', {
        body: { test: true }
      });
      if (error) throw error;
      updateTestStatus(2, 'pass', 'Edge function responsive');
    } catch (error) {
      updateTestStatus(2, 'fail', `Edge function error: ${error}`);
    }

    // Test 4: Realtime Connection
    updateTestStatus(3, 'running');
    try {
      const channel = supabase.channel('health_test');
      
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 5000);

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve(status);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error(`Channel status: ${status}`));
          }
        });
      });

      await promise;
      updateTestStatus(3, 'pass', 'Realtime connection established');
      supabase.removeChannel(channel);
    } catch (error) {
      updateTestStatus(3, 'fail', `Realtime error: ${error}`);
    }

    setIsRunning(false);
    
    const passedTests = tests.filter(test => test.status === 'pass').length;
    toast({
      title: "Health Check Complete",
      description: `${passedTests}/${tests.length} tests passed`,
      variant: passedTests === tests.length ? "default" : "destructive"
    });
  };

  const getStatusIcon = (status: HealthTest['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: HealthTest['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500">PASS</Badge>;
      case 'fail':
        return <Badge variant="destructive">FAIL</Badge>;
      case 'running':
        return <Badge variant="secondary">RUNNING</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-6 h-6" />
            System Health Check
          </CardTitle>
          <Button 
            onClick={runHealthChecks} 
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tests.map((test, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(test.status)}
              <div>
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-muted-foreground">{test.description}</p>
                {test.result && (
                  <p className="text-xs text-muted-foreground mt-1">{test.result}</p>
                )}
              </div>
            </div>
            {getStatusBadge(test.status)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default HealthCheck;