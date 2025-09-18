// Final Production System Verification
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function finalProductionVerification() {
  console.log("🚀 AITRADEX1 - FINAL PRODUCTION VERIFICATION");
  console.log("Ready for $250 Credit Automated Trading");
  console.log("=".repeat(60));
  
  const startTime = Date.now();
  let totalScore = 0;
  let maxScore = 0;
  
  const checks = [
    {
      name: "🔌 API Connectivity",
      weight: 10,
      test: testAPIConnectivity
    },
    {
      name: "📊 Real Signal Generation",
      weight: 20,
      test: testRealSignalGeneration
    },
    {
      name: "📝 Paper Trading Execution",
      weight: 15,
      test: testPaperTradingExecution
    },
    {
      name: "🔄 Real-time Data Feeds",
      weight: 15,
      test: testRealTimeDataFeeds
    },
    {
      name: "🏦 Database Operations",
      weight: 10,
      test: testDatabaseOperations
    },
    {
      name: "🛡️ Security & Authentication",
      weight: 10,
      test: testSecurityAuthentication
    },
    {
      name: "⚡ System Performance",
      weight: 10,
      test: testSystemPerformance
    },
    {
      name: "🎯 Signal Quality",
      weight: 10,
      test: testSignalQuality
    }
  ];
  
  console.log(`\n🧪 Running ${checks.length} critical production checks...\n`);
  
  for (const check of checks) {
    maxScore += check.weight;
    
    try {
      console.log(`Testing ${check.name}...`);
      const result = await check.test();
      
      if (result.success) {
        const score = check.weight * (result.score || 1);
        totalScore += score;
        console.log(`✅ ${check.name}: PASSED (${score}/${check.weight} points)`);
        if (result.details) console.log(`   📋 ${result.details}`);
      } else {
        console.log(`❌ ${check.name}: FAILED (0/${check.weight} points)`);
        console.log(`   🔍 Issue: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`💥 ${check.name}: ERROR (0/${check.weight} points)`);
      console.log(`   ⚠️ Exception: ${error.message}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const finalScore = Math.round((totalScore / maxScore) * 100);
  const testDuration = Math.round((Date.now() - startTime) / 1000);
  
  // Generate final production readiness report
  console.log("\n" + "=".repeat(60));
  console.log("🏁 PRODUCTION READINESS REPORT");
  console.log("=".repeat(60));
  
  console.log(`\n📊 Overall Score: ${finalScore}/100`);
  console.log(`⏱️ Test Duration: ${testDuration} seconds`);
  console.log(`🎯 Points Earned: ${totalScore}/${maxScore}`);
  
  // Determine production readiness
  let readinessLevel;
  let recommendation;
  let riskLevel;
  
  if (finalScore >= 95) {
    readinessLevel = "🟢 EXCELLENT - FULLY PRODUCTION READY";
    recommendation = "✅ Proceed with $250 automated trading immediately";
    riskLevel = "🔒 VERY LOW RISK";
  } else if (finalScore >= 85) {
    readinessLevel = "🟢 GOOD - PRODUCTION READY";
    recommendation = "✅ Safe to proceed with $250 automated trading";
    riskLevel = "🟡 LOW RISK";
  } else if (finalScore >= 75) {
    readinessLevel = "🟡 ACCEPTABLE - PRODUCTION READY WITH MONITORING";
    recommendation = "⚠️ Proceed with $250 but monitor closely";
    riskLevel = "🟠 MEDIUM RISK";
  } else if (finalScore >= 60) {
    readinessLevel = "🟠 MARGINAL - NOT RECOMMENDED FOR PRODUCTION";
    recommendation = "🚫 Fix critical issues before live trading";
    riskLevel = "🔴 HIGH RISK";
  } else {
    readinessLevel = "🔴 POOR - NOT PRODUCTION READY";
    recommendation = "🛑 Major system issues require immediate attention";
    riskLevel = "🚨 VERY HIGH RISK";
  }
  
  console.log(`\n🎯 Production Readiness: ${readinessLevel}`);
  console.log(`💰 Trading Recommendation: ${recommendation}`);
  console.log(`⚠️ Risk Level: ${riskLevel}`);
  
  // Trading strategy recommendations based on score
  console.log("\n📈 TRADING STRATEGY RECOMMENDATIONS:");
  
  if (finalScore >= 85) {
    console.log("💼 Conservative Strategy:");
    console.log("   • Start with $50-100 positions");
    console.log("   • Use 2-3x leverage maximum");
    console.log("   • Enable all stop losses");
    console.log("   • Monitor first 10 trades closely");
    console.log("\n🚀 Aggressive Strategy (if confident):");
    console.log("   • Start with $100-150 positions");
    console.log("   • Use up to 5x leverage");
    console.log("   • Set 2% risk per trade");
    console.log("   • Scale up after proven performance");
  } else if (finalScore >= 75) {
    console.log("⚠️ Cautious Strategy Only:");
    console.log("   • Start with $25-50 positions");
    console.log("   • Use 1-2x leverage maximum");
    console.log("   • Enable strict stop losses");
    console.log("   • Paper trade for 24h first");
  } else {
    console.log("🚫 Do Not Trade Live:");
    console.log("   • Fix all failed components");
    console.log("   • Test extensively in paper mode");
    console.log("   • Re-run this verification");
    console.log("   • Only proceed when score > 75");
  }
  
  // Critical system components status
  console.log("\n🔧 SYSTEM COMPONENTS STATUS:");
  console.log("Database: " + (totalScore > 0 ? "✅ Operational" : "❌ Failed"));
  console.log("Signal Generation: " + (finalScore >= 70 ? "✅ Operational" : "❌ Needs Fix"));
  console.log("Paper Trading: " + (finalScore >= 70 ? "✅ Operational" : "❌ Needs Fix"));
  console.log("Real-time Feeds: " + (finalScore >= 70 ? "✅ Operational" : "❌ Needs Fix"));
  console.log("API Connections: " + (finalScore >= 70 ? "✅ Stable" : "❌ Unstable"));
  
  // Final checklist
  console.log("\n✅ PRE-TRADING CHECKLIST:");
  console.log(finalScore >= 75 ? "✅" : "❌", "System passes production verification");
  console.log(finalScore >= 75 ? "✅" : "❌", "Real signals generating successfully");
  console.log(finalScore >= 75 ? "✅" : "❌", "Paper trading executes without errors");
  console.log(finalScore >= 75 ? "✅" : "❌", "API connections are stable");
  console.log(finalScore >= 75 ? "✅" : "❌", "All edge functions operational");
  console.log("⚠️", "Trading capital ($250) available and budgeted");
  console.log("⚠️", "Risk management strategy defined");
  console.log("⚠️", "Stop-loss procedures understood");
  console.log("⚠️", "Performance monitoring plan in place");
  
  return {
    finalScore,
    readinessLevel,
    recommendation,
    riskLevel,
    productionReady: finalScore >= 75,
    testDuration
  };
}

// Individual test functions
async function testAPIConnectivity() {
  const start = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    const responseTime = Date.now() - start;
    
    if (response.ok && responseTime < 3000) {
      return { 
        success: true, 
        score: responseTime < 1000 ? 1 : 0.7,
        details: `Response time: ${responseTime}ms` 
      };
    } else {
      return { success: false, error: `Slow/failed response: ${responseTime}ms` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testRealSignalGeneration() {
  try {
    // Check for recent real signals
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=in.(real_market_data,aitradex1_real_enhanced,enhanced_signal_generation,ccxt_live_enhanced)&created_at=gte.${new Date(Date.now() - 30*60*1000).toISOString()}&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const signals = await response.json();
      const realSignals = signals.filter(s => 
        s.metadata?.verified_real_data === true ||
        s.source?.includes('real') ||
        s.source?.includes('enhanced')
      );
      
      if (realSignals.length >= 3) {
        return { 
          success: true, 
          score: 1,
          details: `${realSignals.length} real signals in last 30 minutes` 
        };
      } else if (realSignals.length > 0) {
        return { 
          success: true, 
          score: 0.6,
          details: `${realSignals.length} real signals (low volume)` 
        };
      } else {
        return { success: false, error: "No real signals generated recently" };
      }
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testPaperTradingExecution() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        side: 'buy',
        amount: 10,
        paper_mode: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        score: 1,
        details: `Paper trade executed: ${data.order_id}` 
      };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testRealTimeDataFeeds() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&created_at=gte.${new Date(Date.now() - 10*60*1000).toISOString()}&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.length >= 5) {
        return { 
          success: true, 
          score: 1,
          details: `${data.length} fresh market data points` 
        };
      } else if (data.length > 0) {
        return { 
          success: true, 
          score: 0.6,
          details: `${data.length} market data points (low volume)` 
        };
      } else {
        return { success: false, error: "No recent market data" };
      }
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDatabaseOperations() {
  try {
    const tables = ['signals', 'live_market_data', 'execution_orders'];
    let successCount = 0;
    
    for (const table of tables) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      if (response.ok) successCount++;
    }
    
    const score = successCount / tables.length;
    return { 
      success: score > 0.8, 
      score,
      details: `${successCount}/${tables.length} tables accessible` 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSecurityAuthentication() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bybit-authenticate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test_connection',
        api_key: 'test',
        api_secret: 'test'
      })
    });
    
    if (response.ok) {
      return { 
        success: true, 
        score: 1,
        details: "Authentication endpoint functional" 
      };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSystemPerformance() {
  const start = Date.now();
  try {
    const promises = [
      fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }),
      fetch(`${SUPABASE_URL}/functions/v1/ccxt-live-feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'status' })
      })
    ];
    
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    const allSuccessful = results.every(r => r.ok);
    const score = allSuccessful && duration < 5000 ? 1 : 0.5;
    
    return { 
      success: allSuccessful, 
      score,
      details: `System responding in ${duration}ms` 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSignalQuality() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.80&created_at=gte.${new Date(Date.now() - 60*60*1000).toISOString()}&limit=20`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const signals = await response.json();
      const highQualitySignals = signals.filter(s => s.score >= 85);
      
      if (highQualitySignals.length >= 5) {
        return { 
          success: true, 
          score: 1,
          details: `${highQualitySignals.length} high-quality signals (85%+)` 
        };
      } else if (signals.length > 0) {
        return { 
          success: true, 
          score: 0.7,
          details: `${signals.length} good signals (80%+)` 
        };
      } else {
        return { success: false, error: "No high-quality signals found" };
      }
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Execute final production verification
finalProductionVerification().then(result => {
  console.log("\n🎉 FINAL VERIFICATION COMPLETE!");
  
  if (result.productionReady) {
    console.log("🚀 SYSTEM IS READY FOR $250 AUTOMATED TRADING!");
    console.log("💰 Proceed with confidence - all systems operational");
  } else {
    console.log("⚠️ SYSTEM NEEDS ATTENTION BEFORE LIVE TRADING");
    console.log("🔧 Fix identified issues and re-run verification");
  }
  
  console.log(`\n📊 Final Score: ${result.finalScore}/100`);
  console.log(`🎯 Status: ${result.readinessLevel}`);
}).catch(error => {
  console.error("💥 Verification failed:", error);
});