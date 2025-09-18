// Test the immediate fixes
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testImmediateFixes() {
  console.log("🧪 Testing immediate fixes...");
  
  try {
    // Test 1: Database signals query
    console.log("1️⃣ Testing signals database access...");
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&score=gte.70`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    
    if (signalsResponse.ok) {
      console.log("✅ Signals database access working");
    } else {
      console.log("❌ Signals database access failed:", signalsResponse.status);
    }

    // Test 2: Demo signal generator
    console.log("2️⃣ Testing demo signal generator...");
    const demoResponse = await fetch(`${SUPABASE_URL}/functions/v1/demo-signal-generator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'test' })
    });

    if (demoResponse.ok) {
      const result = await demoResponse.json();
      console.log("✅ Demo signal generator working:", result.signals_generated, "signals");
    } else {
      console.log("❌ Demo signal generator failed:", demoResponse.status);
    }

    // Test 3: Live signal orchestrator
    console.log("3️⃣ Testing live signal orchestrator...");
    const orchestratorResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-signal-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'test' })
    });

    if (orchestratorResponse.ok) {
      const result = await orchestratorResponse.json();
      console.log("✅ Live signal orchestrator working:", result.live_signals_generated, "signals");
    } else {
      console.log("❌ Live signal orchestrator failed:", orchestratorResponse.status);
    }

    // Test 4: Check for recent signals
    console.log("4️⃣ Checking for recent signals...");
    const recentSignalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.70&created_at=gte.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    if (recentSignalsResponse.ok) {
      const signals = await recentSignalsResponse.json();
      console.log(`✅ Found ${signals.length} recent signals`);
      if (signals.length > 0) {
        console.log("📊 Sample signal:", signals[0].symbol, signals[0].direction, signals[0].score);
      }
    } else {
      console.log("❌ Recent signals check failed:", recentSignalsResponse.status);
    }

    console.log("🏁 Test completed");

  } catch (error) {
    console.error("💥 Test failed with error:", error);
  }
}

testImmediateFixes();