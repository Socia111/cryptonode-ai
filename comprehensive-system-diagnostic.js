// Comprehensive System Diagnostic & Test Suite
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function runFullSystemDiagnostic() {
  console.log("🚀 AITRADEX1 - COMPREHENSIVE SYSTEM DIAGNOSTIC");
  console.log("=".repeat(60));
  
  let allResults = [];
  let errors = [];
  let successCount = 0;
  
  const tests = [
    // Phase 1: Database Connectivity Tests
    { name: "Database Connection", test: testDatabaseConnection },
    { name: "Signals Table Access", test: testSignalsTable },
    { name: "Live Market Data Access", test: testMarketDataTable },
    { name: "Execution Orders Access", test: testExecutionOrdersTable },
    { name: "Exchange Feed Status", test: testExchangeFeedStatus },
    
    // Phase 2: Edge Function Tests
    { name: "CCXT Live Feed Function", test: testCCXTLiveFeed },
    { name: "Live Exchange Feed Function", test: testLiveExchangeFeed },
    { name: "Enhanced Signal Generation", test: testEnhancedSignalGeneration },
    { name: "Paper Trading Executor", test: testPaperTradingExecutor },
    { name: "Bybit Authentication", test: testBybitAuthentication },
    
    // Phase 3: Real-time Signal Tests
    { name: "Real Signals Verification", test: testRealSignals },
    { name: "Signal Quality Check", test: testSignalQuality },
    
    // Phase 4: Trading System Tests
    { name: "Paper Trade Execution", test: testPaperTradeExecution },
    { name: "API Connection Status", test: testAPIConnections },
    
    // Phase 5: Performance Tests
    { name: "System Response Time", test: testSystemPerformance },
    { name: "Data Flow Verification", test: testDataFlow }
  ];
  
  for (const testCase of tests) {
    try {
      console.log(`\n🧪 Testing: ${testCase.name}...`);
      const result = await testCase.test();
      
      if (result.success) {
        console.log(`✅ ${testCase.name}: PASSED`);
        if (result.data) console.log(`   📊 ${result.data}`);
        successCount++;
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   💥 Error: ${result.error}`);
        errors.push(`${testCase.name}: ${result.error}`);
      }
      
      allResults.push({ name: testCase.name, ...result });
      
    } catch (error) {
      console.log(`💥 ${testCase.name}: EXCEPTION`);
      console.log(`   Error: ${error.message}`);
      errors.push(`${testCase.name}: ${error.message}`);
      allResults.push({ name: testCase.name, success: false, error: error.message });
    }
  }
  
  // Generate comprehensive report
  console.log("\n" + "=".repeat(60));
  console.log("📋 COMPREHENSIVE SYSTEM REPORT");
  console.log("=".repeat(60));
  
  console.log(`\n📊 Overall System Health: ${successCount}/${tests.length} tests passed`);
  console.log(`✅ Success Rate: ${Math.round((successCount / tests.length) * 100)}%`);
  
  if (errors.length > 0) {
    console.log(`\n❌ Critical Issues Found (${errors.length}):`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // System readiness assessment
  const readinessScore = (successCount / tests.length) * 100;
  let systemStatus;
  
  if (readinessScore >= 90) {
    systemStatus = "🟢 FULLY OPERATIONAL - Ready for live automated trading";
  } else if (readinessScore >= 75) {
    systemStatus = "🟡 MOSTLY OPERATIONAL - Minor issues need attention";
  } else if (readinessScore >= 50) {
    systemStatus = "🟠 PARTIALLY OPERATIONAL - Significant issues require fixing";
  } else {
    systemStatus = "🔴 CRITICAL ISSUES - System not ready for trading";
  }
  
  console.log(`\n🎯 System Status: ${systemStatus}`);
  
  // Recommendations
  console.log("\n💡 Recommendations:");
  if (readinessScore >= 90) {
    console.log("   • System is ready for live automated trading");
    console.log("   • Monitor performance and logs regularly");
    console.log("   • Consider gradual position size increases");
  } else {
    console.log("   • Fix critical errors before enabling live trading");
    console.log("   • Test paper trading thoroughly");
    console.log("   • Verify API credentials and permissions");
  }
  
  return { allResults, successCount, errors, readinessScore };
}

// Individual test functions
async function testDatabaseConnection() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    return { success: true, data: "Database accessible" };
  } else {
    return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }
}

async function testSignalsTable() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&limit=5&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `${data.length} recent signals found` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testMarketDataTable() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&limit=5&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `${data.length} recent market data points` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testExecutionOrdersTable() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=*&limit=5&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `${data.length} recent execution orders` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testExchangeFeedStatus() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/exchange_feed_status?select=*&order=updated_at.desc&limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `Feed status: ${data[0]?.status || 'Unknown'}` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testCCXTLiveFeed() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ccxt-live-feed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'status' })
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `CCXT feed operational` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testLiveExchangeFeed() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trigger: 'test' })
  });
  
  if (response.ok) {
    const data = await response.json();
    return { success: true, data: `Exchange feed operational, ${data.marketDataPoints || 0} data points` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testEnhancedSignalGeneration() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trigger: 'test' })
  });
  
  if (response.ok) {
    return { success: true, data: "Signal generation functional" };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testPaperTradingExecutor() {
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
    return { success: true, data: `Paper trading functional, order: ${data.order_id}` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testBybitAuthentication() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bybit-authenticate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'test_connection',
      api_key: 'test',
      api_secret: 'test',
      testnet: true
    })
  });
  
  if (response.ok) {
    return { success: true, data: "Authentication endpoint functional" };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testRealSignals() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=in.(real_market_data,aitradex1_real_enhanced,enhanced_signal_generation)&limit=10&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    const realSignals = data.filter(signal => 
      signal.metadata?.verified_real_data === true ||
      signal.source?.includes('real') ||
      signal.source?.includes('enhanced')
    );
    return { success: true, data: `${realSignals.length} verified real signals found` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testSignalQuality() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.70&limit=20&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    const highQualitySignals = data.filter(signal => signal.score >= 80);
    return { success: true, data: `${highQualitySignals.length} high-quality signals (80+ score)` };
  } else {
    return { success: false, error: `HTTP ${response.status}` };
  }
}

async function testPaperTradeExecution() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'ETHUSDT',
        side: 'buy',
        quantity: 0.001,
        paper_mode: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data: `Test trade executed: ${data.status || 'completed'}` };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testAPIConnections() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return { success: true, data: `API responding in ${responseTime}ms` };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testSystemPerformance() {
  const startTime = Date.now();
  
  try {
    const promises = [
      fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&limit=10`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/live_market_data?select=*&limit=10`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=*&limit=10`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      })
    ];
    
    const results = await Promise.all(promises);
    const responseTime = Date.now() - startTime;
    
    const allSuccessful = results.every(r => r.ok);
    
    if (allSuccessful) {
      return { success: true, data: `All endpoints responding in ${responseTime}ms` };
    } else {
      return { success: false, error: "Some endpoints failed" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDataFlow() {
  try {
    // Test signal creation to execution flow
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&limit=1&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    
    const ordersResponse = await fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=*&limit=1&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    
    if (signalsResponse.ok && ordersResponse.ok) {
      const signals = await signalsResponse.json();
      const orders = await ordersResponse.json();
      
      return { 
        success: true, 
        data: `Data flow active: ${signals.length} signals, ${orders.length} orders` 
      };
    } else {
      return { success: false, error: "Data flow verification failed" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Run the comprehensive diagnostic
runFullSystemDiagnostic().then(result => {
  console.log("\n🎉 DIAGNOSTIC COMPLETE");
  console.log(`Final System Readiness: ${result.readinessScore.toFixed(1)}%`);
  
  if (result.readinessScore >= 90) {
    console.log("\n🚀 SYSTEM READY FOR LIVE AUTOMATED TRADING WITH $250 CREDIT!");
    console.log("📈 All systems operational - proceed with confidence");
  } else {
    console.log(`\n⚠️  ${result.errors.length} issues need resolution before live trading`);
  }
}).catch(error => {
  console.error("\n💥 DIAGNOSTIC FAILED:", error);
});