#!/usr/bin/env node

// Complete System Test - Validates all fixes are working
// Tests all edge functions and verifies signal generation

import fetch from "node-fetch";

const EDGE = "https://codhlwjogfjywmjyjbbn.supabase.co";
const AUTH_HEADER = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.lAUCXHMqK6YJCJcINShQtJksw6Ei6w9kcZuLXKBHy1g";

const headers = {
  'Content-Type': 'application/json',
  'Authorization': AUTH_HEADER
};

async function testFunction(name, body = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  
  try {
    const response = await fetch(`${EDGE}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`);
      if (result.signals !== undefined) {
        console.log(`   📊 Signals: ${result.signals || result.generated || 0}`);
      }
      if (result.success) {
        console.log(`   📈 Status: ${result.status || 'operational'}`);
      }
      return { success: true, data: result };
    } else {
      console.log(`❌ ${name}: FAILED - ${response.status}`);
      console.log(`   Error: ${result.error || result.message || 'Unknown error'}`);
      return { success: false, error: result };
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runCompleteSystemTest() {
  console.log('🚀 Starting Complete System Test');
  console.log('=====================================');
  
  const results = {};
  
  // Test Phase 1: Signal Generation Functions
  console.log('\n📡 PHASE 1: SIGNAL GENERATION TESTS');
  console.log('-----------------------------------');
  
  results.enhancedSignals = await testFunction('enhanced-signal-generation', { test: true });
  results.liveSignalEngine = await testFunction('live-signal-engine', { symbols: ['BTCUSDT', 'ETHUSDT'] });
  results.comprehensiveScanner = await testFunction('bybit-comprehensive-scanner', { 
    batch_size: 5, 
    timeframes: ['5'] 
  });
  
  // Test Phase 2: Trading Execution
  console.log('\n💱 PHASE 2: TRADING EXECUTION TESTS');
  console.log('-----------------------------------');
  
  results.tradeExecutorStatus = await testFunction('aitradex1-trade-executor', { action: 'status' });
  
  // Test Phase 3: Automated System
  console.log('\n🤖 PHASE 3: AUTOMATED SYSTEM TESTS');
  console.log('----------------------------------');
  
  results.cryptoScheduler = await testFunction('crypto-scheduler', { automated: true });
  
  // Test Phase 4: Database Validation
  console.log('\n💾 PHASE 4: DATABASE VALIDATION');
  console.log('-------------------------------');
  
  try {
    // Check if signals were generated
    const signalsResponse = await fetch(`${EDGE}/rest/v1/signals?select=count&created_at=gte.${new Date(Date.now() - 10*60*1000).toISOString()}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'Authorization': AUTH_HEADER
      }
    });
    const signalsData = await signalsResponse.json();
    console.log(`✅ Database: Signals check completed`);
    console.log(`   📊 Recent signals: ${signalsData.length || 0}`);
    results.databaseCheck = { success: true, recentSignals: signalsData.length || 0 };
  } catch (error) {
    console.log(`❌ Database: Check failed - ${error.message}`);
    results.databaseCheck = { success: false, error: error.message };
  }
  
  // Summary Report
  console.log('\n📋 SYSTEM TEST SUMMARY');
  console.log('======================');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  // Detailed Results
  console.log('\n📊 DETAILED RESULTS:');
  for (const [test, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.success ? 'PASS' : 'FAIL'}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
    }
  }
  
  // Critical System Status
  console.log('\n🔍 CRITICAL SYSTEM STATUS:');
  
  const criticalSystems = [
    'enhancedSignals',
    'liveSignalEngine', 
    'comprehensiveScanner',
    'tradeExecutorStatus',
    'cryptoScheduler'
  ];
  
  const criticalPassed = criticalSystems.filter(sys => results[sys]?.success).length;
  const criticalTotal = criticalSystems.length;
  
  console.log(`Critical Systems: ${criticalPassed}/${criticalTotal} operational`);
  
  if (criticalPassed === criticalTotal) {
    console.log('🎉 ALL CRITICAL SYSTEMS OPERATIONAL!');
    console.log('✅ Signal generation pipeline: WORKING');
    console.log('✅ Trade execution system: WORKING');
    console.log('✅ Automated scheduling: WORKING');
  } else {
    console.log('⚠️  SOME CRITICAL SYSTEMS NEED ATTENTION!');
    const failedCritical = criticalSystems.filter(sys => !results[sys]?.success);
    failedCritical.forEach(sys => {
      console.log(`❌ ${sys}: NEEDS FIXING`);
    });
  }
  
  return results;
}

// Run the complete system test
runAllSignalGenerators()
  .then(results => {
    console.log('\n🏁 Test execution completed!');
    process.exit(criticalPassed === criticalTotal ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });

// Fix function name
async function runAllSignalGenerators() {
  return await runCompleteSystemTest();
}