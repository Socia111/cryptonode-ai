// Trigger signal generation and test the live trading system
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerSignalGeneration() {
  console.log("🚀 Starting live signal generation system...\n");

  try {
    // Step 1: Trigger live exchange feed
    console.log("📡 Step 1: Triggering live exchange feed...");
    const feedResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'],
        exchanges: ['bybit']
      })
    });

    const feedResult = await feedResponse.json();
    console.log("✅ Live exchange feed result:", feedResult.success ? "SUCCESS" : "FAILED");
    if (feedResult.marketDataPoints) {
      console.log(`   📊 Market data points: ${feedResult.marketDataPoints}`);
    }

    // Wait for market data to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Generate signals with enhanced scanner
    console.log("\n🔍 Step 2: Triggering enhanced signal generation...");
    const signalResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'manual_generation' })
    });

    const signalResult = await signalResponse.json();
    console.log("✅ Enhanced signal generation:", signalResult.success ? "SUCCESS" : "FAILED");
    if (signalResult.signals_generated !== undefined) {
      console.log(`   🎯 Signals generated: ${signalResult.signals_generated}`);
    }

    // Wait for signals to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Trigger advanced scanner
    console.log("\n🔬 Step 3: Triggering AItradeX1 enhanced scanner...");
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
    console.log("✅ AItradeX1 enhanced scanner:", scannerResult.success ? "SUCCESS" : "FAILED");
    if (scannerResult.signals_found !== undefined) {
      console.log(`   🔍 Signals found: ${scannerResult.signals_found}`);
    }

    // Wait for all signals to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Test paper trading execution
    console.log("\n💰 Step 4: Testing paper trading execution...");
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
    console.log("✅ Paper trading execution:", tradeResult.success ? "SUCCESS" : "FAILED");
    if (tradeResult.orderId) {
      console.log(`   📝 Order ID: ${tradeResult.orderId}`);
      console.log(`   💵 Execution price: $${tradeResult.executionPrice}`);
    }

    // Step 5: Verify signals in database
    console.log("\n📊 Step 5: Verifying signals in database...");
    const signalsCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const signals = await signalsCheckResponse.json();
    const recentSignals = signals.filter(s => 
      new Date(s.created_at) > new Date(Date.now() - 10 * 60 * 1000)
    );
    
    const realSignals = recentSignals.filter(s => 
      s.source !== 'demo' && 
      s.source !== 'mock' && 
      s.source !== 'system' &&
      !s.algo?.includes('mock') &&
      (s.source?.includes('real') || s.source?.includes('enhanced') || s.metadata?.real_data === true)
    );

    console.log(`   📈 Total recent signals: ${recentSignals.length}`);
    console.log(`   🔥 Real signals: ${realSignals.length}`);
    console.log(`   ✅ Real signal percentage: ${recentSignals.length > 0 ? ((realSignals.length / recentSignals.length) * 100).toFixed(1) : 0}%`);

    if (realSignals.length > 0) {
      console.log("\n🎉 SUCCESS: Real trading signals are being generated!");
      console.log("Real signals found:");
      realSignals.slice(0, 3).forEach(signal => {
        console.log(`   • ${signal.symbol} ${signal.direction} - Score: ${signal.score}% (${signal.source})`);
      });
    } else {
      console.log("\n⚠️  WARNING: No real signals found - system needs adjustment");
    }

    console.log("\n🏁 Signal generation test complete!");
    return true;

  } catch (error) {
    console.error("❌ Signal generation failed:", error);
    return false;
  }
}

triggerSignalGeneration().catch(console.error);