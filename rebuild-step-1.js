// Test Fixed Trade Executor
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🔧 AItradeX1 System Rebuild Test - Step 1');

async function rebuildStep1() {
  try {
    console.log('\n=== STEP 1: Core System Status ===');
    
    // 1. Check Authentication
    console.log('\n1️⃣ Checking Authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No user session found');
      console.log('💡 Please sign in to proceed with rebuild verification');
      return false;
    }
    console.log('✅ User authenticated:', session.user.email);

    // 2. Check Database Tables
    console.log('\n2️⃣ Checking Core Database Tables...');
    const tables = ['signals', 'user_trading_accounts', 'markets'];
    const tableResults = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
          tableResults.push({ table, status: 'error', error: error.message });
        } else {
          console.log(`✅ Table ${table}: Accessible`);
          tableResults.push({ table, status: 'ok' });
        }
      } catch (e) {
        console.log(`❌ Table ${table}: ${e.message}`);
        tableResults.push({ table, status: 'error', error: e.message });
      }
    }

    // 3. Check Trading Account Configuration
    console.log('\n3️⃣ Checking Trading Account Setup...');
    const { data: accounts, error: accountError } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('user_id', session.user.id);

    if (accountError) {
      console.log('❌ Error accessing trading accounts:', accountError.message);
    } else if (!accounts || accounts.length === 0) {
      console.log('⚠️ No trading accounts configured');
      console.log('💡 Step 2 will include setting up Bybit connection');
    } else {
      console.log('✅ Trading accounts found:', accounts.length);
      accounts.forEach(acc => {
        console.log(`   - ${acc.exchange} (${acc.account_type}): ${acc.is_active ? 'Active' : 'Inactive'}`);
      });
    }

    // 4. Test Edge Function Availability
    console.log('\n4️⃣ Testing Core Edge Functions...');
    const { data: statusData, error: statusError } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: { action: 'status' }
    });

    if (statusError) {
      console.log('❌ Trade executor not accessible:', statusError.message);
    } else {
      console.log('✅ Trade executor status:', statusData);
    }

    // 5. Check Signal Generation
    console.log('\n5️⃣ Checking Recent Signals...');
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (signalsError) {
      console.log('❌ Signals access error:', signalsError.message);
    } else {
      console.log(`✅ Recent signals: ${signals.length} found`);
      if (signals.length > 0) {
        console.log('   Latest signal:', {
          symbol: signals[0].symbol,
          direction: signals[0].direction,
          score: signals[0].score,
          created: signals[0].created_at
        });
      }
    }

    console.log('\n=== STEP 1 SUMMARY ===');
    console.log('🔧 Core system components checked');
    console.log('📊 Database tables: ' + (tableResults.filter(r => r.status === 'ok').length) + '/' + tables.length + ' accessible');
    console.log('🔐 Authentication: Working');
    console.log('⚡ Edge functions: ' + (statusError ? 'Issues detected' : 'Accessible'));
    console.log('📈 Signal system: ' + (signalsError ? 'Issues detected' : 'Working'));

    if (accounts && accounts.length > 0) {
      console.log('\n🚀 Ready for Step 2: Trading System Verification');
    } else {
      console.log('\n💡 Step 2 will include: Bybit account setup and trading verification');
    }

    return true;

  } catch (error) {
    console.error('💥 Rebuild Step 1 failed:', error);
    return false;
  }
}

rebuildStep1().then(success => {
  if (success) {
    console.log('\n✅ Step 1 completed successfully');
    console.log('📝 Run rebuild-step-2.js to continue');
  } else {
    console.log('\n❌ Step 1 failed - address issues before proceeding');
  }
});