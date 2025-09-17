#!/usr/bin/env node

// Comprehensive rebuild system for API authentication and signal generation
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔄 REBUILDING AUTHENTICATION & SIGNALS SYSTEM...\n');

async function rebuildSystem() {
  try {
    // Step 1: Authentication Check
    console.log('1️⃣ AUTHENTICATION DIAGNOSIS');
    console.log('=' .repeat(50));
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('❌ CRITICAL: No authenticated user found');
      console.log('🛠️ SOLUTION: Please sign in to your app first\n');
      return false;
    }
    
    console.log(`✅ User authenticated: ${session.user.email}`);
    console.log(`   User ID: ${session.user.id}\n`);

    // Step 2: Trading Accounts Analysis
    console.log('2️⃣ TRADING ACCOUNTS ANALYSIS');
    console.log('=' .repeat(50));
    
    const { data: allAccounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id);

    if (accountsError) {
      console.log(`❌ Database error: ${accountsError.message}`);
      return false;
    }

    console.log(`📊 Total accounts for user: ${allAccounts?.length || 0}`);
    
    const bybitAccounts = allAccounts?.filter(acc => acc.exchange === 'bybit') || [];
    console.log(`📊 Bybit accounts: ${bybitAccounts.length}`);
    
    const activeAccounts = bybitAccounts.filter(acc => acc.is_active) || [];
    console.log(`📊 Active Bybit accounts: ${activeAccounts.length}`);

    if (activeAccounts.length === 0) {
      console.log('\n❌ PROBLEM: No active Bybit accounts found');
      console.log('🛠️ SOLUTION OPTIONS:');
      console.log('   a) Connect Bybit API in Live Trading Setup');
      console.log('   b) Reactivate existing account');
      console.log('   c) Rebuild credentials\n');
      
      if (bybitAccounts.length > 0) {
        console.log('📋 Found inactive accounts:');
        bybitAccounts.forEach((acc, i) => {
          console.log(`   ${i+1}. ID: ${acc.id}, Type: ${acc.account_type}, Active: ${acc.is_active}`);
        });
        console.log('\n🔧 Attempting to reactivate most recent account...');
        
        const { error: updateError } = await supabase
          .from('user_trading_accounts')
          .update({ is_active: true })
          .eq('id', bybitAccounts[0].id);
          
        if (updateError) {
          console.log(`❌ Failed to reactivate: ${updateError.message}`);
        } else {
          console.log('✅ Account reactivated');
        }
      }
    } else {
      console.log('✅ Active Bybit account found');
      const account = activeAccounts[0];
      console.log(`   Account Type: ${account.account_type}`);
      console.log(`   Has API Key: ${!!account.api_key_encrypted}`);
      console.log(`   Has Secret: ${!!account.api_secret_encrypted}`);
    }

    // Step 3: API Connectivity Test
    console.log('\n3️⃣ API CONNECTIVITY TEST');
    console.log('=' .repeat(50));
    
    try {
      const { data: debugResult, error: debugError } = await supabase.functions.invoke('debug-bybit-api');
      
      if (debugError) {
        console.log(`❌ Debug API failed: ${debugError.message}`);
      } else if (debugResult) {
        console.log('📊 API Debug Results:');
        console.log(`   Credentials Available: ${debugResult.credentials_available ? '✅' : '❌'}`);
        console.log(`   Bybit Connectivity: ${debugResult.bybit_connectivity ? '✅' : '❌'}`);
        console.log(`   Balance Check: ${debugResult.balance_check ? '✅' : '❌'}`);
        
        if (debugResult.error) {
          console.log(`   Error Details: ${debugResult.error}`);
        }
      }
    } catch (e) {
      console.log(`❌ API test failed: ${e.message}`);
    }

    // Step 4: Trade Executor Test
    console.log('\n4️⃣ TRADE EXECUTOR TEST');
    console.log('=' .repeat(50));
    
    try {
      const { data: statusResult, error: statusError } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: { action: 'status' }
      });
      
      if (statusError) {
        console.log(`❌ Trade executor error: ${statusError.message}`);
      } else {
        console.log('✅ Trade executor status:', statusResult);
      }
    } catch (e) {
      console.log(`❌ Trade executor test failed: ${e.message}`);
    }

    // Step 5: Signals Analysis
    console.log('\n5️⃣ SIGNALS ANALYSIS');
    console.log('=' .repeat(50));
    
    const { data: allSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (signalsError) {
      console.log(`❌ Signals query failed: ${signalsError.message}`);
    } else {
      const total = allSignals?.length || 0;
      const recent24h = allSignals?.filter(s => 
        new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length || 0;
      const highConfidence = allSignals?.filter(s => s.score >= 80).length || 0;
      
      console.log(`📊 Total signals: ${total}`);
      console.log(`📊 Recent (24h): ${recent24h}`);
      console.log(`📊 High confidence (80%+): ${highConfidence}`);
      
      if (total === 0) {
        console.log('\n❌ PROBLEM: No signals in database');
        console.log('🛠️ SOLUTION: Generate signals');
      } else if (recent24h === 0) {
        console.log('\n⚠️ WARNING: No recent signals');
        console.log('🛠️ SOLUTION: Generate fresh signals');
      } else if (highConfidence === 0) {
        console.log('\n⚠️ WARNING: No high confidence signals');
        console.log('🛠️ SOLUTION: Check signal generation quality');
      } else {
        console.log('✅ Signals look good');
      }
    }

    // Step 6: Signal Generation Test
    console.log('\n6️⃣ SIGNAL GENERATION TEST');
    console.log('=' .repeat(50));
    
    try {
      console.log('🔄 Attempting to generate fresh signals...');
      const { data: generateResult, error: generateError } = await supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '1h',
          symbols: [], // All symbols
          scan_all_coins: true
        }
      });
      
      if (generateError) {
        console.log(`❌ Signal generation failed: ${generateError.message}`);
      } else {
        console.log('✅ Signal generation result:', generateResult);
      }
    } catch (e) {
      console.log(`❌ Signal generation test failed: ${e.message}`);
    }

    // Step 7: Rebuild Recommendations
    console.log('\n7️⃣ REBUILD RECOMMENDATIONS');
    console.log('=' .repeat(50));
    
    const issues = [];
    if (!session) issues.push('Authentication required');
    if (activeAccounts.length === 0) issues.push('No active trading accounts');
    if ((allSignals?.length || 0) === 0) issues.push('No signals in database');
    
    if (issues.length === 0) {
      console.log('✅ System appears healthy');
    } else {
      console.log('❌ Issues found:');
      issues.forEach((issue, i) => console.log(`   ${i+1}. ${issue}`));
      
      console.log('\n🛠️ REBUILD ACTIONS:');
      console.log('1. Go to your app');
      console.log('2. Sign in if not already signed in');
      console.log('3. Go to Settings → Live Trading Setup');
      console.log('4. Re-enter your Bybit API credentials');
      console.log('5. Test the connection');
      console.log('6. Go to Signals page and click "Generate New Signals"');
      console.log('7. Wait for signals to appear');
    }

    return true;

  } catch (error) {
    console.error('\n💥 REBUILD FAILED:', error);
    return false;
  }
}

// Run the rebuild
rebuildSystem().then(success => {
  if (success) {
    console.log('\n🎉 REBUILD ANALYSIS COMPLETE');
  } else {
    console.log('\n💥 REBUILD ANALYSIS FAILED');
  }
  console.log('\nNext steps: Follow the recommendations above');
});