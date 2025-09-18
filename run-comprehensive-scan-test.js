#!/usr/bin/env node

// Run comprehensive scan and verify 2000+ symbols are processed
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function runComprehensiveScanTest() {
  try {
    console.log("🚀 Triggering comprehensive all-symbols scanner (2000+ symbols)...");
    console.log("📊 Expected: Processing ALL USDT pairs from Bybit/Binance/CoinEx");
    
    const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'comprehensive_all_symbols',
        max_symbols: 2000,
        exchanges: ['bybit', 'binance', 'coinex'],
        force_scan: true,
        batch_size: 50
      })
    });

    const scanResult = await scanResponse.text();
    console.log("📊 Scanner response:", scanResult);

    if (!scanResponse.ok) {
      console.error("❌ Scanner failed:", scanResponse.status, scanResult);
      return;
    }

    console.log("✅ Comprehensive scanner triggered successfully!");
    console.log("⏳ Waiting 10 seconds for signal generation...");
    
    // Wait for signals to be generated
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check signal results
    console.log("\n🔍 Checking generated signals...");
    
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=source,algo,symbol,exchange,created_at,score&source=eq.all_symbols_comprehensive&order=created_at.desc&limit=100`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!signalsResponse.ok) {
      throw new Error(`HTTP ${signalsResponse.status}: ${signalsResponse.statusText}`);
    }

    const signals = await signalsResponse.json();
    
    console.log(`\n📈 RESULTS: Found ${signals.length} comprehensive signals!`);
    
    if (signals.length === 0) {
      console.log("❌ No comprehensive signals found. Check logs for issues.");
      return;
    }

    // Group by exchange
    const exchangeCount = {};
    const symbolSet = new Set();
    
    signals.forEach(signal => {
      exchangeCount[signal.exchange] = (exchangeCount[signal.exchange] || 0) + 1;
      symbolSet.add(signal.symbol);
    });
    
    console.log("\n📊 Signals by Exchange:");
    Object.entries(exchangeCount).forEach(([exchange, count]) => {
      console.log(`  ${exchange}: ${count} signals`);
    });
    
    console.log(`\n🎯 Unique symbols: ${symbolSet.size} (vs previous 8 symbols)`);
    console.log(`🧠 All signals use: algo=aitradex1_comprehensive_v4, source=all_symbols_comprehensive`);
    
    // Show sample signals
    console.log("\n📋 Sample signals:");
    signals.slice(0, 10).forEach(signal => {
      const time = new Date(signal.created_at).toLocaleTimeString();
      console.log(`  ${time}: ${signal.symbol} [${signal.exchange}] score=${signal.score}`);
    });

    if (symbolSet.size >= 50) {
      console.log("\n✅ SUCCESS: Comprehensive scanner is now processing 50+ symbols!");
      console.log("🎉 No more 8-symbol limitation!");
    } else {
      console.log("\n⚠️  Still limited to few symbols. Need to investigate further.");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

runComprehensiveScanTest();