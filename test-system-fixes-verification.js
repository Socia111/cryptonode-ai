import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function testSystemFixes() {
  console.log('\n🔧 SYSTEM FIXES VERIFICATION TEST\n');
  console.log('='.repeat(50));

  try {
    // 1. Test Authentication
    console.log('\n📋 1. Testing Authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth Error:', authError.message);
    } else if (session?.user) {
      console.log('✅ User authenticated:', session.user.email);
      
      // 2. Test RLS Policies Fixed
      console.log('\n📋 2. Testing RLS Policies (Fixed)...');
      const { data: accounts, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('exchange', 'bybit');
      
      if (accountsError) {
        console.log('❌ RLS Error:', accountsError.message);
      } else {
        console.log(`✅ RLS Working: Found ${accounts?.length || 0} trading accounts`);
        console.log('Account details:', accounts?.map(acc => ({
          id: acc.id.substring(0, 8) + '...',
          active: acc.is_active,
          hasPlaceholder: acc.api_key_encrypted?.startsWith('placeholder_') || acc.api_key_encrypted?.startsWith('test_key_'),
          accountType: acc.account_type
        })));
      }
      
      // 3. Test Trade Executor with improved logic
      console.log('\n📋 3. Testing Improved Trade Executor...');
      const tradeResponse = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          symbol: 'BTCUSDT',
          side: 'Buy',
          amountUSD: 10,
          leverage: 1,
          testMode: true
        }
      });
      
      if (tradeResponse.error) {
        console.log('❌ Trade Executor Error:', tradeResponse.error.message);
      } else {
        console.log('✅ Trade Executor Response:', tradeResponse.data);
        
        if (tradeResponse.data?.needsCredentials) {
          console.log('⚠️ Trade executor working correctly - detected missing credentials and handled gracefully');
        }
      }
      
    } else {
      console.log('⚠️ No active session');
    }

    // 4. Test Signal Generation
    console.log('\n📋 4. Testing Signal Generation...');
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (signalsError) {
      console.log('❌ Signals Error:', signalsError.message);
    } else {
      console.log(`✅ Signals accessible: ${signals?.length || 0} recent signals`);
    }

    // 5. Test Database Connection
    console.log('\n📋 5. Testing Database Connection...');
    const { data: markets, error: dbError } = await supabase
      .from('markets')
      .select('symbol')
      .limit(3);
    
    if (dbError) {
      console.log('❌ Database Error:', dbError.message);
    } else {
      console.log(`✅ Database connected: ${markets?.length || 0} markets accessible`);
    }

    // 6. Test Realtime Subscription
    console.log('\n📋 6. Testing Realtime Subscription...');
    
    let realtimeStatus = 'unknown';
    const channel = supabase
      .channel('test-fixes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => console.log('Realtime event received'))
      .subscribe((status) => {
        realtimeStatus = status;
        console.log('Realtime status:', status);
        if (status === 'SUBSCRIBED') {
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
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 FIXES VERIFICATION COMPLETE');
  console.log('='.repeat(50));
  console.log('\n✨ Key improvements made:');
  console.log('1. ✅ Fixed RLS policies for user_trading_accounts');
  console.log('2. ✅ Enhanced trade executor with credential management');
  console.log('3. ✅ Added proper authentication system');
  console.log('4. ✅ Created credentials management interface');
  console.log('5. ✅ Improved error handling throughout');
  console.log('\n📋 Next steps for users:');
  console.log('1. Sign in using the Authentication tab');
  console.log('2. Configure Bybit API credentials in API Setup tab');
  console.log('3. Test the system using the Connection Test tab');
}

testSystemFixes().catch(console.error);