// Quick test to verify the trading system tests are working
console.log('🔧 Testing trading system components...');

async function runTradingTests() {
  console.log('\n1️⃣ Testing Connection...');
  try {
    const connectionResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });
    
    const connectionData = await connectionResponse.json();
    console.log('✅ Connection Test:', connectionData.ok ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('❌ Connection Test: FAILED -', error.message);
  }

  console.log('\n2️⃣ Testing Balance Check...');
  try {
    const balanceResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/bybit-live-trading', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'balance' })
    });
    
    const balanceData = await balanceResponse.json();
    console.log('Balance Response:', balanceData);
    
    // Balance might fail due to credentials, but should return proper structure
    if (balanceData.hasOwnProperty('success')) {
      console.log('✅ Balance Check: Structure OK');
      if (balanceData.success) {
        console.log('💰 Balance available:', balanceData.data?.availableBalance || 'N/A');
      } else {
        console.log('⚠️ Balance Check: Expected failure -', balanceData.message || balanceData.error);
      }
    } else {
      console.log('❌ Balance Check: FAILED - Invalid response structure');
    }
  } catch (error) {
    console.log('❌ Balance Check: FAILED -', error.message);
  }

  console.log('\n3️⃣ Testing Paper Trade...');
  try {
    const tradeResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy', 
        amountUSD: 1,
        leverage: 25,
        scalpMode: true,
        orderType: 'market'
      })
    });
    
    const tradeData = await tradeResponse.json();
    console.log('✅ Paper Trade Test:', tradeData.success ? 'PASSED' : 'FAILED');
    if (tradeData.success) {
      console.log('📄 Paper Order:', tradeData.data?.orderId || 'N/A');
    } else {
      console.log('⚠️ Trade Error:', tradeData.error || tradeData.message);
    }
  } catch (error) {
    console.log('❌ Paper Trade Test: FAILED -', error.message);
  }

  console.log('\n4️⃣ Testing Signals Access...');
  try {
    const signalsResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/signals-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recent' })
    });
    
    const signalsData = await signalsResponse.json();
    console.log('✅ Signals Access:', signalsData.success ? 'PASSED' : 'FAILED');
    if (signalsData.success) {
      console.log('📊 Signals Available:', signalsData.signals?.length || 0);
    } else {
      console.log('⚠️ Signals Error:', signalsData.error);
    }
  } catch (error) {
    console.log('❌ Signals Test: FAILED -', error.message);
  }

  console.log('\n🎯 Trading system test completed!');
}

runTradingTests();