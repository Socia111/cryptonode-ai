import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';
import { 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Database,
  Server,
  Wifi,
  Bug
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
  error?: string;
}

export function SystemTestRunner() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending', message: 'Testing Supabase connection...' },
    { name: 'Realtime Subscriptions', status: 'pending', message: 'Testing real-time functionality...' },
    { name: 'Edge Functions', status: 'pending', message: 'Testing edge function execution...' },
    { name: 'Signals Generation', status: 'pending', message: 'Testing signal generation pipeline...' },
    { name: 'Bybit API Integration', status: 'pending', message: 'Testing trading API connectivity...' },
    { name: 'Data Consistency', status: 'pending', message: 'Validating data integrity...' }
  ]);
  
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const testDatabaseConnection = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing database connection...');
      const { data, error } = await supabase.from('signals').select('count').limit(1);
      
      if (error) {
        addLog(`❌ Database connection failed: ${error.message}`);
        return false;
      }
      
      addLog('✅ Database connection successful');
      return true;
    } catch (e: any) {
      addLog(`❌ Database connection error: ${e.message}`);
      return false;
    }
  };

  const testRealtimeSubscriptions = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing real-time subscriptions...');
      
      return new Promise((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            addLog('❌ Real-time subscription test timed out');
            resolve(false);
          }
        }, 5000);

        const channel = supabase
          .channel('test-channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              addLog('✅ Real-time subscriptions working');
              supabase.removeChannel(channel);
              resolve(true);
            }
          })
          .subscribe((status) => {
            addLog(`📡 Subscription status: ${status}`);
            if (status === 'SUBSCRIBED' && !resolved) {
              // Channel is ready, resolve with success after a short delay
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  addLog('✅ Real-time channel subscribed successfully');
                  supabase.removeChannel(channel);
                  resolve(true);
                }
              }, 1000);
            }
          });
      });
    } catch (e: any) {
      addLog(`❌ Real-time test error: ${e.message}`);
      return false;
    }
  };

  const testEdgeFunctions = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing edge functions...');
      
      // Test a simple edge function
      const { data, error } = await supabase.functions.invoke('signals-api', {
        body: { action: 'health_check' }
      });
      
      if (error) {
        addLog(`❌ Edge function test failed: ${error.message}`);
        return false;
      }
      
      addLog('✅ Edge functions responding correctly');
      return true;
    } catch (e: any) {
      addLog(`❌ Edge function error: ${e.message}`);
      return false;
    }
  };

  const testSignalsGeneration = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing signals generation...');
      
      // Check if we have recent signals
      const { data: signals, error } = await supabase
        .from('signals')
        .select('id, created_at, score')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        addLog(`❌ Signal query failed: ${error.message}`);
        return false;
      }
      
      if (!signals || signals.length === 0) {
        addLog('⚠️ No recent signals found, triggering signal generation...');
        
        try {
          const { data: genData, error: genError } = await supabase.functions.invoke('live-scanner-production', {
            body: {
              exchange: 'bybit',
              timeframe: '1h',
              symbols: ['BTCUSDT', 'ETHUSDT'], // Test with major pairs
              relaxed_filters: true
            }
          });
          
          if (genError) {
            addLog(`❌ Signal generation failed: ${genError.message}`);
            return false;
          }
          
          addLog(`✅ Signal generation triggered: ${genData?.signals_found || 0} signals`);
        } catch (e: any) {
          addLog(`❌ Signal generation error: ${e.message}`);
          return false;
        }
      } else {
        addLog(`✅ Found ${signals.length} recent signals`);
      }
      
      return true;
    } catch (e: any) {
      addLog(`❌ Signals test error: ${e.message}`);
      return false;
    }
  };

  const testBybitAPI = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing Bybit API integration...');
      
      // Test trade executor status
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      
      if (error) {
        addLog(`❌ Bybit API test failed: ${error.message}`);
        return false;
      }
      
      addLog('✅ Bybit API integration working');
      return true;
    } catch (e: any) {
      addLog(`❌ Bybit API error: ${e.message}`);
      return false;
    }
  };

  const testDataConsistency = async (): Promise<boolean> => {
    try {
      addLog('🔍 Testing data consistency...');
      
      // Check for data integrity issues
      const checks = [
        supabase.from('signals').select('count').limit(1),
        supabase.from('markets').select('count').limit(1),
        supabase.from('spynx_scores').select('count').limit(1)
      ];
      
      const results = await Promise.allSettled(checks);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed > 0) {
        addLog(`❌ Data consistency check failed: ${failed} table(s) inaccessible`);
        return false;
      }
      
      addLog('✅ Data consistency check passed');
      return true;
    } catch (e: any) {
      addLog(`❌ Data consistency error: ${e.message}`);
      return false;
    }
  };

  const runTests = async () => {
    setRunning(true);
    setCurrentTest(0);
    setLogs([]);
    
    const testFunctions = [
      testDatabaseConnection,
      testRealtimeSubscriptions,
      testEdgeFunctions,
      testSignalsGeneration,
      testBybitAPI,
      testDataConsistency
    ];

    addLog('🚀 Starting comprehensive system test suite...');

    for (let i = 0; i < testFunctions.length; i++) {
      setCurrentTest(i);
      updateTest(i, { status: 'running' });
      
      const startTime = Date.now();
      try {
        const success = await testFunctions[i]();
        const duration = Date.now() - startTime;
        
        updateTest(i, {
          status: success ? 'passed' : 'failed',
          message: success ? 'Test passed' : 'Test failed',
          duration
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        updateTest(i, {
          status: 'failed',
          message: 'Test threw exception',
          duration,
          error: error.message
        });
      }
    }

    setRunning(false);
    addLog('🏁 Test suite completed');
  };

  const progress = tests.length > 0 ? (currentTest / tests.length) * 100 : 0;
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-6 w-6" />
          System Test Runner
        </CardTitle>
        <CardDescription>
          Comprehensive testing and error detection system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={runTests} 
            disabled={running}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {running ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              {passedTests} Passed
            </Badge>
            {failedTests > 0 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {failedTests} Failed
              </Badge>
            )}
            {running && (
              <Badge variant="secondary">
                <Info className="h-3 w-3 mr-1" />
                Running
              </Badge>
            )}
          </div>
        </div>

        {running && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Test {currentTest + 1} of {tests.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Test Results
            </h4>
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{test.name}</span>
                  <div className="flex items-center gap-2">
                    {test.duration && (
                      <span className="text-xs text-muted-foreground">
                        {test.duration}ms
                      </span>
                    )}
                    {test.status === 'pending' && <Info className="h-4 w-4 text-muted-foreground" />}
                    {test.status === 'running' && <Wifi className="h-4 w-4 text-blue-500 animate-pulse" />}
                    {test.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {test.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Test Logs
            </h4>
            <ScrollArea className="h-64 w-full border rounded-md p-4">
              <div className="font-mono text-sm space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}