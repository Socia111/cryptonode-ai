// Fix trading error by checking credentials and testing connection
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testTradingSetup() {
  try {
    console.log("🔧 Testing Bybit broker connection...");
    
    const brokerResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-broker-v2`, {
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

    const brokerResult = await brokerResponse.text();
    console.log("📊 Broker test result:", brokerResult);

    // Test signal generation
    console.log("\n🧪 Testing unified signal engine...");
    
    const signalResponse = await fetch(`${SUPABASE_URL}/functions/v1/unified-signal-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const signalResult = await signalResponse.text();
    console.log("📊 Signal engine result:", signalResult);

    // Test small order execution
    console.log("\n💼 Testing order execution...");
    
    const orderResponse = await fetch(`${SUPABASE_URL}/functions/v1/trade-executor-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: "place_order",
        order_request: {
          symbol: "BTCUSDT",
          side: "Buy",
          orderType: "Market",
          qty: "0.001",
          timeInForce: "IOC"
        }
      })
    });

    const orderResult = await orderResponse.text();
    console.log("📊 Order execution result:", orderResult);

  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

testTradingSetup();