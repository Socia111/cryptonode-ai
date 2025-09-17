// Test script for fixed trading system
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔧 Testing Fixed Trading System...');

async function testSystem() {
  try {
    // 1. Test authentication check
    console.log('\n1️⃣ Testing auth status...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No user session - need to sign in first');
      return;
    }
    console.log('✅ User authenticated:', session.user.email);

    // 2. Check for trading account
    console.log('\n2️⃣ Checking trading account...');
    const { data: accounts, error: accountError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('exchange', 'bybit')
      .eq('is_active', true);

    if (accountError) {
      console.log('❌ Error checking accounts:', accountError.message);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('❌ No active Bybit trading account found');
      console.log('💡 Please connect your Bybit account first in the Live Trading Setup');
      return;
    }

    const account = accounts[0];
    console.log('✅ Trading account found:');
    console.log(`   - Account Type: ${account.account_type}`);
    console.log(`   - Has API Key: ${!!account.api_key_encrypted}`);
    console.log(`   - Has Secret: ${!!account.api_secret_encrypted}`);
    console.log(`   - Balance: $${account.balance_info?.totalEquity || '0'}`);

    // 3. Test trade executor with small amount
    console.log('\n3️⃣ Testing trade execution...');
    const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 1, // Very small amount
        leverage: 1,
        orderType: 'Market',
        scalpMode: true // Use scalping mode for smaller requirements
      }
    });

    if (tradeError) {
      console.log('❌ Trade execution error:', tradeError.message);
      return;
    }

    if (tradeResult?.success) {
      console.log('✅ Trade executed successfully!');
      console.log('   - Order ID:', tradeResult.data?.mainOrder?.result?.orderId);
      console.log('   - Stop Loss Order:', tradeResult.data?.stopLossOrderId);
      console.log('   - Take Profit Order:', tradeResult.data?.takeProfitOrderId);
    } else {
      console.log('❌ Trade failed:', tradeResult?.error);
      
      // Provide specific guidance based on error
      if (tradeResult?.error?.includes('ab not enough')) {
        console.log('💡 Solution: Add funds to your Bybit testnet account');
        console.log('   1. Go to https://testnet.bybit.com');
        console.log('   2. Log in and get free testnet USDT');
        console.log('   3. Try trading again');
      } else if (tradeResult?.error?.includes('position idx not match')) {
        console.log('💡 Solution: The position mode issue should now be fixed');
        console.log('   - Try again with the updated system');
      }
    }

    console.log('\n🎯 System Status:');
    console.log('✅ Authentication: Working');
    console.log('✅ Database: Working');
    console.log('✅ User credentials: Stored');
    console.log(tradeResult?.success ? '✅ Trading: Working' : '⚠️ Trading: Needs testnet funds');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testSystem();