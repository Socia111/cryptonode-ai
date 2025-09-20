import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { testTradeExecutor, testMockTrade, testDatabaseConnection } from '@/lib/testTrading';
import { testAllSignalSystems, getSignalSystemStatus } from '@/lib/testAllSystems';

export const TradingTest: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const runConnectionTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Testing trade executor connection...');
      
      const result = await testTradeExecutor();
      
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "✅ Connection Test Passed",
          description: "Trade executor is working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Connection Test Failed",
          description: result.error || "Connection failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ ok: false, error: error.message });
      toast({
        title: "❌ Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runDatabaseTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Testing database connection...');
      
      const result = await testDatabaseConnection();
      
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "✅ Database Test Passed",
          description: "Database connection is working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Database Test Failed", 
          description: result.error || "Database connection failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ success: false, error: error.message });
      toast({
        title: "❌ Database Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runMockTrade = async () => {
    setIsTesting(true);
    
    try {
      console.log('🧪 Testing mock trade execution...');
      
      const result = await testMockTrade();
      
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "✅ Mock Trade Successful",
          description: "Trade execution is working correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "❌ Mock Trade Failed",
          description: result.error || "Trade failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ success: false, error: error.message });
      toast({
        title: "❌ Trade Test Error",
        description: error.message || "Test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runComprehensiveTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Running comprehensive signal system test...');
      
      const result = await testAllSignalSystems();
      
      setTestResults(result);
      
      const allWorking = Object.values(result).every((test: any) => 
        test && (test.success || test.error?.includes('blocked'))
      );
      
      if (allWorking) {
        toast({
          title: "✅ All Systems Working",
          description: "Signal generation systems are operating correctly",
          variant: "default",
        });
      } else {
        toast({
          title: "⚠️ Some Issues Found", 
          description: "Check results for details",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({ ok: false, error: error.message });
      toast({
        title: "❌ Test Error",
        description: error.message || "Comprehensive test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🧪 Trading System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={runConnectionTest}
            disabled={isTesting}
            className="w-full"
            variant="outline"
          >
            {isTesting ? "Testing..." : "Test System Status"}
          </Button>

          <Button 
            onClick={runDatabaseTest}
            disabled={isTesting}
            className="w-full"
            variant="outline"
          >
            {isTesting ? "Testing..." : "Test Database"}
          </Button>
          
          <Button 
            onClick={runMockTrade} 
            disabled={isTesting}
            className="w-full"
            variant="outline"
          >
            {isTesting ? "Testing..." : "Test Mock Trade"}
          </Button>
          
          <Button 
            onClick={runComprehensiveTest} 
            disabled={isTesting}
            className="w-full"
            variant="default"
          >
            {isTesting ? "Testing..." : "🧪 Test All Signal Systems"}
          </Button>
        </div>
        
        {testResults && (
          <div className="mt-4 p-3 border rounded text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};