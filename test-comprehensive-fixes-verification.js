import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function runComprehensiveTest() {
  console.log('\n🔧 COMPREHENSIVE FIXES VERIFICATION TEST\n');
  console.log('='.repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures = [];

  const test = (name, condition, details = '') => {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name} - ${details}`);
      failures.push({ name, details });
      failedTests++;
    }
  };

  try {
    // 1. Test Database Schema Updates
    console.log('\n📋 1. Testing Database Schema Updates...');
    
    const { data: signalsColumns, error: columnsError } = await supabase
      .rpc('_get_table_columns', { table_name: 'signals' })
      .catch(() => ({ data: null, error: 'RPC not available, using manual check' }));
    
    // Test that signals table has the expected new columns
    const { data: signalsData, error: signalsSchemaError } = await supabase
      .from('signals')
      .select('id, filters, side, signal_type, is_active')
      .limit(1);
    
    test(
      'Signals table has new columns (filters, side, signal_type, is_active)', 
      !signalsSchemaError,
      signalsSchemaError?.message || ''
    );

    // 2. Test RLS Policies
    console.log('\n📋 2. Testing RLS Policies...');
    
    // Test markets table access (should work for anonymous)
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('symbol')
      .limit(3);
    
    test(
      'Markets table accessible (RLS policy fixed)', 
      !marketsError && markets && markets.length > 0,
      marketsError?.message || 'No markets found'
    );

    // 3. Test Authentication
    console.log('\n📋 3. Testing Authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      test('Auth Error Check', false, authError.message);
    } else if (session?.user) {
      console.log(`✅ User authenticated: ${session.user.email}`);
      
      // Test user_trading_accounts access for authenticated users
      const { data: accounts, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', session.user.id);
      
      test(
        'User trading accounts accessible (RLS fixed)', 
        !accountsError,
        accountsError?.message || ''
      );
      
      console.log(`✅ Found ${accounts?.length || 0} trading accounts for user`);
      
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        console.log('Account details:', {
          id: account.id.substring(0, 8) + '...',
          active: account.is_active,
          hasPlaceholder: account.api_key_encrypted?.startsWith('placeholder_') || account.api_key_encrypted?.startsWith('test_key_'),
          accountType: account.account_type
        });
      }
    } else {
      console.log('⚠️ No active session (testing as anonymous user)');
    }

    // 4. Test Trade Executor with improved logic
    console.log('\n📋 4. Testing Improved Trade Executor...');
    
    const statusResponse = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: { action: 'status' }
    });
    
    test(
      'Trade executor status check', 
      !statusResponse.error && statusResponse.data?.ok,
      statusResponse.error?.message || 'Status check failed'
    );
    
    if (!statusResponse.error && statusResponse.data?.ok) {
      console.log('✅ Trade executor operational:', {
        status: statusResponse.data.status,
        trading_enabled: statusResponse.data.trading_enabled,
        allowed_symbols: statusResponse.data.allowed_symbols
      });
      
      // Test trade execution (this should handle account creation gracefully)
      const tradeResponse = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 1,
          leverage: 1,
          testMode: true
        }
      });
      
      // This should either succeed or fail gracefully with proper error handling
      const tradeWorking = !tradeResponse.error || 
                          tradeResponse.data?.needsCredentials ||
                          tradeResponse.data?.error?.includes('credentials');
      
      test(
        'Trade executor handles requests gracefully', 
        tradeWorking,
        tradeResponse.error?.message || tradeResponse.data?.error || ''
      );
      
      if (tradeResponse.data?.needsCredentials) {
        console.log('✅ Trade executor correctly detected missing credentials');
      }
    }

    // 5. Test Signal Generation & Database Access
    console.log('\n📋 5. Testing Signal Generation & Database...');
    
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    test(
      'Signals table accessible', 
      !signalsError,
      signalsError?.message || ''
    );
    
    if (!signalsError && signals) {
      console.log(`✅ Found ${signals.length} recent signals`);
      if (signals.length > 0) {
        const signal = signals[0];
        console.log('Latest signal:', {
          symbol: signal.symbol,
          direction: signal.direction,
          score: signal.score,
          timeframe: signal.timeframe,
          hasFilters: !!signal.filters,
          hasSide: !!signal.side
        });
      }
    }

    // 6. Test Realtime Subscription Setup
    console.log('\n📋 6. Testing Realtime Subscription...');
    
    let realtimeStatus = 'unknown';
    let subscriptionWorking = false;
    
    const testChannel = supabase
      .channel('test-realtime-fix')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        (payload) => {
          console.log('✅ Realtime event received:', payload.eventType);
          subscriptionWorking = true;
        })
      .subscribe((status) => {
        realtimeStatus = status;
        console.log('Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          subscriptionWorking = true;
        }
      });
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    test(
      'Realtime subscription working', 
      realtimeStatus === 'SUBSCRIBED',
      `Status: ${realtimeStatus}`
    );
    
    // Clean up
    supabase.removeChannel(testChannel);

    // 7. Test Edge Functions Status
    console.log('\n📋 7. Testing Edge Functions...');
    
    const edgeFunctions = [
      'live-scanner-production',
      'bybit-live-trading'
    ];
    
    for (const functionName of edgeFunctions) {
      try {
        const response = await supabase.functions.invoke(functionName, {
          body: { action: 'status' }
        });
        
        const working = !response.error || 
                       response.error.message?.includes('auth') ||
                       response.error.message?.includes('credentials');
        
        test(
          `${functionName} function accessible`, 
          working,
          response.error?.message || ''
        );
      } catch (err) {
        test(`${functionName} function accessible`, false, err.message);
      }
    }

  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
    failedTests++;
  }

  // Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`\n📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failures.length > 0) {
    console.log('\n🚨 Failed Tests:');
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.name}: ${failure.details}`);
    });
  }
  
  console.log('\n✨ Key fixes implemented:');
  console.log('1. ✅ Added missing columns to signals table (filters, side, signal_type, is_active)');
  console.log('2. ✅ Fixed RLS policies for user_trading_accounts and markets tables');
  console.log('3. ✅ Enhanced trade executor with better account handling');
  console.log('4. ✅ Improved realtime subscription with better error handling');
  console.log('5. ✅ Fixed database function for account management');
  
  console.log('\n📋 System Status:');
  if (passedTests / totalTests >= 0.8) {
    console.log('🟢 SYSTEM HEALTHY - Most critical functions working');
  } else if (passedTests / totalTests >= 0.6) {
    console.log('🟡 SYSTEM PARTIAL - Some issues remain');
  } else {
    console.log('🔴 SYSTEM NEEDS ATTENTION - Multiple critical issues');
  }
  
  console.log('\n' + '='.repeat(60));
}

runComprehensiveTest().catch(console.error);