// Test API connection to identify the real issue
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testAPI() {
  console.log("🔧 Testing API Connection...");
  
  try {
    // Test debug trading status
    console.log("1. Testing debug function...");
    const debugResponse = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const debugResult = await debugResponse.json();
    console.log("Debug result:", debugResult);
    
    if (debugResult.environment) {
      console.log("\n🔑 API Keys Status:");
      console.log("- Has API Key:", debugResult.environment.hasApiKey);
      console.log("- Has API Secret:", debugResult.environment.hasApiSecret);
      console.log("- API Key Length:", debugResult.environment.apiKeyLength);
      console.log("- API Secret Length:", debugResult.environment.apiSecretLength);
      
      if (!debugResult.environment.hasApiKey || !debugResult.environment.hasApiSecret) {
        console.log("❌ Missing API credentials in Supabase environment!");
        console.log("Solution: Add BYBIT_API_KEY and BYBIT_API_SECRET to Supabase Edge Function secrets");
      }
    }
    
    // Test bybit live trading function
    console.log("\n2. Testing Bybit live trading function...");
    const tradingResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'status'
      })
    });
    
    const tradingResult = await tradingResponse.json();
    console.log("Trading status result:", tradingResult);
    
    // Test balance check
    console.log("\n3. Testing balance check...");
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
    
    if (balanceResult.error) {
      console.log("❌ Balance check failed:", balanceResult.error);
      if (balanceResult.error.includes("Missing API")) {
        console.log("Solution: Configure BYBIT_API_KEY and BYBIT_API_SECRET in Supabase");
      } else if (balanceResult.error.includes("signature")) {
        console.log("Solution: Check API key permissions and validity");
      }
    }
    
  } catch (error) {
    console.error("❌ API Test failed:", error);
  }
}

testAPI();