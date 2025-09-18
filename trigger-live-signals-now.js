// Immediately trigger live signal generation
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerLiveSignals() {
  try {
    console.log("🚀 Triggering live signal orchestrator...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/live-signal-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.text();
    console.log("📊 Live signal orchestrator response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Live signals should be generated now");
    }
  } catch (error) {
    console.error("💥 Failed to trigger live signals:", error);
  }
}

triggerLiveSignals();