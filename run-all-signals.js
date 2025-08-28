// Comprehensive signal generation trigger - Run ALL systems
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "DOTUSDT", "LINKUSDT", "LTCUSDT"];

async function runAllSignalGenerators() {
  console.log("🚀 STARTING COMPREHENSIVE SIGNAL GENERATION");
  console.log("=" .repeat(60));

  const results = {
    freeCryptoAPI: null,
    liveScanner: [],
    enhancedSignals: null,
    liveCryptoFeed: null,
    errors: []
  };

  try {
    // 1. Free Crypto API Integration - Enhanced Signals
    console.log("\n🔥 1. Free Crypto API - Enhanced Signal Generation");
    try {
      const freeApiResponse = await fetch(`${SUPABASE_URL}/functions/v1/free-crypto-api-integration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_enhanced_signals',
          symbols: symbols
        })
      });

      const freeApiResult = await freeApiResponse.json();
      results.freeCryptoAPI = freeApiResult;
      console.log(`✅ Free Crypto API: ${freeApiResult.success ? freeApiResult.count || 0 : 0} signals generated`);
    } catch (error) {
      console.error("❌ Free Crypto API failed:", error.message);
      results.errors.push({ source: 'Free Crypto API', error: error.message });
    }

    // 2. Live Scanner Production - Multiple Timeframes
    console.log("\n📊 2. Live Scanner Production - Multi-Timeframe");
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      try {
        console.log(`  🔍 Scanning ${timeframe}...`);
        const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-scanner-production`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exchange: 'bybit',
            timeframe: timeframe,
            relaxed_filters: true,
            symbols: [] // Scan all available pairs
          })
        });

        const scanResult = await scanResponse.json();
        results.liveScanner.push({
          timeframe: timeframe,
          success: scanResult.success,
          signals_found: scanResult.signals_found || 0,
          symbols_scanned: scanResult.symbols_scanned || 0
        });
        
        console.log(`  ✅ ${timeframe}: ${scanResult.signals_found || 0} signals from ${scanResult.symbols_scanned || 0} symbols`);
        
        // Rate limiting between timeframes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  ❌ ${timeframe} scan failed:`, error.message);
        results.errors.push({ source: `Live Scanner ${timeframe}`, error: error.message });
      }
    }

    // 3. Enhanced Signal Generation
    console.log("\n⚡ 3. Enhanced Signal Generation");
    try {
      const enhancedResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: symbols,
          timeframes: ['5m', '15m', '1h'],
          enhanced_mode: true
        })
      });

      const enhancedResult = await enhancedResponse.json();
      results.enhancedSignals = enhancedResult;
      console.log(`✅ Enhanced Signals: ${enhancedResult.success ? 'Generated' : 'Failed'}`);
    } catch (error) {
      console.error("❌ Enhanced Signal Generation failed:", error.message);
      results.errors.push({ source: 'Enhanced Signals', error: error.message });
    }

    // 4. Live Crypto Feed (AITRADEX1 + AIRA)
    console.log("\n🌊 4. Live Crypto Feed (AITRADEX1 + AIRA)");
    try {
      const feedResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-crypto-feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_aitradex1: true,
          start_aira: true,
          symbols: symbols
        })
      });

      const feedResult = await feedResponse.text();
      results.liveCryptoFeed = feedResult;
      console.log("✅ Live Crypto Feed: Started AITRADEX1 + AIRA algorithms");
    } catch (error) {
      console.error("❌ Live Crypto Feed failed:", error.message);
      results.errors.push({ source: 'Live Crypto Feed', error: error.message });
    }

    // 5. Scanner Engine Backup
    console.log("\n🔧 5. Scanner Engine Backup");
    try {
      const scannerResponse = await fetch(`${SUPABASE_URL}/functions/v1/scanner-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: 'bybit',
          timeframe: '1h',
          symbols: symbols.slice(0, 5) // Limit to prevent timeout
        })
      });

      const scannerResult = await scannerResponse.json();
      console.log(`✅ Scanner Engine: ${scannerResult.success ? 'Completed' : 'Failed'}`);
    } catch (error) {
      console.error("❌ Scanner Engine failed:", error.message);
      results.errors.push({ source: 'Scanner Engine', error: error.message });
    }

  } catch (globalError) {
    console.error("💥 Global error:", globalError);
    results.errors.push({ source: 'Global', error: globalError.message });
  }

  // Summary Report
  console.log("\n" + "=".repeat(60));
  console.log("📈 SIGNAL GENERATION SUMMARY");
  console.log("=".repeat(60));
  
  console.log("\n🔥 Free Crypto API:");
  console.log(`   Signals: ${results.freeCryptoAPI?.count || 0}`);
  
  console.log("\n📊 Live Scanner Results:");
  results.liveScanner.forEach(scan => {
    console.log(`   ${scan.timeframe}: ${scan.signals_found} signals (${scan.symbols_scanned} symbols scanned)`);
  });
  
  console.log("\n⚡ Enhanced Signals:");
  console.log(`   Status: ${results.enhancedSignals?.success ? 'Success' : 'Failed'}`);
  
  console.log("\n🌊 Live Crypto Feed:");
  console.log(`   Status: ${results.liveCryptoFeed ? 'Started' : 'Failed'}`);
  
  if (results.errors.length > 0) {
    console.log("\n❌ Errors encountered:");
    results.errors.forEach(err => {
      console.log(`   ${err.source}: ${err.error}`);
    });
  }
  
  console.log("\n✨ All signal generation systems have been triggered!");
  console.log("🔄 Fresh signals should start appearing in the dashboard momentarily...");
  
  return results;
}

// Execute immediately
runAllSignalGenerators()
  .then(results => {
    console.log("\n🎉 Signal generation pipeline completed!");
    console.log("💡 Check your dashboard for new signals!");
  })
  .catch(error => {
    console.error("💥 Pipeline failed:", error);
  });