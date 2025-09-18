// Direct test of comprehensive scanner
import fetch from 'node-fetch';

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerAndTestComprehensiveScanner() {
  console.log("🚀 COMPREHENSIVE SCANNER TEST");
  console.log("============================");
  
  try {
    // Step 1: Get current signal count
    console.log("\n1️⃣ Getting current signal counts...");
    let countResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=eq.all_symbols_comprehensive`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    let beforeCount = (await countResponse.json()).length;
    console.log(`   📊 Current comprehensive signals: ${beforeCount}`);
    
    // Step 2: Trigger the comprehensive scanner
    console.log("\n2️⃣ Triggering comprehensive all-symbols scanner...");
    const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'comprehensive',
        trigger: 'manual_test',
        scan_all_symbols: true,
        force: true
      })
    });
    
    console.log(`   📡 Scanner response status: ${scanResponse.status}`);
    const scanResult = await scanResponse.json();
    console.log(`   📈 Scanner result:`, JSON.stringify(scanResult, null, 2));
    
    // Step 3: Wait and check for new signals
    console.log("\n3️⃣ Waiting 3 seconds then checking for new signals...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    countResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=eq.all_symbols_comprehensive&order=created_at.desc`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const afterSignals = await countResponse.json();
    console.log(`   📊 New comprehensive signals found: ${afterSignals.length}`);
    
    // Step 4: Check for new algorithm signals
    const algoResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&algo=eq.aitradex1_comprehensive_v4&order=created_at.desc&limit=10`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    const algoSignals = await algoResponse.json();
    console.log(`   🧠 New algorithm signals found: ${algoSignals.length}`);
    
    // Step 5: Show sample signals if found
    if (afterSignals.length > 0) {
      console.log("\n4️⃣ Sample comprehensive signals:");
      afterSignals.slice(0, 3).forEach((signal, i) => {
        console.log(`   ${i+1}. ${signal.symbol} ${signal.direction} - Score: ${signal.score}% (${signal.algo})`);
      });
    }
    
    // Step 6: Test summary
    console.log("\n📋 TEST SUMMARY:");
    console.log(`   ✅ Scanner executed: ${scanResult.success ? 'YES' : 'NO'}`);
    console.log(`   📈 Signals generated: ${scanResult.signalsGenerated || 0}`);
    console.log(`   🎯 Comprehensive signals: ${afterSignals.length}`);
    console.log(`   🧠 New algorithm signals: ${algoSignals.length}`);
    console.log(`   🌍 Exchanges scanned: ${scanResult.exchanges?.join(', ') || 'Unknown'}`);
    
    return {
      success: scanResult.success,
      comprehensiveSignals: afterSignals.length,
      newAlgorithmSignals: algoSignals.length,
      totalGenerated: scanResult.signalsGenerated || 0
    };
    
  } catch (error) {
    console.error("💥 Test failed:", error);
    return { success: false, error: error.message };
  }
}

// Execute the test
triggerAndTestComprehensiveScanner();