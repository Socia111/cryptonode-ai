import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function runFinalSystemTest() {
  console.log('\n🚀 FINAL TRADING SYSTEM TEST\n');
  console.log('='.repeat(50));

  const results = {
    authentication: '❌',
    database: '❌',
    tradingAccount: '❌',
    tradeExecution: '❌',
    signalGeneration: '❌',
    systemIntegration: '❌'
  };

  try {
    // 1. Authentication Test
    console.log('\n📋 1. Testing Authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth Error:', authError.message);
    } else if (session?.user) {
      console.log('✅ User authenticated:', session.user.email);
      results.authentication = '✅';
    } else {
      console.log('⚠️ No active session - system will create anonymous account');
      results.authentication = '⚠️';
    }

    // 2. Database Connection Test
    console.log('\n📋 2. Testing Database Connection...');
    const { data: markets, error: dbError } = await supabase
      .from('markets')
      .select('symbol')
      .limit(1);
    
    if (dbError) {
      console.log('❌ Database Error:', dbError.message);
    } else {
      console.log('✅ Database connected, markets table accessible');
      results.database = '✅';
    }

    // 3. Trading Account Test
    console.log('\n📋 3. Testing Trading Account System...');
    
    if (session?.user) {
      // Check existing accounts
      const { data: accounts, error: accountError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('exchange', 'bybit');
      
      console.log(`Found ${accounts?.length || 0} trading accounts for user`);
      
      if (!accounts || accounts.length === 0) {
        console.log('Creating test trading account...');
        
        try {
          const { data: accountId, error: createError } = await supabase.rpc(
            'restore_user_trading_account',
            {
              p_user_id: session.user.id,
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

    // 4. Trade Execution Test
    console.log('\n📋 4. Testing Trade Execution...');
    
    try {
      const response = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'status'
        }
      });
      
      if (response.error) {
        console.log('❌ Trade executor error:', response.error.message);
      } else {
        console.log('✅ Trade executor responding:', response.data);
        results.tradeExecution = '✅';
      }
    } catch (error) {
      console.log('❌ Trade execution test failed:', error.message);
    }

    // 5. Signal Generation Test
    console.log('\n📋 5. Testing Signal Generation...');
    
    try {
      const response = await supabase.functions.invoke('live-scanner-production', {
        body: {
          action: 'scan',
          symbols: ['BTCUSDT'],
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

    // 6. Check Recent Signals
    console.log('\n📋 6. Testing Recent Signals Storage...');
    
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
        results.systemIntegration = '✅';
        console.log('Recent signals:', recentSignals.map(s => `${s.symbol} ${s.direction} (${s.algo})`));
      }
    }

  } catch (error) {
    console.log('❌ System test failed:', error.message);
  }

  // Final Results
  console.log('\n' + '='.repeat(50));
  console.log('🏁 FINAL SYSTEM STATUS');
  console.log('='.repeat(50));
  
  console.log(`${results.authentication} Authentication`);
  console.log(`${results.database} Database Connection`);
  console.log(`${results.tradingAccount} Trading Account`);
  console.log(`${results.tradeExecution} Trade Execution`);
  console.log(`${results.signalGeneration} Signal Generation`);
  console.log(`${results.systemIntegration} System Integration`);
  
  const passedTests = Object.values(results).filter(r => r === '✅').length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 OVERALL STATUS:');
  console.log(`${passedTests}/${totalTests} components operational`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('⚠️ SYSTEM MOSTLY FUNCTIONAL - Minor issues detected');
  } else {
    console.log('❌ SYSTEM NEEDS ATTENTION - Major issues detected');
  }
  
  console.log('\n✨ Test completed at:', new Date().toISOString());
}

// Run the test
runFinalSystemTest().catch(console.error);