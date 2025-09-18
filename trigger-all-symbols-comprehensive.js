// Trigger comprehensive all-symbols scanner for maximum market coverage
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerComprehensiveScan() {
  console.log("🚀 Triggering Comprehensive All-Symbols Scanner...");
  console.log("📈 Scanning 2000+ symbols across Bybit, Binance, and CoinEx");

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'comprehensive',
        trigger: 'manual_comprehensive_scan',
        advanced_ai: true
      })
    });

    const result = await response.json();
    
    console.log("📊 Comprehensive Scan Result:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n✅ Comprehensive scan completed successfully!");
      console.log(`🏗️  Total symbols scanned: ${result.totalSymbolsScanned || 0}`);
      console.log(`📈 Market data points: ${result.marketDataPoints || 0}`);
      console.log(`🔥 AI signals generated: ${result.signalsGenerated || 0}`);
      console.log(`🌐 Exchanges covered: ${result.exchanges?.join(', ') || 'Multiple'}`);
      console.log(`⏰ Scan timestamp: ${result.timestamp}`);
      
      if (result.signalsGenerated > 0) {
        console.log("\n🎯 COMPREHENSIVE SCAN SUCCESS!");
        console.log("   - Advanced AI signal engine applied to all symbols");
        console.log("   - Multi-exchange coverage for maximum diversity");
        console.log("   - Real-time market data with technical analysis");
        console.log("   - Grade A+ and A signals prioritized");
      }
    } else {
      console.log("❌ Comprehensive scan failed!");
      console.log("Error:", result.error || 'Unknown error');
    }

  } catch (error) {
    console.error("💥 Comprehensive scan trigger failed:", error);
  }
}

triggerComprehensiveScan();