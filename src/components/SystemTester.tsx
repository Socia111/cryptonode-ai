import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SystemTester() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runComprehensiveTest = async () => {
    setTesting(true);
    setResults(null);
    
    const testResults = {
      tradeExecutorFix: null,
      signalGeneration: null,
      autoRefresh: null,
      sampleTrade: null
    };

    try {
      // Test 1: Check trade executor status
      console.log('🧪 Testing trade executor...');
      try {
        const { data: tradeStatus, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
          body: { action: 'status' }
        });
        
        testResults.tradeExecutorFix = {
          status: tradeError ? 'fail' : 'pass',
          message: tradeError ? tradeError.message : `Trade executor active: ${tradeStatus?.status}`,
          data: tradeStatus
        };
      } catch (error: any) {
        testResults.tradeExecutorFix = {
          status: 'fail',
          message: error.message
        };
      }

      // Test 2: Trigger signal generation
      console.log('🧪 Testing signal generation...');
      try {
        const { data: signalData, error: signalError } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
          body: { symbols: ['BTCUSDT', 'ETHUSDT'], test_mode: true }
        });
        
        testResults.signalGeneration = {
          status: signalError ? 'fail' : 'pass',
          message: signalError ? signalError.message : `Signals generated successfully`,
          data: signalData
        };
      } catch (error: any) {
        testResults.signalGeneration = {
          status: 'fail',
          message: error.message
        };
      }

      // Test 3: Auto refresh system
      console.log('🧪 Testing auto refresh...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke('auto-refresh-system-trigger', {
          body: { test_mode: true }
        });
        
        testResults.autoRefresh = {
          status: refreshError ? 'fail' : 'pass',
          message: refreshError ? refreshError.message : `Auto refresh working`,
          data: refreshData
        };
      } catch (error: any) {
        testResults.autoRefresh = {
          status: 'fail',
          message: error.message
        };
      }

      // Test 4: Sample trade execution (validation only)
      console.log('🧪 Testing sample trade validation...');
      try {
        const { data: tradeData, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
          body: { 
            action: 'validate_credentials'
          }
        });
        
        testResults.sampleTrade = {
          status: tradeError ? 'fail' : 'pass',
          message: tradeError ? tradeError.message : `Trade validation working`,
          data: tradeData
        };
      } catch (error: any) {
        testResults.sampleTrade = {
          status: 'fail',
          message: error.message
        };
      }

      setResults(testResults);

      // Summary
      const passedTests = Object.values(testResults).filter((test: any) => test?.status === 'pass').length;
      const totalTests = Object.keys(testResults).length;

      toast({
        title: `🧪 System Test Complete`,
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('Test suite failed:', error);
      toast({
        title: "❌ Test Suite Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 System Tests</CardTitle>
        <CardDescription>Comprehensive system testing and validation</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveTest}
          disabled={testing}
          className="w-full"
        >
          {testing ? '🧪 Testing...' : '🧪 Run Complete System Test'}
        </Button>

        {results && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            
            {Object.entries(results).map(([testName, result]: [string, any]) => (
              <div key={testName} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">
                    {testName.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    result?.status === 'pass' ? 'bg-green-100 text-green-800' :
                    result?.status === 'fail' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {result?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{result?.message || 'No message'}</p>
                {result?.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">View Details</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}