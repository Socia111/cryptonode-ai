// Quick script to trigger live crypto feed manually
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerScan() {
  try {
    console.log("🚀 Triggering live crypto feed...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/live-crypto-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.text();
    console.log("📊 Response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Successfully triggered crypto feed");
    }
  } catch (error) {
    console.error("💥 Failed to trigger scan:", error);
  }
}

triggerScan();