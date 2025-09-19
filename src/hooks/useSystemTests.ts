import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemTestResults {
  tradeExecutor: { status: 'pass' | 'fail' | 'running', message: string, details?: any };
  signalGeneration: { status: 'pass' | 'fail' | 'running', message: string, details?: any };
  marketData: { status: 'pass' | 'fail' | 'running', message: string, details?: any };
  authentication: { status: 'pass' | 'fail' | 'running', message: string, details?: any };
}

export function useSystemTests() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SystemTestResults | null>(null);
  const { toast } = useToast();

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    const testResults: SystemTestResults = {
      tradeExecutor: { status: 'running', message: 'Testing...' },
      signalGeneration: { status: 'running', message: 'Testing...' },
      marketData: { status: 'running', message: 'Testing...' },
      authentication: { status: 'running', message: 'Testing...' }
    };
    
    setResults({ ...testResults });

    try {
      // Test 1: Authentication and credentials
      console.log('🔐 Testing authentication...');
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke('aitradex1-trade-executor', {
          body: { action: 'validate_credentials' }
        });

        if (authError) throw authError;

        testResults.authentication = {
          status: authData?.has_credentials ? 'pass' : 'fail',
          message: authData?.has_credentials ? 'Credentials validated' : 'No valid credentials found',
          details: authData
        };
      } catch (error: any) {
        testResults.authentication = {
          status: 'fail',
          message: `Auth test failed: ${error.message}`,
        };
      }

      // Test 2: Market data pipeline
      console.log('📊 Testing market data...');
      try {
        const { data: marketData, error: marketError } = await supabase.functions.invoke('live-bybit-data-feed', {
          body: { symbols: ['BTCUSDT'], test_mode: true }
        });

        if (marketError) throw marketError;

        testResults.marketData = {
          status: 'pass',
          message: `Market data working (${marketData?.data_points || 0} points)`,
          details: marketData
        };
      } catch (error: any) {
        testResults.marketData = {
          status: 'fail',
          message: `Market data test failed: ${error.message}`,
        };
      }

      // Test 3: Signal generation
      console.log('🎯 Testing signal generation...');
      try {
        const { data: signalData, error: signalError } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
          body: { 
            symbols: ['BTCUSDT'], 
            timeframe: '15m',
            test_mode: true 
          }
        });

        if (signalError) throw signalError;

        testResults.signalGeneration = {
          status: 'pass',
          message: `Signal generation working (${signalData?.signals_generated || 0} signals)`,
          details: signalData
        };
      } catch (error: any) {
        testResults.signalGeneration = {
          status: 'fail',
          message: `Signal generation test failed: ${error.message}`,
        };
      }

      // Test 4: Trade execution (dry run)
      console.log('💰 Testing trade executor...');
      try {
        const { data: tradeData, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
          body: { 
            action: 'status'
          }
        });

        if (tradeError) throw tradeError;

        testResults.tradeExecutor = {
          status: tradeData?.status === 'active' ? 'pass' : 'fail',
          message: tradeData?.status === 'active' ? 'Trade executor active' : 'Trade executor inactive',
          details: tradeData
        };
      } catch (error: any) {
        testResults.tradeExecutor = {
          status: 'fail',
          message: `Trade executor test failed: ${error.message}`,
        };
      }

      setResults({ ...testResults });

      // Summary toast
      const passedTests = Object.values(testResults).filter(test => test.status === 'pass').length;
      const totalTests = Object.keys(testResults).length;

      toast({
        title: `🧪 System Tests Complete`,
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('Comprehensive test failed:', error);
      toast({
        title: "❌ System Tests Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickDiagnostic = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-diagnostic', {
        body: { quick: true }
      });

      if (error) throw error;

      toast({
        title: "🔍 Quick Diagnostic Complete",
        description: `System status: ${data?.status || 'unknown'}`,
      });

      return data;
    } catch (error: any) {
      console.error('Quick diagnostic failed:', error);
      toast({
        title: "❌ Diagnostic Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    isRunning,
    results,
    runComprehensiveTests,
    runQuickDiagnostic
  };
}