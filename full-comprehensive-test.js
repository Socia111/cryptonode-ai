// Full comprehensive scanner test
console.log("🚀 STARTING COMPREHENSIVE SCANNER FULL TEST");
console.log("============================================");

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function fullComprehensiveTest() {
  try {
    // Step 1: Get baseline signal counts
    console.log("\n📊 Step 1: Getting baseline signal counts...");
    
    const baselineResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=source,algo,symbol,score,created_at&order=created_at.desc&limit=1000`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const baselineSignals = await baselineResponse.json();
    
    const baseline = {
      total: baselineSignals.length,
      comprehensive: baselineSignals.filter(s => s.source === 'all_symbols_comprehensive').length,
      newAlgo: baselineSignals.filter(s => s.algo === 'aitradex1_comprehensive_v4').length,
      realEnhanced: baselineSignals.filter(s => s.source === 'aitradex1_real_enhanced').length,
      realMarket: baselineSignals.filter(s => s.source === 'real_market_data').length
    };
    
    console.log("   📈 Baseline Signals:");
    console.log(`   • Total recent signals: ${baseline.total}`);
    console.log(`   • Comprehensive signals: ${baseline.comprehensive}`);
    console.log(`   • New algorithm signals: ${baseline.newAlgo}`);
    console.log(`   • Real enhanced signals: ${baseline.realEnhanced}`);
    console.log(`   • Real market signals: ${baseline.realMarket}`);

    // Step 2: Trigger comprehensive scanner
    console.log("\n🚀 Step 2: Triggering comprehensive all-symbols scanner...");
    
    const scannerResponse = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'comprehensive',
        trigger: 'full_test_execution',
        scan_all_symbols: true,
        advanced_ai: true,
        force_execution: true
      })
    });
    
    console.log(`   📡 Scanner Response Status: ${scannerResponse.status}`);
    const scannerResult = await scannerResponse.json();
    console.log("   📈 Scanner Result:", JSON.stringify(scannerResult, null, 2));

    // Step 3: Wait for processing
    console.log("\n⏰ Step 3: Waiting 5 seconds for signal processing...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Check for new comprehensive signals
    console.log("\n🔍 Step 4: Checking for new comprehensive signals...");
    
    const newSignalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=eq.all_symbols_comprehensive&order=created_at.desc`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const comprehensiveSignals = await newSignalsResponse.json();
    
    console.log(`   ✅ Found ${comprehensiveSignals.length} comprehensive signals`);
    
    if (comprehensiveSignals.length > 0) {
      console.log("   🎯 Sample comprehensive signals:");
      comprehensiveSignals.slice(0, 5).forEach((signal, i) => {
        console.log(`   ${i+1}. ${signal.symbol} ${signal.direction} - Score: ${signal.score}% (${signal.timeframe}) - ${signal.exchange}`);
      });
    }

    // Step 5: Check for new algorithm signals
    console.log("\n🧠 Step 5: Checking for new algorithm signals...");
    
    const algoSignalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&algo=eq.aitradex1_comprehensive_v4&order=created_at.desc`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const algoSignals = await algoSignalsResponse.json();
    
    console.log(`   ✅ Found ${algoSignals.length} new algorithm signals`);
    
    if (algoSignals.length > 0) {
      console.log("   🤖 Sample algorithm signals:");
      algoSignals.slice(0, 5).forEach((signal, i) => {
        console.log(`   ${i+1}. ${signal.symbol} ${signal.direction} - Score: ${signal.score}% - Confidence: ${signal.confidence}`);
      });
    }

    // Step 6: Analyze signal quality
    console.log("\n📊 Step 6: Analyzing signal quality...");
    
    const allNewSignals = [...comprehensiveSignals, ...algoSignals];
    if (allNewSignals.length > 0) {
      const avgScore = allNewSignals.reduce((sum, s) => sum + (s.score || 0), 0) / allNewSignals.length;
      const avgConfidence = allNewSignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / allNewSignals.length;
      const uniqueSymbols = new Set(allNewSignals.map(s => s.symbol)).size;
      const uniqueExchanges = new Set(allNewSignals.map(s => s.exchange)).size;
      
      console.log("   📈 Quality Metrics:");
      console.log(`   • Average Score: ${avgScore.toFixed(1)}%`);
      console.log(`   • Average Confidence: ${avgConfidence.toFixed(3)}`);
      console.log(`   • Unique Symbols: ${uniqueSymbols}`);
      console.log(`   • Unique Exchanges: ${uniqueExchanges}`);
      
      // Top performing signals
      const topSignals = allNewSignals
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10);
      
      console.log("   🏆 Top 10 performing signals:");
      topSignals.forEach((signal, i) => {
        console.log(`   ${i+1}. ${signal.symbol} ${signal.direction} - ${signal.score}% (${signal.source})`);
      });
    }

    // Step 7: Final test summary
    console.log("\n📋 COMPREHENSIVE TEST SUMMARY");
    console.log("===============================");
    console.log(`✅ Scanner Execution: ${scannerResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📈 Total Signals Generated: ${scannerResult.signalsGenerated || 0}`);
    console.log(`🎯 Comprehensive Signals: ${comprehensiveSignals.length}`);
    console.log(`🧠 New Algorithm Signals: ${algoSignals.length}`);
    console.log(`🌐 Exchanges Scanned: ${scannerResult.exchanges?.join(', ') || 'Unknown'}`);
    console.log(`⏰ Test Timestamp: ${new Date().toISOString()}`);
    
    if (comprehensiveSignals.length > 0 || algoSignals.length > 0) {
      console.log("\n🎉 SUCCESS: New comprehensive signals generated!");
      console.log("   The all-symbols scanner is working correctly.");
      console.log("   You should now see signals with:");
      console.log("   • Source: 'all_symbols_comprehensive'");
      console.log("   • Algorithm: 'aitradex1_comprehensive_v4'");
    } else {
      console.log("\n⚠️  WARNING: No comprehensive signals generated");
      console.log("   This could indicate:");
      console.log("   • Scanner execution issue");
      console.log("   • No qualifying signals found");
      console.log("   • Database insertion problem");
    }

    return {
      success: scannerResult.success,
      comprehensiveSignals: comprehensiveSignals.length,
      newAlgorithmSignals: algoSignals.length,
      totalGenerated: scannerResult.signalsGenerated || 0,
      testPassed: (comprehensiveSignals.length > 0 || algoSignals.length > 0)
    };
    
  } catch (error) {
    console.error("💥 COMPREHENSIVE TEST FAILED:", error);
    return { success: false, error: error.message, testPassed: false };
  }
}

// Execute the full test
fullComprehensiveTest().then(result => {
  console.log("\n🏁 FINAL RESULT:", JSON.stringify(result, null, 2));
});