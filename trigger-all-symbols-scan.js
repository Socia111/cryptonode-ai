// Trigger comprehensive all-symbols scanner with new production signal logic
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerAllSymbolsScanner() {
  console.log("🚀 Triggering ALL SYMBOLS SCANNER with Production Signal Logic");
  console.log("=" .repeat(70));

  try {
    console.log("📡 Starting comprehensive market scan across all exchanges...");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchanges: ['bybit', 'binance', 'okx'],
        use_production_logic: true,
        scan_all_usdt_pairs: true
      })
    });

    const result = await response.json();
    
    console.log("\n✅ ALL SYMBOLS SCANNER RESULTS:");
    console.log("=" .repeat(50));
    console.log(`📊 Total Symbols Scanned: ${result.total_symbols || 0}`);
    console.log(`🎯 High-Quality Signals Generated: ${result.signals_generated || 0}`);
    console.log(`📈 Markets Processed: ${result.markets_processed || 0}`);
    console.log(`⚡ Exchanges Covered: ${result.exchanges_scanned || 0}`);
    
    if (result.top_signals) {
      console.log("\n🏆 TOP SIGNALS FOUND:");
      result.top_signals.slice(0, 10).forEach((signal, i) => {
        console.log(`${i+1}. ${signal.symbol} ${signal.direction} - Score: ${signal.confidence}% (${signal.grade})`);
      });
    }

    if (result.scan_summary) {
      console.log("\n📋 SCAN SUMMARY:");
      Object.entries(result.scan_summary).forEach(([exchange, data]) => {
        console.log(`${exchange}: ${data.symbols_scanned} symbols, ${data.signals_found} signals`);
      });
    }

    console.log(`\n🔥 Successfully scanned ${result.total_symbols || 'all available'} cryptocurrency pairs!`);
    console.log("💡 Check your dashboard for the latest high-confidence signals!");
    
  } catch (error) {
    console.error("❌ Scanner failed:", error.message);
    console.error("💡 This might be due to high load - try again in a moment");
  }
}

// Execute the comprehensive scan
triggerAllSymbolsScanner();