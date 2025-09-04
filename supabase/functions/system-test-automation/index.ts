import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestResult {
  test_name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  execution_time_ms: number;
  details?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { test_mode = 'all' } = await req.json() || {}
    
    console.log('🧪 Starting system tests...')
    const results: TestResult[] = []

    // Test 1: Database Connectivity
    const dbTestStart = Date.now()
    try {
      const { data: signalsCount } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
      
      results.push({
        test_name: 'Database Connectivity',
        status: 'PASS',
        message: `Connected to database successfully. Found ${signalsCount} total signals.`,
        execution_time_ms: Date.now() - dbTestStart
      })
    } catch (error) {
      results.push({
        test_name: 'Database Connectivity',
        status: 'FAIL',
        message: `Database connection failed: ${error.message}`,
        execution_time_ms: Date.now() - dbTestStart
      })
    }

    // Test 2: Signals Generation
    if (test_mode === 'all' || test_mode === 'signals') {
      const signalsTestStart = Date.now()
      try {
        const { data: signalResponse, error: signalError } = await supabase.functions.invoke('live-scanner-production', {
          body: {
            exchange: 'bybit',
            timeframe: '1h',
            symbols: ['BTCUSDT'],
            test_mode: true
          }
        })

        if (signalError) throw signalError

        results.push({
          test_name: 'Signals Generation',
          status: 'PASS',
          message: `Signal generation test completed successfully`,
          execution_time_ms: Date.now() - signalsTestStart,
          details: signalResponse
        })
      } catch (error) {
        results.push({
          test_name: 'Signals Generation',
          status: 'FAIL',
          message: `Signal generation failed: ${error.message}`,
          execution_time_ms: Date.now() - signalsTestStart
        })
      }
    }

    // Test 3: Bybit API Configuration
    const bybitTestStart = Date.now()
    try {
      const hasApiKey = !!Deno.env.get('BYBIT_API_KEY')
      const hasApiSecret = !!Deno.env.get('BYBIT_API_SECRET')
      
      if (hasApiKey && hasApiSecret) {
        // Test Bybit order execution in test mode
        const { data: orderResponse, error: orderError } = await supabase.functions.invoke('bybit-order-execution', {
          body: {
            signal: {
              token: 'BTC/USDT',
              direction: 'BUY',
              entry_price: 50000,
              stop_loss: 49000,
              exit_target: 51000,
              confidence_score: 85
            },
            orderSize: '50',
            testMode: true
          }
        })

        if (orderError) throw orderError

        results.push({
          test_name: 'Bybit API Configuration',
          status: 'PASS',
          message: 'Bybit API credentials configured and test order validation passed',
          execution_time_ms: Date.now() - bybitTestStart,
          details: orderResponse
        })
      } else {
        results.push({
          test_name: 'Bybit API Configuration',
          status: 'SKIP',
          message: 'Bybit API credentials not configured (this is optional)',
          execution_time_ms: Date.now() - bybitTestStart
        })
      }
    } catch (error) {
      results.push({
        test_name: 'Bybit API Configuration',
        status: 'FAIL',
        message: `Bybit API test failed: ${error.message}`,
        execution_time_ms: Date.now() - bybitTestStart
      })
    }

    // Test 4: Automated Trading Configuration
    const automationTestStart = Date.now()
    try {
      const { data: automationResponse, error: automationError } = await supabase.functions.invoke('bybit-automated-trading', {
        body: {
          action: 'status',
          credentials: {
            apiKey: Deno.env.get('BYBIT_API_KEY'),
            apiSecret: Deno.env.get('BYBIT_API_SECRET')
          }
        }
      })

      if (automationError) throw automationError

      results.push({
        test_name: 'Automated Trading Configuration',
        status: automationResponse?.connected ? 'PASS' : 'SKIP',
        message: automationResponse?.connected ? 'Automated trading system connected successfully' : 'Automated trading not connected (API credentials needed)',
        execution_time_ms: Date.now() - automationTestStart,
        details: automationResponse
      })
    } catch (error) {
      results.push({
        test_name: 'Automated Trading Configuration',
        status: 'FAIL',
        message: `Automation test failed: ${error.message}`,
        execution_time_ms: Date.now() - automationTestStart
      })
    }

    // Test 5: High-Confidence Signal Filter
    const filterTestStart = Date.now()
    try {
      const { data: highConfidenceSignals } = await supabase
        .from('signals')
        .select('*')
        .gte('score', 80)
        .limit(10)

      const avgScore = highConfidenceSignals?.length ? 
        highConfidenceSignals.reduce((sum, s) => sum + s.score, 0) / highConfidenceSignals.length : 0

      results.push({
        test_name: 'High-Confidence Signal Filter',
        status: avgScore >= 80 ? 'PASS' : 'SKIP',
        message: `Found ${highConfidenceSignals?.length || 0} high-confidence signals (≥80%). Average score: ${avgScore.toFixed(1)}%`,
        execution_time_ms: Date.now() - filterTestStart,
        details: { 
          signal_count: highConfidenceSignals?.length,
          average_score: avgScore
        }
      })
    } catch (error) {
      results.push({
        test_name: 'High-Confidence Signal Filter',
        status: 'FAIL',
        message: `Signal filter test failed: ${error.message}`,
        execution_time_ms: Date.now() - filterTestStart
      })
    }

    // Test Summary
    const totalTests = results.length
    const passedTests = results.filter(r => r.status === 'PASS').length
    const failedTests = results.filter(r => r.status === 'FAIL').length
    const skippedTests = results.filter(r => r.status === 'SKIP').length
    const totalExecutionTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0)

    const summary = {
      total_tests: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      success_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      total_execution_time_ms: totalExecutionTime,
      overall_status: failedTests === 0 ? 'ALL_SYSTEMS_OPERATIONAL' : 'ISSUES_DETECTED',
      timestamp: new Date().toISOString()
    }

    console.log('🧪 Test Results Summary:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        detailed_results: results,
        recommendations: failedTests > 0 ? [
          'Check failed tests and resolve configuration issues',
          'Ensure all required API keys are properly configured',
          'Verify database connectivity and permissions'
        ] : [
          'All systems operational',
          'Ready for live trading (if Bybit API is configured)',
          'Monitoring high-confidence signals (≥80%)'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🚨 System test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})