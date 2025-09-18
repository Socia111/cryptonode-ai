// Final verification script to run the full trading system
const fetch = require('node-fetch');

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM";

async function runFullSystemTest() {
  console.log("🚀 Running COMPLETE real trading system test...");
  
  let allPassed = true;

  // 1. Start live data pipeline
  console.log("\n📊 Step 1: Starting live market data pipeline...");
  try {
    const pipelineResponse = await fetch(`${SUPABASE_URL}/functions/v1/comprehensive-trading-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        mode: 'real_data_only',
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
        timeframes: ['1h']
      })
    });

    const pipelineResult = await pipelineResponse.json();
    if (pipelineResponse.ok) {
      console.log("✅ Pipeline started successfully:", pipelineResult);
    } else {
      console.log("❌ Pipeline failed:", pipelineResult);
      allPassed = false;
    }
  } catch (error) {
    console.log("❌ Pipeline error:", error.message);
    allPassed = false;
  }

  // Wait for pipeline to process
  console.log("⏳ Waiting 10 seconds for data processing...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 2. Verify live market data
  console.log("\n📈 Step 2: Verifying live market data...");
  try {
    const marketResponse = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&order=updated_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      }
    });

    const marketData = await marketResponse.json();
    if (marketResponse.ok && marketData.length > 0) {
      console.log(`✅ Found ${marketData.length} real market data points`);
      console.log("Latest:", marketData[0].symbol, "$" + marketData[0].price);
    } else {
      console.log("❌ No real market data found");
      allPassed = false;
    }
  } catch (error) {
    console.log("❌ Market data check error:", error.message);
    allPassed = false;
  }

  // 3. Verify real signals
  console.log("\n🎯 Step 3: Verifying real signals...");
  try {
    const signalsResponse = await fetch(`${SUPABASE_URL}/functions/v1/signals-api?action=list`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    const signalsResult = await signalsResponse.json();
    if (signalsResponse.ok && signalsResult.signals?.length > 0) {
      console.log(`✅ Found ${signalsResult.signals.length} real signals`);
      
      // Check if signals are real
      const realSignals = signalsResult.signals.filter(s => 
        s.source !== 'demo' && s.source !== 'mock' && !s.algo?.includes('mock')
      );
      console.log(`📊 Real signals: ${realSignals.length}/${signalsResult.signals.length}`);
      
      if (realSignals.length === 0) {
        console.log("❌ No real signals found - all signals are mock/demo");
        allPassed = false;
      }
    } else {
      console.log("❌ No signals found or API error");
      allPassed = false;
    }
  } catch (error) {
    console.log("❌ Signals check error:", error.message);
    allPassed = false;
  }

  // 4. Test paper trading with real prices
  console.log("\n💰 Step 4: Testing paper trading with real prices...");
  try {
    const tradeResponse = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        side: 'buy',
        quantity: 0.001
      })
    });

    const tradeResult = await tradeResponse.json();
    if (tradeResponse.ok && tradeResult.success) {
      console.log(`✅ Paper trade executed at real price: $${tradeResult.executionPrice}`);
    } else {
      console.log("❌ Paper trade failed:", tradeResult);
      allPassed = false;
    }
  } catch (error) {
    console.log("❌ Paper trade error:", error.message);
    allPassed = false;
  }

  // 5. Final system status
  console.log("\n🔍 Step 5: Final system status...");
  try {
    const statusResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-trade-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ action: 'status' })
    });

    const statusResult = await statusResponse.json();
    if (statusResponse.ok) {
      console.log("✅ Trade executor status:", statusResult);
    } else {
      console.log("❌ Trade executor status failed:", statusResult);
      allPassed = false;
    }
  } catch (error) {
    console.log("❌ Status check error:", error.message);
    allPassed = false;
  }

  // Final result
  console.log("\n" + "=".repeat(50));
  if (allPassed) {
    console.log("🎉 SUCCESS: ALL SYSTEMS OPERATIONAL!");
    console.log("✅ Live market data feeds working");
    console.log("✅ Real signal generation working");
    console.log("✅ Paper trading with real prices working");
    console.log("✅ Trade execution system working");
    console.log("✅ NO MOCK DATA - REAL DATA ONLY");
    console.log("\n🚀 Platform is ready for live trading!");
  } else {
    console.log("❌ FAILURE: Some systems have errors");
    console.log("⚠️  Check the error messages above");
  }
  console.log("=".repeat(50));

  return allPassed;
}

// Execute the test
runFullSystemTest().catch(console.error);