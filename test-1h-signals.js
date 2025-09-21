// Test the unified signal engine with 1h signals only
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function test1HourSignals() {
  try {
    console.log("🚀 Testing 1-hour unified signal engine...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/unified-signal-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test_mode: true,
        timeframes: ["1h"]
      })
    });

    const result = await response.text();
    console.log("📊 1h signal engine response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ 1-hour unified signal engine test completed");
      
      // Parse and check results
      try {
        const data = JSON.parse(result);
        console.log(`📈 Generated ${data.signals_generated} signals across ${data.symbols_scanned} symbols`);
        console.log(`⏰ Using algorithm: ${data.algorithm}`);
      } catch (e) {
        console.log("Response was not JSON:", result);
      }
    }
  } catch (error) {
    console.error("💥 Failed to test 1h signals:", error);
  }
}

test1HourSignals();