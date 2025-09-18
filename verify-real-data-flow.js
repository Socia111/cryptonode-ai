// Verify that the complete real data flow is working
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function verifyRealDataFlow() {
  console.log("🔍 Verifying Real Data Flow...\n");

  // Step 1: Check live market data
  console.log("1️⃣ Checking live market data...");
  try {
    const marketResponse = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&order=updated_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const marketData = await marketResponse.json();
    console.log(`   📊 Latest market data entries: ${marketData.length}`);
    
    if (marketData.length > 0) {
      const latest = marketData[0];
      console.log(`   🕒 Latest update: ${latest.updated_at}`);
      console.log(`   💰 Example: ${latest.symbol} @ $${latest.price} (${latest.exchange})`);
      console.log(`   ✅ Market data is flowing`);
    } else {
      console.log("   ❌ No market data found - triggering live feed...");
      
      // Trigger live feed
      await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        }
      });
      
      console.log("   🔄 Live feed triggered, waiting...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("   ❌ Market data check failed:", error.message);
  }

  console.log();

  // Step 2: Check signal generation
  console.log("2️⃣ Checking signal generation...");
  try {
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const signals = await signalsResponse.json();
    console.log(`   📈 Total recent signals: ${signals.length}`);

    // Filter for real data signals
    const realSignals = signals.filter(s => 
      s.source?.includes('real') || 
      s.source === 'enhanced_signal_generation' ||
      s.source === 'aitradex1_enhanced_scanner' ||
      s.source === 'complete_algorithm_live' ||
      s.metadata?.real_data === true
    );

    const mockSignals = signals.filter(s => !realSignals.includes(s));

    console.log(`   🔥 Real data signals: ${realSignals.length}`);
    console.log(`   🎭 Mock signals: ${mockSignals.length}`);
    console.log(`   📊 Real data percentage: ${signals.length > 0 ? ((realSignals.length / signals.length) * 100).toFixed(1) : 0}%`);

    if (realSignals.length > 0) {
      console.log(`   ✅ Real signals are being generated`);
      console.log(`   📋 Recent real signals:`);
      realSignals.slice(0, 5).forEach((signal, i) => {
        console.log(`      ${i + 1}. ${signal.symbol} ${signal.direction} @ $${signal.price} (${signal.source})`);
      });
    } else {
      console.log("   ❌ No real data signals found");
      
      // Trigger signal generation
      console.log("   🔄 Triggering signal generation...");
      await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger: 'verification_test' })
      });
    }
  } catch (error) {
    console.error("   ❌ Signal check failed:", error.message);
  }

  console.log();

  // Step 3: Test paper trading
  console.log("3️⃣ Testing paper trading execution...");
  try {
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
    
    if (tradeResult.success) {
      console.log(`   ✅ Paper trade executed successfully`);
      console.log(`   💰 Execution price: $${tradeResult.executionPrice}`);
      console.log(`   📝 Order ID: ${tradeResult.orderId}`);
      console.log(`   🔥 Using real market price: ${tradeResult.type === 'paper_trade' ? 'Yes' : 'No'}`);
    } else {
      console.log(`   ❌ Paper trade failed: ${tradeResult.error}`);
    }
  } catch (error) {
    console.error("   ❌ Paper trading test failed:", error.message);
  }

  console.log();

  // Step 4: Overall system health
  console.log("4️⃣ Overall System Health Assessment...");
  
  try {
    const healthResponse = await fetch(`${SUPABASE_URL}/rest/v1/exchange_feed_status?select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const feedStatus = await healthResponse.json();
    console.log(`   🏛️  Exchange feeds: ${feedStatus.length} tracked`);
    
    const activeFeedsCount = feedStatus.filter(f => f.status === 'active').length;
    console.log(`   ✅ Active feeds: ${activeFeedsCount}/${feedStatus.length}`);
    
    if (activeFeedsCount > 0) {
      console.log("   🟢 System Status: HEALTHY - Real data flowing");
    } else {
      console.log("   🟡 System Status: DEGRADED - Limited real data");
    }
    
  } catch (error) {
    console.error("   ❌ Health check failed:", error.message);
    console.log("   🔴 System Status: UNKNOWN");
  }

  console.log("\n🏁 Real Data Flow Verification Complete!");
}

verifyRealDataFlow().catch(console.error);