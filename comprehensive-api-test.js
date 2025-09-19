// Enhanced API Connection Test
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function runComprehensiveAPITest() {
  console.log("🧪 Running Comprehensive API Connection Test...");
  console.log("================================================");
  
  try {
    // 1. Test Debug Function
    console.log("\n1️⃣ Testing Debug Trading Status...");
    const debugResponse = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const debugResult = await debugResponse.json();
    
    if (debugResult.environment) {
      console.log("✅ Environment Status:");
      console.log(`   - API Key: ${debugResult.environment.hasApiKey ? '✅ Present' : '❌ Missing'}`);
      console.log(`   - API Secret: ${debugResult.environment.hasApiSecret ? '✅ Present' : '❌ Missing'}`);
      console.log(`   - Base URL: ${debugResult.environment.baseUrl || 'Not configured'}`);
      console.log(`   - Live Trading: ${debugResult.environment.liveTrading ? '🔴 Enabled' : '📋 Disabled'}`);
      console.log(`   - Environment: ${debugResult.environment.isTestnet ? 'Testnet' : 'Mainnet'}`);
      
      if (debugResult.environment.configurationStatus === 'MISSING_CREDENTIALS') {
        console.log("\n❌ CRITICAL: Missing API credentials!");
        console.log("   Solution: Add BYBIT_API_KEY and BYBIT_API_SECRET to Supabase Edge Function secrets");
        return;
      }
    }
    
    if (debugResult.bybit) {
      console.log("\n🌐 Bybit Connectivity:");
      console.log(`   - Connected: ${debugResult.bybit.connected ? '✅ Yes' : '❌ No'}`);
      if (debugResult.bybit.error) {
        console.log(`   - Error: ${debugResult.bybit.error}`);
      }
      if (debugResult.bybit.serverTime) {
        console.log(`   - Server Time: ${new Date(debugResult.bybit.serverTime * 1000).toISOString()}`);
      }
    }
    
    // 2. Test Bybit Live Trading Function
    console.log("\n2️⃣ Testing Bybit Live Trading Function...");
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });
    
    const statusResult = await statusResponse.json();
    console.log("📊 Function Status:", statusResult.success ? '✅ Healthy' : '❌ Unhealthy');
    
    if (statusResult.environment) {
      console.log("🔧 Function Environment:");
      console.log(`   - API Key: ${statusResult.environment.hasApiKey ? '✅' : '❌'}`);
      console.log(`   - API Secret: ${statusResult.environment.hasApiSecret ? '✅' : '❌'}`);
      console.log(`   - Base URL: ${statusResult.environment.baseUrl}`);
      console.log(`   - Live Trading: ${statusResult.environment.liveTrading ? '🔴' : '📋'}`);
    }
    
    if (statusResult.connectivity) {
      console.log("🔌 Connectivity Test:");
      console.log(`   - Bybit API: ${statusResult.connectivity.connected ? '✅ Connected' : '❌ Failed'}`);
    }
    
    // 3. Test Balance Check (if credentials are available)
    if (statusResult.success && statusResult.environment?.hasApiKey) {
      console.log("\n3️⃣ Testing Balance Check...");
      const balanceResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'balance' })
      });
      
      const balanceResult = await balanceResponse.json();
      if (balanceResult.success) {
        console.log("✅ Balance check successful!");
        if (balanceResult.data?.list) {
          console.log(`   - Accounts found: ${balanceResult.data.list.length}`);
        }
      } else {
        console.log("❌ Balance check failed:", balanceResult.error);
        if (balanceResult.error?.includes('signature')) {
          console.log("   🔧 Likely issue: API signature validation failed");
          console.log("   💡 Check: API key permissions, secret correctness, time sync");
        }
      }
    }
    
    // 4. Summary and Recommendations
    console.log("\n📋 SUMMARY & NEXT STEPS:");
    console.log("========================");
    
    if (!debugResult.environment?.hasApiKey || !debugResult.environment?.hasApiSecret) {
      console.log("❌ BLOCKING ISSUE: Missing API credentials");
      console.log("   1. Go to: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/settings/functions");
      console.log("   2. Add secrets: BYBIT_API_KEY and BYBIT_API_SECRET");
      console.log("   3. Optional: Add BYBIT_BASE and LIVE_TRADING_ENABLED");
      console.log("   4. Redeploy functions (happens automatically)");
    } else if (!debugResult.bybit?.connected) {
      console.log("❌ CONNECTIVITY ISSUE: Cannot reach Bybit API");
      console.log("   - Check internet connectivity");
      console.log("   - Verify base URL is correct");
      console.log("   - Check for firewall/proxy issues");
    } else {
      console.log("✅ API configuration looks good!");
      console.log("   - Credentials are present");
      console.log("   - Bybit API is reachable");
      console.log("   - Ready for trading operations");
    }
    
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("   - Check if Edge Functions are deployed");
    console.log("   - Verify function names are correct");
    console.log("   - Check Supabase project connectivity");
  }
}

// Run the test
runComprehensiveAPITest();