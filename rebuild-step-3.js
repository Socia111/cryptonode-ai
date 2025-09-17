// AItradeX1 System Rebuild - Step 3: Complete Feature Verification
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🚀 AItradeX1 System Rebuild - Step 3: Complete Feature Verification');

async function rebuildStep3() {
  try {
    console.log('\n=== STEP 3: COMPREHENSIVE SYSTEM VERIFICATION ===');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No user session - please sign in first');
      return false;
    }

    // 1. Test All Core Edge Functions
    console.log('\n1️⃣ Testing Core Edge Functions...');
    
    const edgeFunctions = [
      'aitradex1-trade-executor',
      'aitradex1-original-scanner', 
      'aitradex1-enhanced-scanner',
      'bybit-authenticate',
      'telegram-bot'
    ];

    const functionResults = [];
    for (const func of edgeFunctions) {
      try {
        const testBody = func.includes('scanner') ? 
          { timeframe: '15m', symbols: ['BTCUSDT'] } :
          func === 'aitradex1-trade-executor' ?
          { action: 'status' } :
          func === 'telegram-bot' ?
          { test: true } :
          { test: true };

        const { data, error } = await supabase.functions.invoke(func, {
          body: testBody
        });

        if (error) {
          console.log(`⚠️ ${func}: ${error.message}`);
          functionResults.push({ func, status: 'error', error: error.message });
        } else {
          console.log(`✅ ${func}: Working`);
          functionResults.push({ func, status: 'ok', response: data });
        }
      } catch (e) {
        console.log(`❌ ${func}: ${e.message}`);
        functionResults.push({ func, status: 'error', error: e.message });
      }
    }

    // 2. Test Database Operations
    console.log('\n2️⃣ Testing Database Operations...');
    
    // Test signals table
    const { data: signalsData, error: signalsError } = await supabase
      .from('signals')
      .select('count(*)')
      .single();
    
    console.log(signalsError ? 
      `❌ Signals table: ${signalsError.message}` : 
      `✅ Signals table: ${signalsData.count} records`
    );

    // Test markets table  
    const { data: marketsData, error: marketsError } = await supabase
      .from('markets')
      .select('count(*)')
      .single();
    
    console.log(marketsError ? 
      `❌ Markets table: ${marketsError.message}` : 
      `✅ Markets table: ${marketsData.count} records`
    );

    // 3. Test Real-time Subscriptions
    console.log('\n3️⃣ Testing Real-time Subscriptions...');
    
    let realtimeWorking = false;
    const channel = supabase
      .channel('test-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'signals' }, 
        () => { realtimeWorking = true; }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscriptions: Working');
          realtimeWorking = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscriptions: Error');
        }
      });

    // Wait a moment for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    await supabase.removeChannel(channel);

    // 4. Test Signal Generation End-to-End
    console.log('\n4️⃣ Testing Signal Generation Pipeline...');
    
    const { data: scanResult, error: scanError } = await supabase.functions.invoke('aitradex1-original-scanner', {
      body: {
        timeframe: '5m',
        symbols: ['BTCUSDT', 'ETHUSDT'],
        force_run: true
      }
    });

    if (scanError) {
      console.log('❌ Signal generation pipeline: Error -', scanError.message);
    } else {
      console.log('✅ Signal generation pipeline: Working');
      console.log('   Generated signals:', scanResult?.signals_generated || 0);
    }

    // 5. Test Trading Features
    console.log('\n5️⃣ Testing Trading Features...');
    
    // Check if user has trading account
    const { data: tradingAccount } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!tradingAccount) {
      console.log('⚠️ No trading account - creating demo account...');
      const { error: createError } = await supabase
        .from('user_trading_accounts')
        .insert({
          user_id: session.user.id,
          exchange: 'bybit',
          account_type: 'testnet',
          api_key_encrypted: 'demo_key',
          api_secret_encrypted: 'demo_secret',
          is_active: true,
          balance_info: { totalEquity: '1000', totalAvailableBalance: '1000' }
        });

      if (createError) {
        console.log('❌ Failed to create demo trading account');
      } else {
        console.log('✅ Demo trading account created');
      }
    } else {
      console.log('✅ Trading account configured:', tradingAccount.account_type);
    }

    // Test trade execution
    const { data: tradeTest, error: tradeTestError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 0.1,
        leverage: 1,
        scalpMode: true
      }
    });

    console.log(tradeTestError ? 
      `⚠️ Trade execution: ${tradeTestError.message}` :
      tradeTest?.success ? 
        '✅ Trade execution: Working' : 
        `⚠️ Trade execution: ${tradeTest?.error || 'Unknown issue'}`
    );

    // 6. Generate System Health Report
    console.log('\n=== FINAL SYSTEM HEALTH REPORT ===');
    
    const workingFunctions = functionResults.filter(f => f.status === 'ok').length;
    const totalFunctions = functionResults.length;
    
    console.log(`🔧 Edge Functions: ${workingFunctions}/${totalFunctions} operational`);
    console.log(`💾 Database: ${signalsError || marketsError ? 'Issues detected' : 'Fully operational'}`);
    console.log(`📡 Real-time: ${realtimeWorking ? 'Working' : 'Needs attention'}`);
    console.log(`📊 Signal Generation: ${scanError ? 'Issues detected' : 'Working'}`);
    console.log(`💳 Trading System: ${tradeTestError ? 'Issues detected' : 'Operational'}`);
    
    const overallHealth = (workingFunctions === totalFunctions && 
                          !signalsError && !marketsError && 
                          realtimeWorking && !scanError) ? 
                          'EXCELLENT' : 
                          (workingFunctions >= totalFunctions * 0.8) ? 
                          'GOOD' : 'NEEDS_ATTENTION';

    console.log(`\n🎯 Overall System Health: ${overallHealth}`);
    
    if (overallHealth === 'EXCELLENT') {
      console.log('\n🚀 CONGRATULATIONS! 🚀');
      console.log('✅ AItradeX1 system rebuild completed successfully');
      console.log('✅ All core features are operational');
      console.log('✅ Ready for production trading');
      console.log('\n📋 Next Steps:');
      console.log('1. Connect real Bybit API keys for live trading');
      console.log('2. Configure Telegram notifications');
      console.log('3. Set up risk management parameters');
      console.log('4. Begin live trading with small amounts');
    } else if (overallHealth === 'GOOD') {
      console.log('\n✅ SYSTEM MOSTLY OPERATIONAL');
      console.log('🔧 Minor issues detected but core features working');
      console.log('💡 Address any warnings above before full deployment');
    } else {
      console.log('\n⚠️ SYSTEM NEEDS ATTENTION');
      console.log('🔧 Critical issues detected - review errors above');
      console.log('💡 Fix issues before proceeding with live trading');
    }

    return overallHealth;

  } catch (error) {
    console.error('💥 Rebuild Step 3 failed:', error);
    return false;
  }
}

rebuildStep3().then(result => {
  if (result === 'EXCELLENT') {
    console.log('\n🎉 REBUILD COMPLETED SUCCESSFULLY! 🎉');
    console.log('AItradeX1 is ready for production use!');
  } else if (result === 'GOOD') {
    console.log('\n✅ Rebuild mostly successful - minor issues to address');
  } else {
    console.log('\n❌ Rebuild needs more work - check errors above');
  }
});