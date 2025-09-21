// Test the unified signal engine
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testUnifiedEngine() {
  try {
    console.log("🧪 Testing Unified Signal Engine...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/unified-signal-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        scan_symbols: ["BTCUSDT", "ETHUSDT"]
      })
    });

    const result = await response.text();
    console.log("📊 Unified engine response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Unified signal engine test completed");
    }
  } catch (error) {
    console.error("💥 Failed to test unified engine:", error);
  }
}

async function testBybitBroker() {
  try {
    console.log("🧪 Testing Bybit Broker V2...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bybit-broker-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: "test_connection"
      })
    });

    const result = await response.text();
    console.log("📊 Bybit broker response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Bybit broker test completed");
    }
  } catch (error) {
    console.error("💥 Failed to test bybit broker:", error);
  }
}

// Run tests
testUnifiedEngine();
testBybitBroker();