// Quick test of the unified signal engine 
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testUnifiedEngine() {
  try {
    console.log("🚀 Testing unified signal engine (1h only)...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/unified-signal-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeframes: ["1h"],
        test_mode: true
      })
    });

    const result = await response.text();
    console.log("📊 Unified engine response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Unified engine test completed");
      
      try {
        const data = JSON.parse(result);
        console.log(`📈 Generated ${data.signals_generated} signals`);
        console.log(`🔧 Algorithm: ${data.algorithm}`);
        console.log(`📊 Scanned symbols: ${data.symbols_scanned}`);
      } catch (e) {
        console.log("Response was not JSON:", result);
      }
    }
  } catch (error) {
    console.error("💥 Failed to test unified engine:", error);
  }
}

testUnifiedEngine();