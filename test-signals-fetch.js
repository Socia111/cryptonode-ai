// Test signals fetch via API
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testSignalsFetch() {
  console.log("🧪 Testing signals fetch via API...");
  
  try {
    // Test 1: Get signals via existing API
    console.log("\n1. Testing existing signals API...");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/signals-api/recent`);
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ API Response:", result);
      if (result.signals && result.signals.length > 0) {
        console.log("🎯 Recent signals:");
        result.signals.forEach((signal, i) => {
          console.log(`  ${i+1}. ${signal.symbol} ${signal.direction} (Score: ${signal.score}) - ${new Date(signal.created_at).toLocaleString()}`);
        });
      } else {
        console.log("⚠️ No signals found");
      }
    } else {
      console.log(`❌ API call failed: ${response.status}`);
      const error = await response.text();
      console.log("Error:", error);
    }
    
    // Test 2: Trigger new scan  
    console.log("\n2. Triggering new scan...");
    const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/signals-api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeframes: ['15m'],
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
      })
    });
    
    if (scanResponse.ok) {
      const scanResult = await scanResponse.json();
      console.log("✅ Scan triggered:", scanResult);
    } else {
      console.log(`❌ Scan failed: ${scanResponse.status}`);
    }
    
    // Test 3: Get status
    console.log("\n3. Getting system status...");
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/signals-api/health`);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log("✅ System status:", status);
    } else {
      console.log(`❌ Status failed: ${statusResponse.status}`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSignalsFetch();