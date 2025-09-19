// Quick API Credentials Test
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function quickCredentialsTest() {
  console.log("🔬 Quick API Credentials Test");
  console.log("============================");
  
  try {
    // Test the updated debug function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.environment) {
      console.log("📊 Configuration Status:");
      console.log(`✅ API Key: ${result.environment.hasApiKey ? 'Present' : '❌ Missing'}`);
      console.log(`✅ API Secret: ${result.environment.hasApiSecret ? 'Present' : '❌ Missing'}`);
      console.log(`🌍 Base URL: ${result.environment.baseUrl || 'Default'}`);
      console.log(`🔴 Live Trading: ${result.environment.liveTrading ? 'Enabled' : 'Disabled'}`);
      console.log(`🧪 Environment: ${result.environment.isTestnet ? 'Testnet' : 'Mainnet'}`);
      
      if (result.environment.configurationStatus === 'MISSING_CREDENTIALS') {
        console.log("\n❌ PROBLEM IDENTIFIED:");
        console.log("   Missing BYBIT_API_KEY or BYBIT_API_SECRET");
        console.log("\n🔧 SOLUTION:");
        console.log("   1. Go to: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/settings/functions");
        console.log("   2. Click 'Add Secret'");
        console.log("   3. Add: BYBIT_API_KEY = <your-api-key>");
        console.log("   4. Add: BYBIT_API_SECRET = <your-api-secret>");
        console.log("   5. Optional: Add BYBIT_BASE = https://api-testnet.bybit.com (for testnet)");
        console.log("   6. Optional: Add LIVE_TRADING_ENABLED = false (keep false for testing)");
        return;
      } else {
        console.log("\n✅ Credentials are configured!");
      }
    }
    
    if (result.bybit) {
      console.log("\n🌐 Bybit Connectivity:");
      console.log(`   Status: ${result.bybit.connected ? '✅ Connected' : '❌ Failed'}`);
      if (result.bybit.error) {
        console.log(`   Error: ${result.bybit.error}`);
      }
    }
    
    // Test the bybit live trading function
    console.log("\n🔄 Testing Bybit Live Trading Function...");
    const tradingResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });
    
    const tradingResult = await tradingResponse.json();
    
    if (tradingResult.success) {
      console.log("✅ Bybit Live Trading Function: Working");
      if (tradingResult.data?.environment) {
        console.log(`   - API Keys: ${tradingResult.data.environment.hasApiKey && tradingResult.data.environment.hasApiSecret ? '✅' : '❌'}`);
        console.log(`   - Connectivity: ${tradingResult.data.connectivity?.connected ? '✅' : '❌'}`);
      }
    } else {
      console.log("❌ Bybit Live Trading Function: Failed");
      console.log(`   Error: ${tradingResult.error}`);
      
      if (tradingResult.code === 'MISSING_CREDENTIALS') {
        console.log("\n🔧 This confirms the credentials issue - follow the solution above!");
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

quickCredentialsTest();