import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2, Database, Server, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface TestSuite {
  name: string;
  icon: React.ReactNode;
  tests: TestResult[];
  overall: 'pending' | 'success' | 'error';
}

const FullSystemTest = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const { toast } = useToast();

  const updateTestResult = (suiteIndex: number, testIndex: number, result: Partial<TestResult>) => {
    setTestSuites(prev => {
      const newSuites = [...prev];
      newSuites[suiteIndex].tests[testIndex] = { ...newSuites[suiteIndex].tests[testIndex], ...result };
      
      // Update overall status
      const allTests = newSuites[suiteIndex].tests;
      if (allTests.every(t => t.status === 'success')) {
        newSuites[suiteIndex].overall = 'success';
      } else if (allTests.some(t => t.status === 'error')) {
        newSuites[suiteIndex].overall = 'error';
      }
      
      return newSuites;
    });
  };

  const runDatabaseTests = async () => {
    const suiteIndex = 0;
    const tables = ['profiles', 'markets', 'signals', 'strategy_signals', 'trades', 'trading_accounts', 'portfolios', 'positions', 'orders', 'exchanges'];
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const testStart = Date.now();
      
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        const duration = Date.now() - testStart;
        
        if (error) {
          updateTestResult(suiteIndex, i, {
            status: 'error',
            message: `Error: ${error.message}`,
            duration
          });
        } else {
          updateTestResult(suiteIndex, i, {
            status: 'success',
            message: `Connected successfully (${data?.length || 0} rows)`,
            duration
          });
        }
      } catch (err) {
        updateTestResult(suiteIndex, i, {
          status: 'error',
          message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
          duration: Date.now() - testStart
        });
      }
    }
  };

  const runEdgeFunctionTests = async () => {
    const suiteIndex = 1;
    const functions = [
      { name: 'aitradex1-trade-executor', testData: { action: 'status' } },
      { name: 'live-scanner-production', testData: { symbol: 'BTCUSDT', timeframe: '1h' } },
      { name: 'signals-api', testData: { action: 'health' } }
    ];
    
    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      const testStart = Date.now();
      
      try {
        const { data, error } = await supabase.functions.invoke(func.name, {
          body: func.testData
        });
        const duration = Date.now() - testStart;
        
        if (error) {
          updateTestResult(suiteIndex, i, {
            status: 'error',
            message: `Error: ${error.message}`,
            duration
          });
        } else {
          updateTestResult(suiteIndex, i, {
            status: 'success',
            message: `Function responded successfully`,
            duration
          });
        }
      } catch (err) {
        updateTestResult(suiteIndex, i, {
          status: 'error',
          message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
          duration: Date.now() - testStart
        });
      }
    }
  };

  const runAPIConnectionTests = async () => {
    const suiteIndex = 2;
    const apis = [
      { name: 'Bybit Market Data', url: 'https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT' },
      { name: 'Supabase Health', url: `https://codhlwjogfjywmjyjbbn.supabase.co/rest/v1/` },
      { name: 'Real-time Connection', test: 'websocket' }
    ];
    
    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      const testStart = Date.now();
      
      try {
        if (api.test === 'websocket') {
          // Test Supabase realtime
          const channel = supabase.channel('test-channel');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            channel.subscribe((status) => {
              clearTimeout(timeout);
              if (status === 'SUBSCRIBED') {
                resolve(status);
              } else {
                reject(new Error(`Status: ${status}`));
              }
            });
          });
          supabase.removeChannel(channel);
          
          updateTestResult(suiteIndex, i, {
            status: 'success',
            message: 'Realtime connection established',
            duration: Date.now() - testStart
          });
        } else {
          const response = await fetch(api.url!, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              ...(api.name === 'Supabase Health' && {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
              })
            }
          });
          
          const duration = Date.now() - testStart;
          
          if (response.ok) {
            updateTestResult(suiteIndex, i, {
              status: 'success',
              message: `Status: ${response.status} ${response.statusText}`,
              duration
            });
          } else {
            updateTestResult(suiteIndex, i, {
              status: 'error',
              message: `HTTP Error: ${response.status} ${response.statusText}`,
              duration
            });
          }
        }
      } catch (err) {
        updateTestResult(suiteIndex, i, {
          status: 'error',
          message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
          duration: Date.now() - testStart
        });
      }
    }
  };

  const initializeTests = () => {
    const initialSuites: TestSuite[] = [
      {
        name: 'Database Tables',
        icon: <Database className="w-5 h-5" />,
        overall: 'pending',
        tests: [
          { name: 'profiles', status: 'pending' },
          { name: 'markets', status: 'pending' },
          { name: 'signals', status: 'pending' },
          { name: 'strategy_signals', status: 'pending' },
          { name: 'trades', status: 'pending' },
          { name: 'trading_accounts', status: 'pending' },
          { name: 'portfolios', status: 'pending' },
          { name: 'positions', status: 'pending' },
          { name: 'orders', status: 'pending' },
          { name: 'exchanges', status: 'pending' }
        ]
      },
      {
        name: 'Edge Functions',
        icon: <Server className="w-5 h-5" />,
        overall: 'pending',
        tests: [
          { name: 'aitradex1-trade-executor', status: 'pending' },
          { name: 'live-scanner-production', status: 'pending' },
          { name: 'signals-api', status: 'pending' }
        ]
      },
      {
        name: 'API Connections',
        icon: <Activity className="w-5 h-5" />,
        overall: 'pending',
        tests: [
          { name: 'Bybit Market Data', status: 'pending' },
          { name: 'Supabase Health', status: 'pending' },
          { name: 'Real-time Connection', status: 'pending' }
        ]
      }
    ];
    
    setTestSuites(initialSuites);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setStartTime(Date.now());
    initializeTests();
    
    try {
      await runDatabaseTests();
      await runEdgeFunctionTests();
      await runAPIConnectionTests();
      
      setEndTime(Date.now());
      
      toast({
        title: "System Test Complete",
        description: "All tests have been executed. Check results below.",
      });
    } catch (error) {
      toast({
        title: "Test Suite Error",
        description: "An error occurred while running tests.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOverallStats = () => {
    const totalTests = testSuites.reduce((acc, suite) => acc + suite.tests.length, 0);
    const passedTests = testSuites.reduce((acc, suite) => 
      acc + suite.tests.filter(test => test.status === 'success').length, 0);
    const failedTests = testSuites.reduce((acc, suite) => 
      acc + suite.tests.filter(test => test.status === 'error').length, 0);
    
    return { totalTests, passedTests, failedTests };
  };

  const stats = getOverallStats();
  const totalDuration = endTime - startTime;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-primary" />
              <span>Full System Test Suite</span>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="min-w-[120px]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Overall Statistics */}
          {testSuites.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalTests}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center p-4 bg-green-100/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.passedTests}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-4 bg-red-100/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.failedTests}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 bg-blue-100/20 rounded-lg">
                <div className="text-2xl font-bold">{totalDuration > 0 ? `${(totalDuration / 1000).toFixed(1)}s` : '-'}</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>
          )}

          {/* Test Suites */}
          <div className="space-y-4">
            {testSuites.map((suite, suiteIndex) => (
              <Card key={suite.name} className="border-l-4" 
                    style={{
                      borderLeftColor: suite.overall === 'success' ? '#22c55e' : 
                                     suite.overall === 'error' ? '#ef4444' : '#6b7280'
                    }}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center space-x-2">
                      {suite.icon}
                      <span>{suite.name}</span>
                    </div>
                    <Badge variant={suite.overall === 'success' ? 'default' : 
                                   suite.overall === 'error' ? 'destructive' : 'secondary'}>
                      {suite.overall === 'success' ? 'All Passed' : 
                       suite.overall === 'error' ? 'Some Failed' : 'Pending'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suite.tests.map((test, testIndex) => (
                      <div key={test.name} 
                           className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(test.status)}
                          <span className="font-medium text-sm">{test.name}</span>
                        </div>
                        <div className="text-right">
                          {test.duration && (
                            <div className="text-xs text-muted-foreground">
                              {test.duration}ms
                            </div>
                          )}
                          {test.message && (
                            <div className={`text-xs mt-1 ${
                              test.status === 'error' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {test.message.length > 30 ? 
                                `${test.message.substring(0, 30)}...` : 
                                test.message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FullSystemTest;