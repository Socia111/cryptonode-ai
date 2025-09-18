import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function ComprehensiveFixTest() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.findIndex(t => t.name === name);
      const newTest = { name, status, message, details };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTest;
        return updated;
      }
      return [...prev, newTest];
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Authentication Status
    updateTest('Auth Status', 'pending', 'Checking authentication...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      updateTest('Auth Status', 'success', `Authenticated as: ${user?.email}`, { userId: user?.id });
    } catch (error: any) {
      updateTest('Auth Status', 'error', `Auth failed: ${error.message}`);
    }

    // Test 2: Edge Function Syntax Validation
    updateTest('Edge Function Status', 'pending', 'Testing edge function...');
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      if (error) throw error;
      updateTest('Edge Function Status', 'success', 'Edge function deployed and responding', data);
    } catch (error: any) {
      updateTest('Edge Function Status', 'error', `Edge function error: ${error.message}`, error);
    }

    // Test 3: Trading Account Access
    updateTest('Trading Account', 'pending', 'Checking trading account...');
    try {
      const { data: accounts, error } = await supabase
        .rpc('get_user_trading_account', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_account_type: 'testnet'
        });
      
      if (error) throw error;
      
      if (accounts && accounts.length > 0) {
        updateTest('Trading Account', 'success', 'Trading account found', { 
          accountId: accounts[0].id,
          isActive: accounts[0].is_active 
        });
      } else {
        updateTest('Trading Account', 'error', 'No trading account found');
      }
    } catch (error: any) {
      updateTest('Trading Account', 'error', `Account check failed: ${error.message}`);
    }

    // Test 4: Test Mode Trade Execution
    updateTest('Test Trade', 'pending', 'Testing trade execution...');
    try {
      const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'BUY',
          amountUSD: 100,
          testMode: true
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        updateTest('Test Trade', 'success', 'Test trade executed successfully', data);
      } else {
        updateTest('Test Trade', 'error', `Trade failed: ${data?.error}`, data);
      }
    } catch (error: any) {
      updateTest('Test Trade', 'error', `Trade execution error: ${error.message}`, error);
    }

    // Test 5: API Connection Test  
    updateTest('API Connection', 'pending', 'Testing Bybit API connection...');
    try {
      const { data, error } = await supabase.functions.invoke('debug-trading-status', {
        body: { action: 'env_check' }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.bybit?.connected) {
        updateTest('API Connection', 'success', 'Bybit API connected', data.bybit);
      } else {
        updateTest('API Connection', 'error', 'API connection failed', data);
      }
    } catch (error: any) {
      updateTest('API Connection', 'error', `API test failed: ${error.message}`);
    }

    setIsRunning(false);
    
    const errorCount = tests.filter(t => t.status === 'error').length;
    if (errorCount === 0) {
      toast({
        title: "All Tests Passed! 🎉",
        description: "The system is working correctly.",
        variant: "default",
      });
    } else {
      toast({
        title: `${errorCount} Test(s) Failed`,
        description: "Please check the results and fix the issues.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Comprehensive System Test
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="ml-4"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tests.length === 0 && !isRunning && (
          <p className="text-muted-foreground text-center py-8">
            Click "Run All Tests" to start comprehensive system validation
          </p>
        )}
        
        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{test.name}</h3>
              <Badge className={getStatusColor(test.status)}>
                {test.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
            {test.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-blue-600">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        
        {isRunning && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Running comprehensive tests...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}