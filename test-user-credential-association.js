// Test script to verify user-credential association
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔧 Testing User-Credential Association...');

async function testUserCredentials() {
  try {
    // 1. Check user authentication
    console.log('\n1️⃣ Checking user authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('❌ No authenticated user found');
      console.log('💡 Please sign in first in your app');
      return;
    }
    
    console.log('✅ User authenticated:', session.user.email);
    console.log('   User ID:', session.user.id);

    // 2. Check for trading accounts
    console.log('\n2️⃣ Checking for Bybit trading accounts...');
    const { data: accounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('exchange', 'bybit');

    if (accountsError) {
      console.log('❌ Error fetching trading accounts:', accountsError.message);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('❌ No Bybit trading accounts found for this user');
      console.log('💡 Please connect your Bybit account in the Live Trading Setup');
      return;
    }

    console.log(`✅ Found ${accounts.length} Bybit account(s):`);
    accounts.forEach((account, index) => {
      console.log(`   Account ${index + 1}:`);
      console.log(`   - ID: ${account.id}`);
      console.log(`   - Type: ${account.account_type}`);
      console.log(`   - Active: ${account.is_active}`);
      console.log(`   - Has API Key: ${!!account.api_key_encrypted}`);
      console.log(`   - Has API Secret: ${!!account.api_secret_encrypted}`);
      console.log(`   - Permissions: ${account.permissions?.join(', ') || 'None'}`);
      console.log(`   - Balance: ${JSON.stringify(account.balance_info, null, 2)}`);
      console.log(`   - Connected: ${account.connected_at}`);
      console.log(`   - Last Used: ${account.last_used_at}`);
    });

    // 3. Check active account specifically
    console.log('\n3️⃣ Checking active trading account...');
    const { data: activeAccount, error: activeError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .single();

    if (activeError) {
      console.log('❌ Error fetching active account:', activeError.message);
      if (activeError.code === 'PGRST116') {
        console.log('💡 No active Bybit account found - please activate one in the app');
      }
      return;
    }

    if (!activeAccount) {
      console.log('❌ No active Bybit account found');
      console.log('💡 Please activate your Bybit account in the Live Trading Setup');
      return;
    }

    console.log('✅ Active account found:');
    console.log(`   - Account ID: ${activeAccount.id}`);
    console.log(`   - Account Type: ${activeAccount.account_type}`);
    console.log(`   - API Key Present: ${!!activeAccount.api_key_encrypted}`);
    console.log(`   - API Secret Present: ${!!activeAccount.api_secret_encrypted}`);

    // 4. Test trade executor call
    console.log('\n4️⃣ Testing trade executor call...');
    const { data: tradeResult, error: tradeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'status'
      }
    });

    if (tradeError) {
      console.log('❌ Trade executor error:', tradeError.message);
      return;
    }

    console.log('✅ Trade executor status:', tradeResult);

    // 5. Test actual trade execution with minimal amount
    console.log('\n5️⃣ Testing minimal trade execution...');
    const { data: executeResult, error: executeError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: {
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 0.1, // Very small amount for testing
        leverage: 1,
        scalpMode: true
      }
    });

    if (executeError) {
      console.log('❌ Trade execution error:', executeError.message);
      return;
    }

    if (executeResult?.success) {
      console.log('✅ Trade execution test successful!');
      console.log('   Result:', executeResult);
    } else {
      console.log('❌ Trade execution failed:', executeResult?.error);
      
      // Provide specific guidance
      if (executeResult?.error?.includes('No Bybit trading account configured')) {
        console.log('\n🔧 Fix Steps:');
        console.log('1. Go to your app\'s Live Trading Setup');
        console.log('2. Enter your Bybit API credentials');
        console.log('3. Make sure they are saved successfully');
        console.log('4. Try the test again');
      }
    }

    console.log('\n📊 Summary:');
    console.log('✅ User Authentication: Working');
    console.log(`✅ Trading Accounts: ${accounts.length} found`);
    console.log(`${activeAccount ? '✅' : '❌'} Active Account: ${activeAccount ? 'Found' : 'Not found'}`);
    console.log(`${executeResult?.success ? '✅' : '❌'} Trade Execution: ${executeResult?.success ? 'Working' : 'Failed'}`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testUserCredentials();