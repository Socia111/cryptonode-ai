// Trigger the comprehensive all-symbols scanner
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerComprehensiveScanner() {
  try {
    console.log("🚀 Triggering comprehensive all-symbols scanner...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'comprehensive_scan',
        batch_size: 50,
        max_symbols: 2000,
        timeframes: ['5m', '15m'],
        force_scan: true
      })
    });

    const result = await response.text();
    console.log("📊 Comprehensive scanner response:", result);

    if (!response.ok) {
      console.error("❌ Error:", response.status, result);
    } else {
      console.log("✅ Comprehensive scanner triggered successfully");
      console.log("📈 Expected: 2000+ symbols to be scanned with new algorithm");
    }
  } catch (error) {
    console.error("💥 Failed to trigger comprehensive scanner:", error);
  }
}

triggerComprehensiveScanner();