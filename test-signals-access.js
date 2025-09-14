// Test signals access and trigger new scan
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testSignalsAccess() {
  console.log("🧪 Testing signals access and live scanner...");
  
  try {
    // Test 1: Try to fetch signals directly via REST API
    console.log("\n1. Testing direct signals access...");
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=5`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      }
    });
    
    if (signalsResponse.ok) {
      const signals = await signalsResponse.json();
      console.log(`✅ Signals access: SUCCESS (${signals.length} signals found)`);
      console.log("Latest signal:", signals[0]);
    } else {
      console.log(`❌ Signals access: FAILED (${signalsResponse.status})`);
      const error = await signalsResponse.text();
      console.log("Error:", error);
    }
    
    // Test 2: Trigger live scanner
    console.log("\n2. Triggering live scanner...");
    const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-scanner-production`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange: "bybit",
        timeframe: "15m", 
        symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
      })
    });
    
    if (scanResponse.ok) {
      const scanResult = await scanResponse.json();
      console.log("✅ Live scanner: SUCCESS");
      console.log("Scan result:", scanResult);
    } else {
      console.log(`❌ Live scanner: FAILED (${scanResponse.status})`);
      const error = await scanResponse.text();
      console.log("Error:", error);
    }
    
    // Test 3: Check signals again after scan
    console.log("\n3. Checking signals after scan...");
    const newSignalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=3`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      }
    });
    
    if (newSignalsResponse.ok) {
      const newSignals = await newSignalsResponse.json();
      console.log(`✅ Post-scan signals: SUCCESS (${newSignals.length} signals)`);
      newSignals.forEach((signal, i) => {
        console.log(`Signal ${i+1}: ${signal.symbol} ${signal.direction} (Score: ${signal.score})`);
      });
    } else {
      console.log(`❌ Post-scan signals: FAILED (${newSignalsResponse.status})`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSignalsAccess();