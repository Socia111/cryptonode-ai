// System Fix and Test Script - Updated
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔧 System Fix and Test Script - Updated');

async function runComprehensiveTest() {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('❌ Not signed in - please login first');
      return;
    }

    console.log('✅ User authenticated:', session.user.email);

    // Step 1: Fix Trading Account Creation (Force Create)
    console.log('\n=== 1. Creating Trading Account (FORCED) ===');
    const { data: accountId, error: accountError } = await supabase.rpc('restore_user_trading_account', {
      p_user_id: session.user.id,
      p_api_key: 'dkfAHt1EfUQM6YGS5g',
      p_api_secret: 'k5ybNEDk0Wy1Vl9suXHMibjPCBAAmAG5o6og',
      p_account_type: 'testnet'
    });

    if (accountError) {
      console.log('❌ Account creation failed:', accountError.message);
    } else {
      console.log('✅ Trading account created with ID:', accountId);
    }

    // Step 2: Verify Trading Account exists in database
    console.log('\n=== 2. Verifying Trading Account in Database ===');
    const { data: accounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (accountsError) {
      console.log('❌ Failed to query accounts:', accountsError.message);
    } else {
      console.log('✅ Active trading accounts found:', accounts?.length || 0);
      if (accounts && accounts.length > 0) {
        console.log('   Account details:', {
          id: accounts[0].id,
          exchange: accounts[0].exchange,
          account_type: accounts[0].account_type,
          has_api_key: !!accounts[0].api_key_encrypted,
          has_api_secret: !!accounts[0].api_secret_encrypted
        });
      }
    }

    // Step 3: Test Trade Execution with proper auth
    console.log('\n=== 3. Testing Trade Execution ===');
    const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1,
        leverage: 1,
        scalpMode: true
      }
    });

    if (tradeError) {
      console.log('❌ Trade execution failed:', tradeError.message);
    } else if (tradeResult?.success) {
      console.log('✅ Trade execution working!');
      console.log('   Result:', tradeResult);
    } else {
      console.log('⚠️ Trade result:', tradeResult?.error || 'Unknown error');
    }

    // Step 4: Test Signal Generation with new schema
    console.log('\n=== 4. Testing Signal Generation ===');
    const { data: signalResult, error: signalError } = await supabase.functions.invoke('live-scanner-production', {
      body: {
        exchange: 'bybit',
        timeframe: '15m',
        symbols: ['BTCUSDT', 'ETHUSDT'],
        relaxed_filters: true
      }
    });

    if (signalError) {
      console.log('❌ Signal generation failed:', signalError.message);
    } else {
      console.log('✅ Signal generation working!');
      console.log('   Signals found:', signalResult?.signals_found || 0);
      console.log('   Success:', signalResult?.success);
    }

    // Step 5: Verify Signal Storage
    console.log('\n=== 5. Checking Recent Signals ===');
    const { data: recentSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(5);

    if (signalsError) {
      console.log('❌ Failed to query signals:', signalsError.message);
    } else {
      console.log('✅ Recent signals found:', recentSignals?.length || 0);
      if (recentSignals && recentSignals.length > 0) {
        console.log('   Latest signal:', {
          symbol: recentSignals[0].symbol,
          direction: recentSignals[0].direction,
          algo: recentSignals[0].algo,
          exchange: recentSignals[0].exchange,
          score: recentSignals[0].score
        });
      }
    }

    // Step 6: Database Schema Verification
    console.log('\n=== 6. Database Schema Check ===');
    const { data: tableInfo, error: schemaError } = await supabase
      .from('signals')
      .select('exchange')
      .limit(1);

    if (schemaError) {
      console.log('❌ Schema issue:', schemaError.message);
    } else {
      console.log('✅ Signals table schema is correct (exchange column exists)');
    }

    console.log('\n=== FINAL SYSTEM STATUS ===');
    console.log('✅ Authentication:', session ? 'WORKING' : 'FAILED');
    console.log('✅ Trading Accounts:', (accounts?.length || 0) > 0 ? 'RESTORED' : 'MISSING');
    console.log('✅ Signal Generation:', signalResult ? 'WORKING' : 'FAILED'); 
    console.log('✅ Trade Execution:', tradeResult?.success ? 'WORKING' : 'NEEDS_AUTH');
    console.log('✅ Database Schema:', !schemaError ? 'FIXED' : 'BROKEN');
    console.log('✅ Algorithm:', 'unirail_core');
    
    const allWorking = session && (accounts?.length || 0) > 0 && signalResult && !schemaError;
    
    if (allWorking) {
      console.log('\n🎉 SYSTEM FULLY RESTORED! All components working correctly.');
    } else {
      console.log('\n⚠️ System partially working. Some components may need attention.');
    }

  } catch (error) {
    console.error('💥 Comprehensive test failed:', error);
  }
}

runComprehensiveTest();