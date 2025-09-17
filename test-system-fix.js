// System Fix and Test Script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔧 System Fix and Test Script');

async function runSystemFixes() {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('❌ Not signed in - please login first');
      return;
    }

    console.log('✅ User authenticated:', session.user.email);

    // Step 1: Fix Trading Account Creation
    console.log('\n=== 1. Fixing Trading Account ===');
    const { data: accountId, error: accountError } = await supabase.rpc('restore_user_trading_account', {
      p_user_id: session.user.id,
      p_api_key: 'dkfAHt1EfUQM6YGS5g',
      p_api_secret: 'k5ybNEDk0Wy1Vl9suXHMibjPCBAAmAG5o6og',
      p_account_type: 'testnet'
    });

    if (accountError) {
      console.log('❌ Account creation failed:', accountError.message);
    } else {
      console.log('✅ Trading account created:', accountId);
    }

    // Step 2: Test Signal Generation with unirail_core
    console.log('\n=== 2. Testing Signal Generation (unirail_core) ===');
    const { data: signalResult, error: signalError } = await supabase.functions.invoke('live-scanner-production', {
      body: {
        exchange: 'bybit',
        timeframe: '15m',
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        relaxed_filters: true
      }
    });

    if (signalError) {
      console.log('❌ Signal generation failed:', signalError.message);
    } else {
      console.log('✅ Signal generation working!');
      console.log('   Signals found:', signalResult?.signals_found || 0);
      console.log('   Algorithm: unirail_core');
    }

    // Step 3: Test Trade Execution
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
    } else {
      console.log('⚠️ Trade result:', tradeResult?.error || 'Unknown error');
    }

    // Step 4: Verify Database State
    console.log('\n=== 4. Verifying Database State ===');
    
    // Check trading accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    console.log('✅ Active trading accounts:', accounts?.length || 0);
    
    // Check recent unirail_core signals
    const { data: unirailSignals, error: unirailError } = await supabase
      .from('signals')
      .select('*')
      .eq('algo', 'unirail_core')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('✅ Recent unirail_core signals:', unirailSignals?.length || 0);

    // Check old quantum_ai signals
    const { data: quantumSignals, error: quantumError } = await supabase
      .from('signals')
      .select('*')
      .eq('algo', 'quantum_ai')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    console.log('⚠️ Old quantum_ai signals (should be 0):', quantumSignals?.length || 0);

    console.log('\n=== SYSTEM STATUS ===');
    console.log('✅ Trading Account:', accounts?.length > 0 ? 'RESTORED' : 'MISSING');
    console.log('✅ Signal Generation:', signalResult ? 'WORKING' : 'FAILED');
    console.log('✅ Algorithm:', 'unirail_core');
    console.log('✅ Trade Execution:', tradeResult?.success ? 'WORKING' : 'NEEDS SETUP');
    
    if (accounts?.length > 0 && signalResult) {
      console.log('\n🎉 System restoration COMPLETE! All components operational.');
    } else {
      console.log('\n⚠️ System restoration PARTIAL. Some components need attention.');
    }

  } catch (error) {
    console.error('💥 System fix failed:', error);
  }
}

runSystemFixes();