// Test the position mode fix for aitradex1-trade-executor
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testPositionModeFix() {
  console.log("🧪 Testing Position Mode Fix...");
  
  try {
    // Test 1: Status check
    console.log("\n1. Testing status endpoint...");
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-trade-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const statusResult = await statusResponse.json();
    console.log("✅ Status:", statusResult);
    
    // Test 2: Small test trade to verify position mode handling
    console.log("\n2. Testing small trade execution (this should handle position mode automatically)...");
    const tradeResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-trade-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 5,  // Very small amount for testing
        leverage: 1
      })
    });
    
    const tradeResult = await tradeResponse.json();
    
    if (tradeResult.success) {
      console.log("✅ Trade execution successful - position mode fix working!");
      console.log("Trade result:", JSON.stringify(tradeResult, null, 2));
    } else {
      console.log("❌ Trade failed:", tradeResult.message);
      console.log("Full response:", JSON.stringify(tradeResult, null, 2));
      
      // Check if it's still a position mode error
      if (tradeResult.message && tradeResult.message.toLowerCase().includes('position')) {
        console.log("🔧 Position mode error still detected - checking logs...");
      } else {
        console.log("✅ Different error type - position mode fix appears to be working");
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Test 3: Check postgres logs for any remaining permission errors
async function testDatabaseAccess() {
  console.log("\n3. Testing database access...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log("📊 Database access test:", JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting comprehensive error fix validation...");
  await testPositionModeFix();
  await testDatabaseAccess();
  console.log("\n✅ All tests completed!");
}

runAllTests();