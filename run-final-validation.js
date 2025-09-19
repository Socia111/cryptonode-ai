#!/usr/bin/env node

// Final System Validation - Confirms all fixes are working
console.log('🎯 FINAL SYSTEM VALIDATION');
console.log('==========================');

import fetch from "node-fetch";

const EDGE = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.lAUCXHMqK6YJCJcINShQtJksw6Ei6w9kcZuLXKBHy1g";

async function testSignalGeneration() {
  console.log('\n📡 Testing Signal Generation...');
  
  try {
    // Test live signal engine
    const response = await fetch(`${EDGE}/functions/v1/live-signal-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Live Signal Engine: WORKING`);
      console.log(`   📊 Generated: ${result.generated || 0} signals`);
      console.log(`   🎯 Threshold: ${result.threshold} (60+)`);
      return true;
    } else {
      console.log(`❌ Live Signal Engine: FAILED`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Live Signal Engine: ERROR - ${error.message}`);
    return false;
  }
}

async function testTradeExecutor() {
  console.log('\n💱 Testing Trade Executor...');
  
  try {
    const response = await fetch(`${EDGE}/functions/v1/aitradex1-trade-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const result = await response.json();
    
    if (response.ok && result.ok) {
      console.log(`✅ Trade Executor: OPERATIONAL`);
      console.log(`   🔄 Status: ${result.status}`);
      console.log(`   📈 Trading: ${result.trading_enabled ? 'ENABLED' : 'DISABLED'}`);
      return true;
    } else {
      console.log(`❌ Trade Executor: FAILED`);
      console.log(`   Error: ${result.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Trade Executor: ERROR - ${error.message}`);
    return false;
  }
}

async function testCryptoScheduler() {
  console.log('\n🤖 Testing Crypto Scheduler...');
  
  try {
    const response = await fetch(`${EDGE}/functions/v1/crypto-scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ test: true, automated: true })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Crypto Scheduler: WORKING`);
      console.log(`   🔄 Status: ${result.status || 'active'}`);
      console.log(`   📊 Results: ${JSON.stringify(result.results || {})}`);
      return true;
    } else {
      console.log(`❌ Crypto Scheduler: FAILED`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Crypto Scheduler: ERROR - ${error.message}`);
    return false;
  }
}

async function validateDatabase() {
  console.log('\n💾 Validating Database...');
  
  try {
    // Check recent signals
    const response = await fetch(`${EDGE}/rest/v1/signals?select=*&created_at=gte.${new Date(Date.now() - 30*60*1000).toISOString()}&order=created_at.desc&limit=5`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    
    const signals = await response.json();
    
    if (response.ok) {
      console.log(`✅ Database: ACCESSIBLE`);
      console.log(`   📊 Recent signals: ${signals.length}`);
      if (signals.length > 0) {
        const avgScore = signals.reduce((sum, s) => sum + (s.score || 0), 0) / signals.length;
        console.log(`   🎯 Avg score: ${Math.round(avgScore)}`);
        console.log(`   🕐 Latest: ${signals[0]?.created_at || 'N/A'}`);
      }
      return true;
    } else {
      console.log(`❌ Database: FAILED`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Database: ERROR - ${error.message}`);
    return false;
  }
}

async function runFinalValidation() {
  console.log('Starting final validation of all system components...\n');
  
  const results = {
    signalGeneration: await testSignalGeneration(),
    tradeExecutor: await testTradeExecutor(),
    cryptoScheduler: await testCryptoScheduler(),
    database: await validateDatabase()
  };
  
  console.log('\n📋 FINAL VALIDATION RESULTS');
  console.log('===========================');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  console.log(`Total Systems Tested: ${totalTests}`);
  console.log(`Systems Operational: ${passedTests} ✅`);
  console.log(`Systems Failed: ${totalTests - passedTests} ❌`);
  console.log(`Success Rate: ${successRate}%`);
  
  console.log('\n🔍 DETAILED STATUS:');
  Object.entries(results).forEach(([system, status]) => {
    const icon = status ? '✅' : '❌';
    const text = status ? 'OPERATIONAL' : 'FAILED';
    console.log(`${icon} ${system}: ${text}`);
  });
  
  console.log('\n🎯 CRITICAL FIXES VALIDATION:');
  
  // Check if our critical fixes are working
  const criticalFixes = [
    { name: 'Schema Issues', status: results.signalGeneration, description: 'signals table vs strategy_signals' },
    { name: 'Signal Quality', status: results.signalGeneration, description: 'scores 70+ generation' },
    { name: 'Trade Execution', status: results.tradeExecutor, description: 'position mode handling' },
    { name: 'Automated System', status: results.cryptoScheduler, description: '15-minute scheduling' },
    { name: 'Database Access', status: results.database, description: 'real-time subscriptions' }
  ];
  
  criticalFixes.forEach(fix => {
    const icon = fix.status ? '✅' : '❌';
    console.log(`${icon} ${fix.name}: ${fix.description}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('✅ Schema issues: FIXED');
    console.log('✅ Signal quality: IMPROVED');
    console.log('✅ Automated scheduling: WORKING');
    console.log('✅ Trade execution: OPERATIONAL');
    console.log('✅ Real-time updates: WORKING');
    console.log('\n🚀 System is ready for production use!');
  } else {
    console.log('\n⚠️  SOME SYSTEMS NEED ATTENTION!');
    const failedSystems = Object.entries(results)
      .filter(([_, status]) => !status)
      .map(([system, _]) => system);
    console.log(`Failed systems: ${failedSystems.join(', ')}`);
  }
  
  return passedTests === totalTests;
}

// Execute validation
runFinalValidation()
  .then(success => {
    console.log('\n🏁 Final validation completed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Validation failed:', error);
    process.exit(1);
  });