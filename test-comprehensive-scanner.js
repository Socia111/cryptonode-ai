// Test comprehensive all-symbols scanner directly
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testComprehensiveScanner() {
  console.log("🚀 Testing Comprehensive All-Symbols Scanner...");
  
  try {
    // Test 1: Direct function call
    console.log("\n📡 Calling all-symbols-scanner function...");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/all-symbols-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'comprehensive',
        trigger: 'test_comprehensive_scan',
        advanced_ai: true,
        force_scan: true
      })
    });

    console.log(`Response status: ${response.status}`);
    const result = await response.json();
    console.log("📊 Scanner Response:", JSON.stringify(result, null, 2));

    // Test 2: Check signals generated
    console.log("\n🔍 Checking for new signals...");
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=eq.all_symbols_comprehensive&order=created_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const signals = await signalsResponse.json();
    console.log(`✅ Found ${signals.length} comprehensive signals`);
    
    if (signals.length > 0) {
      console.log("🎯 Sample comprehensive signal:", signals[0]);
    }

    // Test 3: Check algorithm usage
    const algoResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&algo=eq.aitradex1_comprehensive_v4&order=created_at.desc&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const algoSignals = await algoResponse.json();
    console.log(`✅ Found ${algoSignals.length} signals with new algorithm`);

    return {
      success: result.success,
      signalsGenerated: result.signalsGenerated || 0,
      comprehensiveSignalsFound: signals.length,
      newAlgorithmSignalsFound: algoSignals.length
    };

  } catch (error) {
    console.error("💥 Test failed:", error);
    return { success: false, error: error.message };
  }
}

// Run the test
testComprehensiveScanner().then(result => {
  console.log("\n📋 FINAL TEST RESULTS:");
  console.log(JSON.stringify(result, null, 2));
});