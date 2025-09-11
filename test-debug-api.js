// Debug API configuration script
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testDebugStatus() {
  console.log("🧪 Testing API Debug Status...");
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log("📊 Debug Results:", JSON.stringify(result, null, 2));
    
    if (result.environment) {
      console.log("\n🔑 API Keys Status:");
      console.log("- BYBIT_API_KEY configured:", result.environment.hasApiKey);
      console.log("- BYBIT_API_SECRET configured:", result.environment.hasApiSecret);
      console.log("- API Key length:", result.environment.apiKeyLength);
      console.log("- API Secret length:", result.environment.apiSecretLength);
      
      if (result.environment.rawApiKey) {
        console.log("- Raw API Key (first 10 chars):", result.environment.rawApiKey.substring(0, 10));
      }
    }
    
    if (result.bybit) {
      console.log("\n🌐 Bybit Connectivity:");
      console.log("- Connected to Bybit:", result.bybit.connected);
      if (result.bybit.error) {
        console.log("- Connection error:", result.bybit.error);
      }
    }
    
  } catch (error) {
    console.error("❌ Debug test failed:", error);
  }
}

testDebugStatus();