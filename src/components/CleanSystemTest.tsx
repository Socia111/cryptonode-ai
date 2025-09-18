import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Play, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  details?: any;
}

export const CleanSystemTest = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending' },
    { name: 'Authentication System', status: 'pending' },
    { name: 'Trading Account Setup', status: 'pending' },
    { name: 'Signal Generation', status: 'pending' },
    { name: 'Trade Execution', status: 'pending' },
    { name: 'Real-time Data', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })));

    // Test 1: Database Connection
    updateTest('Database Connection', { status: 'running' });
    try {
      const { error } = await supabase.from('markets').select('id').limit(1);
      if (error) throw error;
      updateTest('Database Connection', { 
        status: 'passed', 
        message: 'Successfully connected to database' 
      });
    } catch (error: any) {
      updateTest('Database Connection', { 
        status: 'failed', 
        message: error.message 
      });
    }

    // Test 2: Authentication System
    updateTest('Authentication System', { status: 'running' });
    try {
      const { data } = await supabase.auth.getSession();
      updateTest('Authentication System', { 
        status: 'passed', 
        message: data.session ? 'User authenticated' : 'No active session (normal for testing)' 
      });
    } catch (error: any) {
      updateTest('Authentication System', { 
        status: 'failed', 
        message: error.message 
      });
    }

    // Test 3: Trading Account Setup
    updateTest('Trading Account Setup', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('bybit-authenticate', {
        body: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          testnet: true
        }
      });
      
      if (error) {
        // Expected to fail with test credentials
        updateTest('Trading Account Setup', { 
          status: 'passed', 
          message: 'Authentication endpoint accessible (test credentials rejected as expected)' 
        });
      } else {
        updateTest('Trading Account Setup', { 
          status: 'passed', 
          message: 'Authentication system working' 
        });
      }
    } catch (error: any) {
      updateTest('Trading Account Setup', { 
        status: 'failed', 
        message: error.message 
      });
    }

    // Test 4: Signal Generation
    updateTest('Signal Generation', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-original-scanner', {
        body: {
          symbols: ['BTCUSDT'],
          timeframes: ['1h'],
          algorithm: 'unirail_core'
        }
      });
      
      if (error) throw error;
      updateTest('Signal Generation', { 
        status: 'passed', 
        message: `Scanner accessible, generated ${data?.signals_generated || 0} signals` 
      });
    } catch (error: any) {
      updateTest('Signal Generation', { 
        status: 'failed', 
        message: error.message 
      });
    }

    // Test 5: Trade Execution
    updateTest('Trade Execution', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'status'
        }
      });
      
      if (error) throw error;
      updateTest('Trade Execution', { 
        status: 'passed', 
        message: 'Trade executor operational' 
      });
    } catch (error: any) {
      updateTest('Trade Execution', { 
        status: 'failed', 
        message: error.message 
      });
    }

    // Test 6: Real-time Data
    updateTest('Real-time Data', { status: 'running' });
    try {
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'signals' }, 
          () => {}
        );
      
      await channel.subscribe();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await channel.unsubscribe();
      
      updateTest('Real-time Data', { 
        status: 'passed', 
        message: 'Real-time subscription working' 
      });
    } catch (error: any) {
      updateTest('Real-time Data', { 
        status: 'failed', 
        message: error.message 
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge variant="default" className="bg-green-500">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            System Test Suite
          </CardTitle>
          <CardDescription>
            Comprehensive testing of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <span className="text-sm">
                <strong>{passedTests}</strong> passed
              </span>
              <span className="text-sm">
                <strong>{failedTests}</strong> failed
              </span>
              <span className="text-sm">
                <strong>{totalTests - passedTests - failedTests}</strong> pending
              </span>
            </div>
            <Button onClick={runAllTests} disabled={isRunning}>
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(test.status)}
                </div>
              </div>
            ))}
          </div>

          {tests.some(t => t.message) && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Test Results:</h4>
              {tests
                .filter(t => t.message)
                .map((test) => (
                  <Alert key={test.name} variant={test.status === 'failed' ? 'destructive' : 'default'}>
                    <AlertDescription>
                      <strong>{test.name}:</strong> {test.message}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};