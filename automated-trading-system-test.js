// Automated Trading System Live Test
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testAutomatedTradingSystem() {
  console.log("🤖 AUTOMATED TRADING SYSTEM - LIVE TEST");
  console.log("=".repeat(50));
  
  let testResults = {
    signalGeneration: false,
    dataFeeds: false,
    paperTrading: false,
    realTimeUpdates: false,
    apiConnections: false,
    systemHealth: false
  };
  
  try {
    // Test 1: Signal Generation Pipeline
    console.log("\n🎯 Testing Signal Generation Pipeline...");
    
    // Trigger enhanced signal generation
    const signalGenResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trigger: 'automated_test' })
    });
    
    if (signalGenResponse.ok) {
      console.log("✅ Enhanced signal generation: WORKING");
      testResults.signalGeneration = true;
    } else {
      console.log("❌ Enhanced signal generation: FAILED");
    }
    
    // Test 2: Live Data Feeds
    console.log("\n📊 Testing Live Data Feeds...");
    
    // Test CCXT live feed
    const ccxtResponse = await fetch(`${SUPABASE_URL}/functions/v1/ccxt-live-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'scan' })
    });
    
    if (ccxtResponse.ok) {
      const ccxtData = await ccxtResponse.json();
      console.log(`✅ CCXT live feed: WORKING (${ccxtData.market_data_points || 0} data points)`);
      testResults.dataFeeds = true;
    } else {
      console.log("❌ CCXT live feed: FAILED");
    }
    
    // Test 3: Paper Trading Execution
    console.log("\n📝 Testing Paper Trading Execution...");
    
    const paperTradeResponse = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        side: 'buy',
        amount: 25, // $25 test trade
        paper_mode: true
      })
    });
    
    if (paperTradeResponse.ok) {
      const tradeData = await paperTradeResponse.json();
      console.log(`✅ Paper trading execution: WORKING (Order: ${tradeData.order_id})`);
      testResults.paperTrading = true;
    } else {
      console.log("❌ Paper trading execution: FAILED");
    }
    
    // Test 4: Real-time Signal Updates
    console.log("\n🔄 Testing Real-time Signal Updates...");
    
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=in.(real_market_data,aitradex1_real_enhanced,enhanced_signal_generation,ccxt_live_enhanced)&score=gte.70&created_at=gte.${new Date(Date.now() - 60000).toISOString()}&order=created_at.desc&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (signalsResponse.ok) {
      const signals = await signalsResponse.json();
      const realSignals = signals.filter(s => s.metadata?.verified_real_data === true);
      console.log(`✅ Real-time signals: WORKING (${realSignals.length} real signals)`);
      testResults.realTimeUpdates = realSignals.length > 0;
    } else {
      console.log("❌ Real-time signals: FAILED");
    }
    
    // Test 5: API Connection Health
    console.log("\n🌐 Testing API Connection Health...");
    
    const apiStartTime = Date.now();
    const healthResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    const apiResponseTime = Date.now() - apiStartTime;
    
    if (healthResponse.ok && apiResponseTime < 2000) {
      console.log(`✅ API connections: HEALTHY (${apiResponseTime}ms response time)`);
      testResults.apiConnections = true;
    } else {
      console.log(`❌ API connections: SLOW/FAILED (${apiResponseTime}ms)`);
    }
    
    // Test 6: Overall System Health
    console.log("\n💊 Testing Overall System Health...");
    
    const healthChecks = [
      fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=count&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=count&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/exchange_feed_status?select=*&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      })
    ];
    
    const healthResults = await Promise.allSettled(healthChecks);
    const healthyEndpoints = healthResults.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    
    if (healthyEndpoints === healthChecks.length) {
      console.log(`✅ System health: EXCELLENT (${healthyEndpoints}/${healthChecks.length} endpoints healthy)`);
      testResults.systemHealth = true;
    } else {
      console.log(`⚠️ System health: PARTIAL (${healthyEndpoints}/${healthChecks.length} endpoints healthy)`);
    }
    
    // Generate Final Report
    console.log("\n" + "=".repeat(50));
    console.log("🏁 AUTOMATED TRADING SYSTEM - TEST RESULTS");
    console.log("=".repeat(50));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    console.log("\n📋 Component Status:");
    Object.entries(testResults).forEach(([component, status]) => {
      const icon = status ? "✅" : "❌";
      const statusText = status ? "OPERATIONAL" : "NEEDS ATTENTION";
      console.log(`   ${icon} ${component.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${statusText}`);
    });
    
    // Trading Readiness Assessment
    console.log("\n🎯 Trading Readiness Assessment:");
    
    if (successRate >= 90) {
      console.log("🟢 FULLY READY FOR AUTOMATED TRADING");
      console.log("   • All critical systems operational");
      console.log("   • Signal generation working");
      console.log("   • Paper trading functional");
      console.log("   • Real-time data flowing");
      console.log("\n💰 RECOMMENDATION: Safe to proceed with $250 credit automated trading");
      console.log("🚀 Start with conservative position sizes and monitor performance");
      
    } else if (successRate >= 75) {
      console.log("🟡 MOSTLY READY - MINOR ISSUES");
      console.log("   • Core functionality working");
      console.log("   • Some components need attention");
      console.log("\n💰 RECOMMENDATION: Proceed with caution, monitor closely");
      console.log("🔍 Consider starting with smaller position sizes");
      
    } else if (successRate >= 50) {
      console.log("🟠 PARTIALLY READY - SIGNIFICANT ISSUES");
      console.log("   • Multiple components failing");
      console.log("   • Not recommended for live trading");
      console.log("\n⚠️ RECOMMENDATION: Fix critical issues before trading");
      console.log("🛠️ Focus on paper trading until issues resolved");
      
    } else {
      console.log("🔴 NOT READY - CRITICAL FAILURES");
      console.log("   • Major system failures detected");
      console.log("   • Automated trading not safe");
      console.log("\n🚨 RECOMMENDATION: System requires immediate attention");
      console.log("🔧 Debug and fix all failing components");
    }
    
    // Generate Action Items
    console.log("\n📝 Next Steps:");
    if (testResults.signalGeneration && testResults.paperTrading && testResults.apiConnections) {
      console.log("   1. ✅ Begin automated paper trading");
      console.log("   2. ✅ Monitor signal quality and execution");
      console.log("   3. ✅ Gradually increase position sizes");
      console.log("   4. ✅ Enable live trading when confident");
    } else {
      console.log("   1. 🔧 Fix failing components identified above");
      console.log("   2. 🧪 Re-run this test until all components pass");
      console.log("   3. 📝 Verify paper trading works consistently");
      console.log("   4. 🚀 Only then proceed to live trading");
    }
    
    return {
      testResults,
      successRate,
      readyForTrading: successRate >= 90,
      readyForPaperTrading: successRate >= 75
    };
    
  } catch (error) {
    console.error("\n💥 CRITICAL ERROR during automated trading test:", error);
    return {
      testResults,
      successRate: 0,
      readyForTrading: false,
      readyForPaperTrading: false,
      error: error.message
    };
  }
}

// Execute the test
testAutomatedTradingSystem().then(result => {
  console.log("\n🎭 TEST COMPLETE!");
  
  if (result.readyForTrading) {
    console.log("🎉 SYSTEM IS READY FOR $250 AUTOMATED TRADING!");
  } else if (result.readyForPaperTrading) {
    console.log("📝 SYSTEM READY FOR PAPER TRADING - BUILD CONFIDENCE FIRST");
  } else {
    console.log("⚠️ SYSTEM NEEDS MORE WORK BEFORE TRADING");
  }
}).catch(error => {
  console.error("💥 Test execution failed:", error);
});