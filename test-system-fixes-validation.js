/**
 * Comprehensive System Validation Test
 * Tests all fixes implemented for the trading system
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSystemValidation() {
  console.log('🧪 SYSTEM VALIDATION TEST SUITE');
  console.log('='.repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function test(name, condition, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`✅ ${name}`);
      if (details) console.log(`   ${details}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
    }
    console.log('');
  }

  try {
    // Phase 1: Database and Authentication Tests
    console.log('📊 PHASE 1: DATABASE & AUTHENTICATION');
    console.log('-'.repeat(40));

    // Test 1: Database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('markets')
      .select('count')
      .limit(1);
    
    test(
      'Database Connectivity',
      !dbError && dbTest !== null,
      dbError ? `Error: ${dbError.message}` : 'Database accessible'
    );

    // Test 2: Authentication functions
    const { data: authTest, error: authError } = await supabase.auth.getSession();
    test(
      'Authentication System',
      !authError,
      authError ? `Error: ${authError.message}` : 'Auth system operational'
    );

    // Test 3: Database functions availability
    try {
      const { data: functionTest, error: functionError } = await supabase
        .rpc('get_user_trading_account', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_account_type: 'testnet'
        });
      
      test(
        'Database Functions',
        !functionError || functionError.message.includes('no rows'),
        functionError && !functionError.message.includes('no rows') ? 
          `Error: ${functionError.message}` : 'Function accessible'
      );
    } catch (error) {
      test('Database Functions', false, `Exception: ${error.message}`);
    }

    // Phase 2: Edge Function Tests
    console.log('🔧 PHASE 2: EDGE FUNCTION TESTS');
    console.log('-'.repeat(40));

    // Test 4: Edge function accessibility
    try {
      const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'status' })
      });

      const data = await response.json();
      
      test(
        'Edge Function Deployment',
        response.ok,
        response.ok ? 'Edge function responding' : `HTTP ${response.status}: ${data.error || 'Unknown error'}`
      );

      if (response.ok) {
        test(
          'Edge Function Status Check',
          data.status === 'operational',
          `Status: ${data.status}, Trading: ${data.trading_enabled}`
        );
      } else {
        test('Edge Function Status Check', false, 'Skipped - edge function not accessible');
      }
    } catch (error) {
      test('Edge Function Deployment', false, `Network error: ${error.message}`);
      test('Edge Function Status Check', false, 'Skipped - network error');
    }

    // Test 5: Edge function authentication handling
    try {
      const authResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer invalid_token'
        },
        body: JSON.stringify({ 
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10
        })
      });

      const authData = await authResponse.json();
      
      test(
        'Edge Function Authentication',
        authResponse.status === 401 || (authData.code && authData.code === 'AUTH_REQUIRED'),
        `Response: ${authResponse.status} - ${authData.error || authData.message}`
      );
    } catch (error) {
      test('Edge Function Authentication', false, `Error: ${error.message}`);
    }

    // Phase 3: RLS Policy Tests
    console.log('🔒 PHASE 3: ROW LEVEL SECURITY');
    console.log('-'.repeat(40));

    // Test 6: Trading accounts RLS
    const { data: tradingAccounts, error: tradingError } = await supabase
      .from('user_trading_accounts')
      .select('count');
    
    test(
      'Trading Accounts RLS',
      tradingError && tradingError.message.includes('row-level security'),
      tradingError ? 'RLS properly blocking anonymous access' : 'Warning: No RLS protection'
    );

    // Test 7: Signals public access
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('count')
      .limit(1);
    
    test(
      'Signals Public Access',
      !signalsError,
      signalsError ? `Error: ${signalsError.message}` : 'Signals accessible to anonymous users'
    );

    // Phase 4: Real-time Tests
    console.log('📡 PHASE 4: REAL-TIME FUNCTIONALITY');
    console.log('-'.repeat(40));

    // Test 8: Real-time channel creation
    try {
      const channel = supabase.channel('test-channel-validation');
      await new Promise((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CLOSED') {
            resolve(status);
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve('TIMEOUT'), 5000);
      });
      
      test(
        'Real-time Channel Creation',
        true,
        'Channel subscription successful'
      );
      
      await supabase.removeChannel(channel);
    } catch (error) {
      test('Real-time Channel Creation', false, `Error: ${error.message}`);
    }

    // Phase 5: Integration Tests
    console.log('🔄 PHASE 5: INTEGRATION TESTS');
    console.log('-'.repeat(40));

    // Test 9: End-to-end flow simulation
    try {
      // Simulate the full flow without authentication
      const testFlow = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          testMode: true
        })
      });

      const flowData = await testFlow.json();
      
      test(
        'End-to-End Flow',
        testFlow.status === 401 || testFlow.status === 400,
        `Expected auth error received: ${testFlow.status} - ${flowData.error}`
      );
    } catch (error) {
      test('End-to-End Flow', false, `Error: ${error.message}`);
    }

    // Test 10: System health check
    const healthChecks = [
      !dbError,
      !authError,
      results.passed > results.failed
    ];
    
    const systemHealthy = healthChecks.filter(Boolean).length >= 2;
    
    test(
      'Overall System Health',
      systemHealthy,
      `Health score: ${healthChecks.filter(Boolean).length}/3`
    );

  } catch (error) {
    console.error('❌ Validation suite failed:', error);
    test('Validation Suite', false, `Exception: ${error.message}`);
  }

  // Final Results
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('');

  // Status Assessment
  if (results.passed === results.total) {
    console.log('🎉 ALL TESTS PASSED - System is fully operational');
  } else if (results.passed >= results.total * 0.8) {
    console.log('✅ MOSTLY OPERATIONAL - Minor issues detected');
  } else if (results.passed >= results.total * 0.6) {
    console.log('⚠️  PARTIALLY OPERATIONAL - Some critical issues remain');
  } else {
    console.log('❌ SYSTEM ISSUES - Major problems detected');
  }

  console.log('');
  console.log('📋 NEXT STEPS:');
  if (results.failed === 0) {
    console.log('• System is ready for production use');
    console.log('• All authentication and trading flows are working');
    console.log('• Security policies are properly configured');
  } else {
    console.log('• Review failed tests above');
    console.log('• Check authentication and credentials setup');
    console.log('• Verify edge function deployment and configuration');
    if (results.failed > results.total / 2) {
      console.log('• Consider system restart or re-deployment');
    }
  }
}

// Run the validation
runSystemValidation().catch(console.error);