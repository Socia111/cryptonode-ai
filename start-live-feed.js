// Trigger live crypto feed to generate fresh signals
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerLiveCryptoFeed() {
  try {
    console.log("🚀 Starting live crypto feed to generate fresh signals...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/live-crypto-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_aitradex1: true,
        start_aira: true,
        symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
      })
    });

    const result = await response.text();
    console.log("📊 Live feed response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Live crypto feed started successfully");
      console.log("📈 Fresh signals should start appearing in real-time");
    }
  } catch (error) {
    console.error("💥 Failed to start live crypto feed:", error);
  }
}

triggerLiveCryptoFeed();