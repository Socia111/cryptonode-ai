// Test balance checking and testnet trading
console.log('🧪 Testing Balance Check and Testnet Trading...');

async function testBalanceAndTrading() {
  const testOrder = {
    action: 'place_order',
    symbol: 'BTCUSDT',
    side: 'Buy',
    amountUSD: 5, // Small amount for testnet
    leverage: 25,
    scalpMode: false
  };
  
  console.log('📊 Test order (small amount for testnet):', testOrder);
  
  try {
    // First check status
    const statusResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const statusData = await statusResponse.json();
    console.log('🔍 Status check:', statusData);
    
    // Then try the trade
    const tradeResponse = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testOrder)
    });
    
    const tradeData = await tradeResponse.json();
    console.log('💼 Trade result:', {
      status: tradeResponse.status,
      success: tradeData.success,
      error: tradeData.error,
      data: tradeData.data
    });
    
    if (tradeData.success) {
      console.log('✅ Balance check and trade execution PASSED');
    } else {
      console.log('❌ Trade failed:', tradeData.error);
      if (tradeData.error?.includes('balance')) {
        console.log('💡 Balance issue detected - this is expected if testnet account has no funds');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testBalanceAndTrading();