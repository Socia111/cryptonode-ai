// Test Bybit API connection with improved error handling
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testBybitConnection() {
  console.log("🔧 Testing Bybit API Connection...");
  
  try {
    // Test 1: Status check
    console.log("\n1. Testing status check...");
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'status'
      })
    });
    
    const statusResult = await statusResponse.json();
    console.log("Status result:", statusResult);
    
    if (statusResult.success) {
      console.log("✅ Bybit API connection successful");
      console.log("- Environment:", statusResult.data.environment);
      console.log("- Connectivity:", statusResult.data.connectivity);
    } else {
      console.log("❌ Status check failed:", statusResult.error);
      return;
    }
    
    // Test 2: Balance check (if credentials are configured)
    console.log("\n2. Testing balance check...");
    const balanceResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'balance'
      })
    });
    
    const balanceResult = await balanceResponse.json();
    console.log("Balance result:", balanceResult);
    
    if (balanceResult.success) {
      console.log("✅ Balance check successful");
      console.log("- Account data:", balanceResult.data);
    } else {
      console.log("❌ Balance check failed:", balanceResult.error);
      console.log("- Error code:", balanceResult.code);
      
      if (balanceResult.code === 'MISSING_CREDENTIALS') {
        console.log("\n🔑 SOLUTION: Configure Bybit API credentials in Supabase");
        console.log("1. Go to Supabase Dashboard → Functions → Secrets");
        console.log("2. Add BYBIT_API_KEY with your Bybit API key");
        console.log("3. Add BYBIT_API_SECRET with your Bybit API secret");
        console.log("4. Make sure the keys have trading permissions enabled");
      }
    }
    
    // Test 3: Positions check
    console.log("\n3. Testing positions check...");
    const positionsResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'positions'
      })
    });
    
    const positionsResult = await positionsResponse.json();
    console.log("Positions result:", positionsResult);
    
    if (positionsResult.success) {
      console.log("✅ Positions check successful");
    } else {
      console.log("❌ Positions check failed:", positionsResult.error);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\n🔍 Debugging tips:");
    console.log("1. Check if Supabase edge functions are deployed");
    console.log("2. Verify API credentials are properly configured");
    console.log("3. Check network connectivity");
    console.log("4. Review edge function logs in Supabase dashboard");
  }
}

testBybitConnection();