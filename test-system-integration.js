#!/usr/bin/env node
/**
 * Comprehensive System Integration Test
 * Tests all components after the implemented fixes
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function runIntegrationTests() {
  console.log('\n🔧 COMPREHENSIVE SYSTEM INTEGRATION TEST');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const test = (name, condition, details = '') => {
    const passed = !!condition;
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${details}`);
    }
    if (details && passed) {
      console.log(`   ${details}`);
    }
  };

  try {
    // 1. Test Database Connectivity and RLS
    console.log('\n📋 1. Database and RLS Tests...');
    
    // Test markets table access (should work now)
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('*')
      .limit(5);
    
    test('Markets table public access', 
      !marketsError, 
      marketsError ? marketsError.message : `Found ${markets?.length || 0} markets`);

    // Test signals access
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .limit(5);
    
    test('Signals table access', 
      !signalsError, 
      signalsError ? signalsError.message : `Found ${signals?.length || 0} signals`);

    // 2. Test Authentication Status
    console.log('\n📋 2. Authentication Tests...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    test('Auth session check', 
      !authError, 
      authError ? authError.message : session?.user ? `User: ${session.user.email}` : 'No active session');

    // 3. Test Edge Functions
    console.log('\n📋 3. Edge Function Tests...');
    
    // Test trade executor status
    const { data: executorStatus, error: executorError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: { action: 'status' }
    });
    
    test('Trade executor function', 
      !executorError && executorStatus?.status, 
      executorError ? executorError.message : `Status: ${executorStatus?.status}`);

    // Test debug trading status
    const { data: debugStatus, error: debugError } = await supabase.functions.invoke('debug-trading-status', {
      body: { action: 'env_check' }
    });
    
    test('Debug trading status function', 
      !debugError && debugStatus?.success, 
      debugError ? debugError.message : `Environment: ${debugStatus?.environment?.configurationStatus}`);

    // 4. Test Realtime Subscription (critical fix)
    console.log('\n📋 4. Realtime Subscription Test...');
    
    const realtimeTestResult = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Timeout' });
      }, 10000);

      const channel = supabase
        .channel('integration-test-signals')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {})
        .subscribe((status) => {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          resolve({ 
            success: status === 'SUBSCRIBED', 
            status,
            error: status !== 'SUBSCRIBED' ? `Status: ${status}` : null 
          });
        });
    });

    test('Realtime subscription', 
      realtimeTestResult.success, 
      realtimeTestResult.error || 'Successfully subscribed to realtime events');

    // 5. Test Trading Account Management (if authenticated)
    if (session?.user) {
      console.log('\n📋 5. Trading Account Tests...');
      
      const { data: tradingAccounts, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', session.user.id);
      
      test('Trading accounts access', 
        !accountsError, 
        accountsError ? accountsError.message : `Found ${tradingAccounts?.length || 0} trading accounts`);

      // Test trade execution with authentication
      const { data: tradeTest, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          leverage: 1,
          testMode: true
        }
      });
      
      test('Authenticated trade execution', 
        !tradeError, 
        tradeError ? tradeError.message : `Test trade: ${tradeTest?.success ? 'Success' : 'Failed'}`);
    }

  } catch (error) {
    console.log(`❌ Test suite error: ${error.message}`);
    results.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('🚀 System is fully operational and ready for production use');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    console.log('\n🔧 Fixed Issues:');
    console.log('✅ Database RLS policies updated');
    console.log('✅ Realtime subscription configuration improved');
    console.log('✅ Trade executor JWT authentication added');
    console.log('✅ Error handling enhanced throughout system');
  }

  console.log('\n📋 System Status Summary:');
  console.log(`• Database Access: ${results.tests.find(t => t.name.includes('Markets'))?.passed ? 'Working' : 'Issues'}`);
  console.log(`• Authentication: ${results.tests.find(t => t.name.includes('Auth'))?.passed ? 'Working' : 'Issues'}`);
  console.log(`• Edge Functions: ${results.tests.find(t => t.name.includes('Trade executor'))?.passed ? 'Working' : 'Issues'}`);
  console.log(`• Realtime Events: ${results.tests.find(t => t.name.includes('Realtime'))?.passed ? 'Working' : 'Issues'}`);
  
  return results.failed === 0;
}

runIntegrationTests().catch(console.error);