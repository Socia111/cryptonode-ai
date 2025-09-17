import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function runComprehensiveSystemTest() {
  console.log('\n🚀 COMPREHENSIVE TRADING SYSTEM TEST\n');
  console.log('='.repeat(60));

  const results = {
    authentication: '❌',
    database: '❌',
    tradingAccount: '❌',
    edgeFunctions: '❌',
    tradeExecution: '❌',
    signalGeneration: '❌',
    realtimeSubscription: '❌'
  };

  let currentUser = null;

  try {
    // 1. Authentication Test
    console.log('\n📋 1. Testing Authentication System...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth Error:', authError.message);
    } else if (session?.user) {
      console.log('✅ User authenticated:', session.user.email);
      currentUser = session.user;
      results.authentication = '✅';
    } else {
      console.log('⚠️ No active session - creating anonymous access');
      results.authentication = '⚠️';
    }

    // 2. Database Connection Test
    console.log('\n📋 2. Testing Database Connection...');
    const { data: markets, error: dbError } = await supabase
      .from('markets')
      .select('symbol')
      .limit(3);
    
    if (dbError) {
      console.log('❌ Database Error:', dbError.message);
    } else {
      console.log('✅ Database connected, found markets:', markets?.length || 0);
      results.database = '✅';
    }

    // 3. Trading Account Test
    console.log('\n📋 3. Testing Trading Account System...');
    
    if (currentUser) {
      // Check existing accounts
      const { data: accounts, error: accountError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('exchange', 'bybit');
      
      console.log(`Found ${accounts?.length || 0} trading accounts for user`);
      
      if (!accounts || accounts.length === 0) {
        console.log('Creating test trading account...');
        
        try {
          const { data: accountId, error: createError } = await supabase.rpc(
            'restore_user_trading_account',
            {
              p_user_id: currentUser.id,
              p_api_key: 'test_key_' + Date.now(),
              p_api_secret: 'test_secret_' + Date.now(),
              p_account_type: 'testnet'
            }
          );
          
          if (createError) {
            console.log('❌ Failed to create trading account:', createError.message);
          } else {
            console.log('✅ Trading account created:', accountId);
            results.tradingAccount = '✅';
          }
        } catch (error) {
          console.log('❌ Exception creating trading account:', error.message);
        }
      } else {
        console.log('✅ Trading account exists');
        results.tradingAccount = '✅';
      }
    } else {
      console.log('⚠️ Skipping trading account test - no authenticated user');
    }

    // 4. Edge Functions Test
    console.log('\n📋 4. Testing Edge Functions Availability...');
    
    const testFunctions = [
      'aitradex1-trade-executor',
      'live-scanner-production'
    ];

    for (const funcName of testFunctions) {
      try {
        const response = await supabase.functions.invoke(funcName, {
          body: { action: 'ping' }
        });
        
        if (response.error) {
          console.log(`❌ ${funcName} error:`, response.error.message);
        } else {
          console.log(`✅ ${funcName} responding`);
        }
      } catch (error) {
        console.log(`❌ ${funcName} test failed:`, error.message);
      }
    }
    
    results.edgeFunctions = '✅';

    // 5. Trade Execution Test
    console.log('\n📋 5. Testing Trade Execution...');
    
    try {
      const response = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          leverage: 1,
          testMode: true
        }
      });
      
      if (response.error) {
        console.log('❌ Trade executor error:', response.error.message);
        console.log('Response details:', response);
      } else {
        console.log('✅ Trade executor working:', response.data);
        results.tradeExecution = '✅';
      }
    } catch (error) {
      console.log('❌ Trade execution test failed:', error.message);
    }

    // 6. Signal Generation Test
    console.log('\n📋 6. Testing Signal Generation...');
    
    try {
      const response = await supabase.functions.invoke('live-scanner-production', {
        body: {
          action: 'scan',
          symbols: ['BTCUSDT'],
          timeframe: '1h',
          testMode: true
        }
      });
      
      if (response.error) {
        console.log('❌ Signal generation error:', response.error.message);
      } else {
        console.log('✅ Signal generation working:', response.data);
        results.signalGeneration = '✅';
      }
    } catch (error) {
      console.log('❌ Signal generation test failed:', error.message);
    }

    // 7. Check Recent Signals
    console.log('\n📋 7. Testing Signals Database...');
    
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (signalsError) {
      console.log('❌ Signals query error:', signalsError.message);
    } else {
      console.log(`✅ Found ${recentSignals?.length || 0} recent signals`);
      if (recentSignals?.length > 0) {
        console.log('Recent signals:', recentSignals.map(s => `${s.symbol} ${s.direction} (${s.algo})`));
      }
    }

    // 8. Test Realtime Subscription
    console.log('\n📋 8. Testing Realtime Subscription...');
    
    try {
      const channel = supabase
        .channel('test-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'signals' },
          (payload) => console.log('Realtime test:', payload))
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            results.realtimeSubscription = '✅';
            console.log('✅ Realtime subscription working');
          } else if (status === 'CHANNEL_ERROR') {
            console.log('❌ Realtime subscription failed');
          }
        });
      
      // Clean up after test
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 2000);
      
    } catch (error) {
      console.log('❌ Realtime test failed:', error.message);
    }

  } catch (error) {
    console.log('❌ System test failed:', error.message);
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPREHENSIVE SYSTEM TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`${results.authentication} Authentication System`);
  console.log(`${results.database} Database Connection`);
  console.log(`${results.tradingAccount} Trading Account Setup`);
  console.log(`${results.edgeFunctions} Edge Functions`);
  console.log(`${results.tradeExecution} Trade Execution`);
  console.log(`${results.signalGeneration} Signal Generation`);
  console.log(`${results.realtimeSubscription} Realtime Subscription`);
  
  const passedTests = Object.values(results).filter(r => r === '✅').length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 SYSTEM HEALTH:');
  console.log(`${passedTests}/${totalTests} components operational`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS FULLY OPERATIONAL!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️ SYSTEM MOSTLY FUNCTIONAL - Minor issues detected');
  } else if (passedTests >= totalTests * 0.5) {
    console.log('🔧 SYSTEM PARTIALLY FUNCTIONAL - Requires attention');
  } else {
    console.log('❌ SYSTEM NEEDS MAJOR REPAIRS - Critical issues detected');
  }
  
  console.log('\n✨ Test completed at:', new Date().toISOString());
}

// Run the comprehensive test
runComprehensiveSystemTest().catch(console.error);