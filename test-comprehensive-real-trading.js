// Comprehensive Real Trading System Test - Triggers complete pipeline with real data
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testComprehensiveTradingPipeline() {
  try {
    console.log("🚀 Testing COMPREHENSIVE REAL TRADING PIPELINE...");
    console.log("===============================================");
    
    // Step 1: Test Full Trading Pipeline
    console.log("\n📊 Step 1: Triggering complete trading pipeline...");
    const pipelineResponse = await fetch(`${SUPABASE_URL}/functions/v1/comprehensive-trading-pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'full',
        trigger: 'manual_test'
      })
    });

    const pipelineResult = await pipelineResponse.json();
    console.log("📈 Pipeline Response:", JSON.stringify(pipelineResult, null, 2));

    if (!pipelineResponse.ok) {
      console.error("❌ Pipeline Error:", pipelineResponse.status, pipelineResult);
    } else {
      console.log("✅ Comprehensive trading pipeline executed successfully");
      console.log(`📊 Market Data Points: ${pipelineResult.market_data_points || 0}`);
      console.log(`🎯 Signals Generated: ${pipelineResult.signals_generated || 0}`);
      console.log(`📝 Steps Completed: ${pipelineResult.steps_completed?.join(', ') || 'None'}`);
      
      if (pipelineResult.errors && pipelineResult.errors.length > 0) {
        console.warn("⚠️ Pipeline Warnings:", pipelineResult.errors);
      }
    }

    // Step 2: Test Individual Live Exchange Feed
    console.log("\n🔄 Step 2: Testing live exchange feed directly...");
    const liveResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'manual_test' })
    });

    const liveResult = await liveResponse.json();
    console.log("📊 Live Feed Response:", JSON.stringify(liveResult, null, 2));

    // Step 3: Test Enhanced Signal Generation with Real Data
    console.log("\n🎯 Step 3: Testing enhanced signal generation...");
    const signalResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'manual_test' })
    });

    const signalResult = await signalResponse.json();
    console.log("🎯 Signal Generation Response:", JSON.stringify(signalResult, null, 2));

    // Step 4: Test Scanner with Real Data
    console.log("\n🔍 Step 4: Testing scanner with real data...");
    const scannerResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-enhanced-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        trigger: 'manual_test'
      })
    });

    const scannerResult = await scannerResponse.json();
    console.log("🔍 Scanner Response:", JSON.stringify(scannerResult, null, 2));

    // Step 5: Test Paper Trading Execution with Real Prices
    console.log("\n💰 Step 5: Testing paper trading with real market prices...");
    const tradeResponse = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.001,
        orderType: 'Market',
        testMode: true
      })
    });

    const tradeResult = await tradeResponse.json();
    console.log("💰 Paper Trade Response:", JSON.stringify(tradeResult, null, 2));

    console.log("\n=====================================");
    console.log("✅ COMPREHENSIVE REAL TRADING SYSTEM TEST COMPLETED");
    console.log("=====================================");

  } catch (error) {
    console.error("💥 Failed to test comprehensive trading system:", error);
  }
}

testComprehensiveTradingPipeline();