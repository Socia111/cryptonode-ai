// Trigger comprehensive all-symbols scanner (1000+ coins)
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerComprehensiveScan() {
  console.log("🚀 TRIGGERING COMPREHENSIVE ALL-SYMBOLS SCANNER");
  console.log("=" .repeat(80));
  console.log("📊 Scanning 1000+ cryptocurrency pairs across Bybit, Binance, CoinEx");
  console.log("⚡ Using production-grade signal engine with full technical analysis");
  console.log("🎯 EMA21↔SMA200 + Volume Spike + HVP + Stoch + DMI/ADX confirmations");
  console.log("=" .repeat(80));

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comprehensive_scan: true,
        use_production_engine: true,
        exchanges: ['bybit', 'binance', 'coinex'],
        max_symbols: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n🎉 COMPREHENSIVE SCAN COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log(`⏱️  Scan Duration: ${duration} seconds`);
    console.log(`📊 Total Symbols Scanned: ${result.totalSymbolsScanned || 0}`);
    console.log(`📈 Market Data Points: ${result.marketDataPoints || 0}`);
    console.log(`🎯 High-Quality Signals Generated: ${result.signalsGenerated || 0}`);
    console.log(`⚡ Exchanges Covered: ${result.exchanges?.length || 0} (${result.exchanges?.join(', ') || 'Unknown'})`);
    
    if (result.signalsGenerated > 0) {
      console.log("\n✨ SUCCESS! New signals are now available in your dashboard!");
      console.log("🔄 Real-time signals are updating automatically");
      console.log("💡 Check the Signals page to see all discovered opportunities");
    } else {
      console.log("\n📋 No new signals found in current market conditions");
      console.log("💡 The scanner will continue monitoring for new opportunities");
    }

    console.log("\n🚀 The comprehensive scanner is now active!");
    console.log("📱 Your dashboard will show signals from 1000+ cryptocurrency pairs");
    
  } catch (error) {
    console.error("\n❌ COMPREHENSIVE SCAN FAILED:");
    console.error("Error:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error("• Check network connection");
    console.error("• Verify Supabase edge functions are running");
    console.error("• Try again in a few moments if this was a temporary issue");
  }
}

// Execute the comprehensive scan
console.log("🎬 Starting comprehensive cryptocurrency market scan...");
triggerComprehensiveScan().then(() => {
  console.log("\n✅ Scan process completed!");
}).catch(err => {
  console.error("\n💥 Fatal error:", err);
});