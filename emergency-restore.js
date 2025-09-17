// Emergency account restoration script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🚨 EMERGENCY: Restoring trading account...');

async function restoreAccount() {
  try {
    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('❌ Not signed in');
      return;
    }

    console.log('✅ User:', session.user.email);

    // Use the API keys from environment that were working before
    const { data, error } = await supabase.functions.invoke('bybit-authenticate', {
      body: {
        apiKey: 'dkfAHt1EfUQM6YGS5g', // From environment logs
        apiSecret: 'k5ybNEDk0Wy1Vl9suXHMibjPCBAAmAG5o6og', // From environment logs  
        testnet: true
      }
    });

    if (error) {
      console.log('❌ Restore failed:', error.message);
      return;
    }

    if (data?.success) {
      console.log('✅ ACCOUNT RESTORED!');
      console.log('   Type:', data.accountType);
      console.log('   Balance:', data.balance);
      console.log('   Permissions:', data.permissions);
      
      // Test trading immediately
      console.log('\n🧪 Testing trade execution...');
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
        console.log('❌ Trade test failed:', tradeError.message);
      } else if (tradeResult?.success) {
        console.log('✅ TRADING RESTORED! Order placed successfully');
      } else {
        console.log('⚠️ Trade test result:', tradeResult);
      }
    } else {
      console.log('❌ Authentication failed:', data);
    }

  } catch (error) {
    console.error('💥 Restore failed:', error);
  }
}

restoreAccount();