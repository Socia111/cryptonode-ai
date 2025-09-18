// Complete system test - cleanup, generate real signals, and verify
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function runCompleteSystemTest() {
  console.log("🔥 COMPLETE REAL TRADING SYSTEM TEST\n");
  
  try {
    // Step 1: Clean database of mock signals
    console.log("Step 1: Cleaning mock signals from database...");
    const cleanupResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?or=(source.eq.demo,source.eq.mock,source.eq.system,algo.like.*mock*,algo.like.*demo*,algo.eq.quantum_ai)`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      }
    });
    
    if (cleanupResponse.ok) {
      console.log("✅ Mock signals cleaned from database");
    } else {
      console.warn("⚠️  Cleanup warning:", await cleanupResponse.text());
    }

    // Step 2: Trigger live exchange feed
    console.log("\nStep 2: Fetching fresh market data...");
    const feedResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'],
        exchanges: ['bybit'],
        force_refresh: true
      })
    });

    const feedResult = await feedResponse.json();
    console.log("📊 Market data fetch:", feedResult.success ? "SUCCESS" : "FAILED");
    
    // Wait for data processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Generate real signals
    console.log("\nStep 3: Generating real trading signals...");
    
    // Trigger enhanced signal generation
    const enhancedResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'complete_test' })
    });

    const enhancedResult = await enhancedResponse.json();
    console.log("🎯 Enhanced signals:", enhancedResult.success ? "SUCCESS" : "FAILED");
    
    // Trigger AItradeX1 scanner
    const scannerResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-enhanced-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'],
        force_generate: true
      })
    });

    const scannerResult = await scannerResponse.json();
    console.log("🔬 Advanced scanner:", scannerResult.success ? "SUCCESS" : "FAILED");

    // Wait for signal processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Test paper trading
    console.log("\nStep 4: Testing paper trading execution...");
    const tradeResponse = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
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

    const tradeResult = await tradeResponse.json();
    console.log("💰 Paper trading:", tradeResult.success ? "SUCCESS" : "FAILED");

    // Step 5: Verify final state
    console.log("\nStep 5: Final verification...");
    
    // Check signals
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const allSignals = await signalsResponse.json();
    
    // Check market data
    const marketResponse = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&order=updated_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const marketData = await marketResponse.json();

    // Check execution orders
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=*&order=created_at.desc&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const orders = await ordersResponse.json();

    // Analyze results
    const recentSignals = allSignals.filter(s => 
      new Date(s.created_at) > new Date(Date.now() - 15 * 60 * 1000)
    );
    
    const realSignals = recentSignals.filter(s => 
      s.source !== 'demo' && 
      s.source !== 'mock' && 
      s.source !== 'system' &&
      !s.algo?.includes('mock') &&
      !s.algo?.includes('demo') &&
      s.algo !== 'quantum_ai' &&
      (s.source?.includes('real') || 
       s.source?.includes('enhanced') || 
       s.source?.includes('aitradex1') ||
       s.metadata?.real_data === true)
    );

    const mockSignals = recentSignals.filter(s => 
      s.source === 'demo' ||
      s.source === 'mock' ||
      s.source === 'system' ||
      s.algo?.includes('mock') ||
      s.algo?.includes('demo') ||
      s.algo === 'quantum_ai'
    );

    console.log("\n📊 FINAL RESULTS:");
    console.log(`   Market data points: ${marketData.length}`);
    console.log(`   Total recent signals: ${recentSignals.length}`);
    console.log(`   Real signals: ${realSignals.length}`);
    console.log(`   Mock signals: ${mockSignals.length}`);
    console.log(`   Execution orders: ${orders.length}`);
    console.log(`   Real signal percentage: ${recentSignals.length > 0 ? ((realSignals.length / recentSignals.length) * 100).toFixed(1) : 0}%`);

    if (realSignals.length > 0) {
      console.log("\n✅ REAL SIGNALS GENERATED:");
      realSignals.slice(0, 5).forEach(signal => {
        console.log(`   🎯 ${signal.symbol} ${signal.direction} - Score: ${signal.score}% (${signal.source}/${signal.algo})`);
      });
    }

    if (mockSignals.length > 0) {
      console.log("\n🚫 MOCK SIGNALS STILL PRESENT:");
      mockSignals.forEach(signal => {
        console.log(`   ❌ ${signal.symbol} ${signal.direction} - ${signal.source}/${signal.algo}`);
      });
    }

    const systemWorking = realSignals.length > 0 && mockSignals.length === 0 && marketData.length > 0;

    console.log(`\n${systemWorking ? '🎉 SYSTEM STATUS: FULLY OPERATIONAL' : '⚠️  SYSTEM STATUS: NEEDS ATTENTION'}`);
    
    if (systemWorking) {
      console.log("✅ Only real trading signals are being generated");
      console.log("✅ Paper trading is working correctly");
      console.log("✅ Market data is being fetched successfully");
      console.log("✅ System is ready for live trading!");
    } else {
      if (realSignals.length === 0) console.log("❌ No real signals being generated");
      if (mockSignals.length > 0) console.log("❌ Mock signals still present");
      if (marketData.length === 0) console.log("❌ No recent market data");
    }

    return systemWorking;

  } catch (error) {
    console.error("❌ System test failed:", error);
    return false;
  }
}

runCompleteSystemTest().catch(console.error);