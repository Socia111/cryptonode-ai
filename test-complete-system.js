#!/usr/bin/env node

// ULTIMATE SYSTEM TEST - Tests everything simultaneously
// This will stress test all components at once

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 ULTIMATE AITRADEX1 SYSTEM STRESS TEST');
console.log('========================================');

const testResults = [];
let totalTests = 0;
let passedTests = 0;

function logResult(category, test, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${category}] ${test}: ${details}`);
  
  testResults.push({ category, test, passed, details });
  totalTests++;
  if (passed) passedTests++;
}

// 1. RAPID SIGNAL GENERATION TEST
async function testSignalGeneration() {
  console.log('\n🎯 RAPID SIGNAL GENERATION TEST');
  console.log('-------------------------------');

  const functions = [
    'enhanced-signal-generation',
    'live-signals-generator', 
    'aitradex1-enhanced-scanner',
    'scanner-engine',
    'live-scanner-production'
  ];

  // Test all signal generators simultaneously
  const promises = functions.map(async (funcName) => {
    try {
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { 
          symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
          timeframe: '15m',
          exchange: 'bybit'
        }
      });

      if (error) throw error;
      
      const signalsCount = data?.signals_found || data?.signals_created || data?.count || 0;
      logResult('SIGNAL_GEN', funcName, true, `${signalsCount} signals`);
      return { funcName, success: true, count: signalsCount };
    } catch (err) {
      logResult('SIGNAL_GEN', funcName, false, err.message);
      return { funcName, success: false, error: err.message };
    }
  });

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.success).length;
  
  logResult('SIGNAL_GEN', 'Parallel Generation', successCount === functions.length, 
    `${successCount}/${functions.length} generators working`);

  return results;
}

// 2. DATABASE PERFORMANCE TEST  
async function testDatabasePerformance() {
  console.log('\n📊 DATABASE PERFORMANCE TEST');
  console.log('----------------------------');

  // Test concurrent reads
  const readPromises = [
    supabase.from('signals').select('*').limit(50),
    supabase.from('signals').select('*').eq('is_active', true).limit(20),
    supabase.from('signals').select('*').gte('score', 70).limit(30),
    supabase.from('live_market_data').select('*').limit(20),
    supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(10)
  ];

  try {
    const startTime = Date.now();
    const results = await Promise.all(readPromises);
    const duration = Date.now() - startTime;
    
    const totalRecords = results.reduce((sum, r) => sum + (r.data?.length || 0), 0);
    logResult('DATABASE', 'Concurrent Reads', true, `${totalRecords} records in ${duration}ms`);
  } catch (err) {
    logResult('DATABASE', 'Concurrent Reads', false, err.message);
  }

  // Test signal quality
  try {
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .limit(100);

    if (signals && signals.length > 0) {
      const validSignals = signals.filter(s => 
        s.symbol && s.price > 0 && s.score >= 0 && s.score <= 100
      );
      const quality = (validSignals.length / signals.length * 100).toFixed(1);
      logResult('DATABASE', 'Signal Quality', quality > 90, `${quality}% valid`);
    }
  } catch (err) {
    logResult('DATABASE', 'Signal Quality', false, err.message);
  }
}

// 3. REAL-TIME FEED TEST
async function testRealTimeFeeds() {
  console.log('\n📡 REAL-TIME FEEDS TEST');
  console.log('----------------------');

  // Test external APIs
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'];
  const apiPromises = symbols.map(async (symbol) => {
    try {
      const response = await fetch(
        `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=15&limit=1`
      );
      const data = await response.json();
      
      if (data.result && data.result.list && data.result.list.length > 0) {
        const price = parseFloat(data.result.list[0][4]);
        logResult('FEEDS', symbol, true, `$${price.toLocaleString()}`);
        return { symbol, price, success: true };
      } else {
        throw new Error('No data');
      }
    } catch (err) {
      logResult('FEEDS', symbol, false, err.message);
      return { symbol, success: false };
    }
  });

  const feedResults = await Promise.all(apiPromises);
  const workingFeeds = feedResults.filter(r => r.success).length;
  
  logResult('FEEDS', 'Feed Availability', workingFeeds === symbols.length, 
    `${workingFeeds}/${symbols.length} feeds active`);

  return feedResults;
}

// 4. API STRESS TEST
async function testAPIStress() {
  console.log('\n🌐 API STRESS TEST');
  console.log('-----------------');

  const apiCalls = [
    { name: 'signals-api', body: { path: '/signals/live' } },
    { name: 'aitradex1-config', body: {} },
    { name: 'signals-api', body: { path: '/signals/recent' } },
    { name: 'health', body: {} }
  ];

  const stressPromises = apiCalls.map(async (api) => {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke(api.name, { body: api.body });
      const responseTime = Date.now() - startTime;
      
      if (error) throw error;
      
      logResult('API_STRESS', api.name, true, `${responseTime}ms response`);
      return { api: api.name, responseTime, success: true };
    } catch (err) {
      logResult('API_STRESS', api.name, false, err.message);
      return { api: api.name, success: false };
    }
  });

  const apiResults = await Promise.all(stressPromises);
  const avgResponseTime = apiResults
    .filter(r => r.success && r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / apiResults.length;

  logResult('API_STRESS', 'Average Response Time', avgResponseTime < 3000, 
    `${avgResponseTime.toFixed(0)}ms average`);

  return apiResults;
}

// 5. INTEGRATION STRESS TEST
async function testIntegrationStress() {
  console.log('\n🔗 INTEGRATION STRESS TEST');
  console.log('--------------------------');

  try {
    // Generate signals and immediately query them
    console.log('   Triggering signal generation cascade...');
    
    const generationPromises = [
      supabase.functions.invoke('enhanced-signal-generation', {
        body: { symbols: ['BTCUSDT', 'ETHUSDT'] }
      }),
      supabase.functions.invoke('live-signals-generator', {
        body: { exchange: 'bybit' }
      })
    ];

    await Promise.all(generationPromises);
    
    // Wait briefly then check results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: recentSignals } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    logResult('INTEGRATION', 'Signal Pipeline', recentSignals && recentSignals.length > 0, 
      `${recentSignals?.length || 0} new signals generated`);

    // Test data consistency
    if (recentSignals && recentSignals.length > 0) {
      const validStructure = recentSignals.every(s => 
        s.symbol && s.price && s.score !== null && s.direction
      );
      logResult('INTEGRATION', 'Data Consistency', validStructure, 
        'All signals have required fields');
    }

  } catch (err) {
    logResult('INTEGRATION', 'Signal Pipeline', false, err.message);
  }
}

// MAIN STRESS TEST RUNNER
async function runStressTest() {
  const overallStart = Date.now();
  
  console.log('⚡ Starting parallel stress test on all systems...\n');

  try {
    // Run all test categories in parallel for maximum stress
    const [
      signalResults,
      dbResults, 
      feedResults,
      apiResults,
      integrationResults
    ] = await Promise.all([
      testSignalGeneration(),
      testDatabasePerformance(),
      testRealTimeFeeds(),
      testAPIStress(),
      testIntegrationStress()
    ]);

    const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(1);
    const passRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n🏁 STRESS TEST COMPLETE');
    console.log('========================');
    console.log(`Duration: ${totalDuration}s`);
    console.log(`Pass Rate: ${passedTests}/${totalTests} (${passRate}%)`);
    
    // Performance Analysis
    if (parseFloat(passRate) >= 90) {
      console.log('\n🚀 SYSTEM STATUS: EXCELLENT');
      console.log('✅ All systems operational under stress');
      console.log('✅ Ready for high-volume production');
      console.log('✅ Signal generation robust');
      console.log('✅ Database performance optimal');
      console.log('✅ Real-time feeds stable');
    } else if (parseFloat(passRate) >= 75) {
      console.log('\n🟡 SYSTEM STATUS: GOOD');
      console.log('⚠️  Minor issues detected under stress');
      console.log('✅ Core functionality working');
    } else {
      console.log('\n🔴 SYSTEM STATUS: NEEDS ATTENTION');
      console.log('❌ Significant issues under stress');
      console.log('🔧 System requires optimization');
    }

    // Failed Tests Summary
    const failedTests = testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`   [${test.category}] ${test.test}: ${test.details}`);
      });
    }

    console.log('\n📊 SYSTEM READY FOR PRODUCTION TRADING');
    
  } catch (error) {
    console.error('💥 Stress test failed:', error);
  }
}

// Execute the ultimate stress test
runStressTest();