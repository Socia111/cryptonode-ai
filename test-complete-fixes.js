// Comprehensive test for all trading fixes
console.log('🧪 Running Comprehensive Trading System Test...');

async function runCompleteTest() {
  const tests = [
    {
      name: 'Status Check',
      action: 'status'
    },
    {
      name: 'Small Trade (Testnet Safe)',
      action: 'place_order',
      symbol: 'BTCUSDT',
      side: 'Buy',
      amountUSD: 5,
      leverage: 25,
      scalpMode: false
    },
    {
      name: 'Scalping Mode Trade',
      action: 'place_order', 
      symbol: 'ETHUSDT',
      side: 'Sell',
      amountUSD: 1,
      leverage: 25,
      scalpMode: true
    }
  ];

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    
    try {
      const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(test)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ ${test.name} PASSED`);
        if (test.action === 'status') {
          console.log(`   Environment: ${data.environment || 'unknown'}`);
          console.log(`   Paper Mode: ${data.paper_mode || false}`);
        } else {
          console.log(`   Order ID: ${data.data?.orderId || 'N/A'}`);
          console.log(`   Paper Mode: ${data.data?.paperMode || false}`);
        }
      } else {
        console.log(`❌ ${test.name} FAILED: ${data.error}`);
        
        // Check for specific error types
        if (data.error?.includes('scaledLeverage')) {
          console.log(`   🔧 Variable scope error detected`);
        } else if (data.error?.includes('balance')) {
          console.log(`   💰 Balance error detected - expected in testnet`);
        } else if (data.error?.includes('reduce-only')) {
          console.log(`   🔄 Position mode error detected`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} NETWORK ERROR: ${error.message}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Test Suite Complete');
  console.log('\n📊 Expected Results:');
  console.log('   ✅ Status Check should pass');
  console.log('   ⚠️  Trade tests may fail due to testnet balance issues (this is normal)');
  console.log('   ❌ NO "scaledLeverage is not defined" errors should occur');
}

runCompleteTest().catch(console.error);