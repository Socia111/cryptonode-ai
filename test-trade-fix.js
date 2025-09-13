// Test script to verify trade execution fixes
// This tests the core trading functionality

async function testTradeExecution() {
  console.log('🧪 Testing Trade Execution Fix...');
  
  const testOrder = {
    action: 'place_order',
    symbol: 'BTCUSDT', // Safe, liquid symbol
    side: 'Buy',
    amountUSD: 25, // Minimum amount
    leverage: 25,   // 25x leverage as requested
    scalpMode: false
  };
  
  console.log('Test order parameters:', testOrder);
  
  try {
    const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-here'
      },
      body: JSON.stringify(testOrder)
    });
    
    const data = await response.json();
    console.log('Response:', {
      status: response.status,
      success: data.success,
      error: data.error,
      orderId: data.data?.orderId
    });
    
    if (data.success) {
      console.log('✅ Trade execution test PASSED');
    } else {
      console.log('❌ Trade execution test FAILED:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with network error:', error.message);
  }
}

// Run test
testTradeExecution();