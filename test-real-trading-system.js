// Comprehensive test of the real trading system
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testRealTradingSystem() {
  console.log("🚀 Testing Real Trading System...\n");

  // Test 1: Live Exchange Feed
  console.log("1️⃣ Testing Live Exchange Feed...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    console.log("✅ Live Exchange Feed:", result.success ? "SUCCESS" : "FAILED");
    console.log(`   📊 Market data points: ${result.marketDataPoints || 0}`);
    console.log(`   🏛️  Exchanges processed: ${result.exchangesProcessed || 0}\n`);
  } catch (error) {
    console.error("❌ Live Exchange Feed FAILED:", error.message, "\n");
  }

  // Wait for data to propagate
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Enhanced Signal Generation
  console.log("2️⃣ Testing Enhanced Signal Generation...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'test_real_system' })
    });

    const result = await response.json();
    console.log("✅ Enhanced Signal Generation:", result.success ? "SUCCESS" : "FAILED");
    console.log(`   📈 Signals generated: ${result.signals_generated || 0}`);
    console.log(`   🔥 Real data signals: ${result.real_data_signals || 0}\n`);
  } catch (error) {
    console.error("❌ Enhanced Signal Generation FAILED:", error.message, "\n");
  }

  // Test 3: AItradeX1 Enhanced Scanner
  console.log("3️⃣ Testing AItradeX1 Enhanced Scanner...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-enhanced-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        trigger: 'test_real_system' 
      })
    });

    const result = await response.json();
    console.log("✅ AItradeX1 Enhanced Scanner:", result.success ? "SUCCESS" : "FAILED");
    console.log(`   🔍 Signals found: ${result.signals_found || 0}`);
    console.log(`   📊 Symbols scanned: ${result.symbols_scanned || 0}\n`);
  } catch (error) {
    console.error("❌ AItradeX1 Enhanced Scanner FAILED:", error.message, "\n");
  }

  // Test 4: Comprehensive Trading Pipeline
  console.log("4️⃣ Testing Comprehensive Trading Pipeline...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/comprehensive-trading-pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'full' })
    });

    const result = await response.json();
    console.log("✅ Comprehensive Trading Pipeline:", result.success ? "SUCCESS" : "FAILED");
    console.log(`   🏗️  Steps completed: ${result.steps_completed?.length || 0}`);
    console.log(`   📈 Total signals: ${result.signals_generated || 0}`);
    console.log(`   ⚠️  Errors: ${result.errors?.length || 0}\n`);
  } catch (error) {
    console.error("❌ Comprehensive Trading Pipeline FAILED:", error.message, "\n");
  }

  // Test 5: Paper Trading Execution
  console.log("5️⃣ Testing Paper Trading Execution...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        side: 'buy',
        quantity: 0.001,
        testMode: true
      })
    });

    const result = await response.json();
    console.log("✅ Paper Trading Execution:", result.success ? "SUCCESS" : "FAILED");
    console.log(`   💰 Execution price: $${result.executionPrice || 'N/A'}`);
    console.log(`   📝 Order ID: ${result.orderId || 'N/A'}\n`);
  } catch (error) {
    console.error("❌ Paper Trading Execution FAILED:", error.message, "\n");
  }

  // Test 6: Database Verification
  console.log("6️⃣ Verifying Database State...");
  try {
    // Check live market data
    const marketResponse = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const marketData = await marketResponse.json();
    console.log(`   📊 Live market data entries: ${marketData.length}`);

    // Check signals
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const signals = await signalsResponse.json();
    const realDataSignals = signals.filter(s => 
      s.source?.includes('real') || 
      s.metadata?.real_data === true ||
      s.source === 'enhanced_signal_generation' ||
      s.source === 'aitradex1_enhanced_scanner'
    );
    
    console.log(`   📈 Total signals: ${signals.length}`);
    console.log(`   🔥 Real data signals: ${realDataSignals.length}`);
    console.log(`   ✅ Real data percentage: ${((realDataSignals.length / signals.length) * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error("❌ Database Verification FAILED:", error.message, "\n");
  }

  console.log("🏁 Real Trading System Test Complete!");
}

testRealTradingSystem().catch(console.error);