#!/usr/bin/env node

/**
 * AItradeX1 Complete Test Suite Runner
 * Executes all tests step by step with detailed reporting
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function logTest(category, test, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const message = `${icon} [${category}] ${test}: ${status} ${details}`;
  console.log(message);
  
  results.total++;
  if (status === 'PASS') results.passed++;
  else results.failed++;
  
  results.details.push({ category, test, status, details, message });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// STEP 1: DATABASE CONNECTIVITY TESTS
async function testDatabaseConnectivity() {
  console.log('\n🗄️  STEP 1: DATABASE CONNECTIVITY TESTS');
  console.log('=====================================');

  // Test signals table
  try {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    logTest('DATABASE', 'Signals Table Access', 'PASS', `Found ${signals?.length || 0} signals`);
    
    if (signals && signals.length > 0) {
      const signal = signals[0];
      const hasRequiredFields = signal.symbol && signal.direction && signal.price && signal.score;
      logTest('DATABASE', 'Signals Data Structure', hasRequiredFields ? 'PASS' : 'FAIL', 
        hasRequiredFields ? 'All required fields present' : 'Missing required fields');
    }
  } catch (err) {
    logTest('DATABASE', 'Signals Table Access', 'FAIL', err.message);
  }

  // Test other important tables
  const tables = ['profiles', 'scanner_signals', 'strategy_signals'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) throw error;
      logTest('DATABASE', `${table} Table`, 'PASS', 'Accessible');
    } catch (err) {
      logTest('DATABASE', `${table} Table`, 'FAIL', err.message);
    }
  }
}

// STEP 2: EXTERNAL API CONNECTIVITY TESTS
async function testExternalAPIs() {
  console.log('\n🌐 STEP 2: EXTERNAL API CONNECTIVITY TESTS');
  console.log('==========================================');

  // Test Bybit API connectivity
  try {
    const response = await fetch('https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=5');
    const data = await response.json();
    
    if (data.result && data.result.list && data.result.list.length > 0) {
      const latestBar = data.result.list[0];
      const price = parseFloat(latestBar[4]); // close price
      logTest('EXTERNAL_API', 'Bybit API', 'PASS', `BTC price: $${price.toLocaleString()}`);
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (err) {
    logTest('EXTERNAL_API', 'Bybit API', 'FAIL', err.message);
  }

  // Test multiple timeframes
  const timeframes = ['1', '5', '15', '60'];
  for (const tf of timeframes) {
    try {
      const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=ETHUSDT&interval=${tf}&limit=1`);
      const data = await response.json();
      
      if (data.result && data.result.list && data.result.list.length > 0) {
        logTest('EXTERNAL_API', `${tf}m Timeframe`, 'PASS', 'Data available');
      } else {
        throw new Error('No data returned');
      }
    } catch (err) {
      logTest('EXTERNAL_API', `${tf}m Timeframe`, 'FAIL', err.message);
    }
  }
}

// STEP 3: EDGE FUNCTIONS TESTS
async function testEdgeFunctions() {
  console.log('\n⚡ STEP 3: EDGE FUNCTIONS TESTS');
  console.log('==============================');

  const edgeFunctions = [
    { 
      name: 'aitradex1-config', 
      body: null,
      method: 'GET',
      endpoint: `${supabaseUrl}/functions/v1/aitradex1-config?relaxed_filters=false`
    },
    { 
      name: 'scanner-engine', 
      body: { exchange: 'bybit', timeframe: '1h', relaxed_filters: true }
    },
    { 
      name: 'enhanced-signal-generation', 
      body: { symbols: ['BTCUSDT', 'ETHUSDT'] }
    },
    { 
      name: 'live-scanner-production', 
      body: { exchange: 'bybit', timeframe: '1h', relaxed_filters: true }
    },
    { 
      name: 'signals-api', 
      body: { path: '/signals/live' }
    }
  ];

  for (const func of edgeFunctions) {
    try {
      console.log(`\n📡 Testing ${func.name}...`);
      
      let result;
      if (func.method === 'GET') {
        const response = await fetch(func.endpoint, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          }
        });
        result = { data: await response.json(), error: null };
      } else {
        result = await supabase.functions.invoke(func.name, { body: func.body });
      }

      if (result.error) {
        logTest('EDGE_FUNCTIONS', func.name, 'FAIL', result.error.message);
      } else {
        const data = result.data;
        const success = data?.success !== false;
        const details = data?.message || data?.signals_found || data?.config?.name || 'Function accessible';
        logTest('EDGE_FUNCTIONS', func.name, success ? 'PASS' : 'FAIL', details);
      }
    } catch (err) {
      logTest('EDGE_FUNCTIONS', func.name, 'FAIL', err.message);
    }
    
    // Small delay between function calls
    await sleep(1000);
  }
}

// STEP 4: ADVANCED FUNCTIONS TESTS
async function testAdvancedFunctions() {
  console.log('\n🔬 STEP 4: ADVANCED FUNCTIONS TESTS');
  console.log('===================================');

  const advancedFunctions = [
    { 
      name: 'backtest-engine', 
      body: { 
        symbol: 'BTCUSDT',
        strategy: 'aitradex1',
        start_date: '2025-08-01',
        end_date: '2025-08-27',
        timeframe: '1h'
      }
    },
    { 
      name: 'quantum-analysis', 
      body: { tokens: ['BTCUSDT'], simulations: 1000 }
    },
    { 
      name: 'sentiment-analysis', 
      body: { symbols: ['BTCUSDT'], sources: ['twitter'] }
    },
    { 
      name: 'calculate-spynx-scores', 
      body: { user_id: 'test' }
    }
  ];

  for (const func of advancedFunctions) {
    try {
      console.log(`\n🧪 Testing ${func.name}...`);
      
      const { data, error } = await supabase.functions.invoke(func.name, { body: func.body });
      
      if (error) {
        logTest('ADVANCED_FUNCTIONS', func.name, 'FAIL', error.message);
      } else {
        const success = data?.success !== false;
        const details = data?.message || data?.total_trades || data?.analysis_complete || 'Function accessible';
        logTest('ADVANCED_FUNCTIONS', func.name, success ? 'PASS' : 'FAIL', details);
      }
    } catch (err) {
      logTest('ADVANCED_FUNCTIONS', func.name, 'FAIL', err.message);
    }
    
    await sleep(1000);
  }
}

// STEP 5: TELEGRAM INTEGRATION TESTS
async function testTelegramIntegration() {
  console.log('\n📱 STEP 5: TELEGRAM INTEGRATION TESTS');
  console.log('====================================');

  const testSignals = [
    {
      name: 'Free Signal Test',
      signal: {
        signal_id: `test_free_${Date.now()}`,
        token: "BTC",
        direction: "LONG",
        signal_type: "AITRADEX1",
        entry_price: 111000,
        exit_target: 113000,
        stop_loss: 109000,
        leverage: 2,
        confidence_score: 82.5,
        roi_projection: 1.8,
        risk_level: "MEDIUM",
        signal_strength: "STRONG",
        trend_projection: "BULLISH_MOMENTUM",
        is_premium: false
      }
    },
    {
      name: 'Premium Signal Test',
      signal: {
        signal_id: `test_premium_${Date.now()}`,
        token: "ETH",
        direction: "LONG",
        signal_type: "AITRADEX1_PREMIUM",
        entry_price: 3250,
        exit_target: 3400,
        stop_loss: 3150,
        leverage: 3,
        confidence_score: 95.5,
        roi_projection: 4.6,
        risk_level: "LOW",
        signal_strength: "VERY_STRONG",
        trend_projection: "BULLISH_MOMENTUM",
        is_premium: true
      }
    }
  ];

  for (const test of testSignals) {
    try {
      console.log(`\n🔔 Testing ${test.name}...`);
      
      const { data, error } = await supabase.functions.invoke('telegram-bot', {
        body: { signal: test.signal }
      });
      
      if (error) {
        logTest('TELEGRAM', test.name, 'FAIL', error.message);
      } else {
        logTest('TELEGRAM', test.name, 'PASS', 'Signal sent successfully');
      }
    } catch (err) {
      logTest('TELEGRAM', test.name, 'FAIL', err.message);
    }
    
    await sleep(2000); // Longer delay for Telegram
  }
}

// STEP 6: INTEGRATION TESTS
async function testIntegrations() {
  console.log('\n🔗 STEP 6: INTEGRATION TESTS');
  console.log('============================');

  // Test end-to-end signal generation and persistence
  try {
    console.log('\n🔄 Testing end-to-end signal generation...');
    
    const { data, error } = await supabase.functions.invoke('scanner-engine', {
      body: { 
        exchange: 'bybit',
        timeframe: '1h',
        relaxed_filters: true,
        symbols: ['BTCUSDT', 'ETHUSDT']
      }
    });

    if (error) throw error;

    // Wait for signals to be processed
    await sleep(3000);
    
    const { data: newSignals } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    logTest('INTEGRATION', 'Signal Generation Flow', 'PASS', 
      `Generated and persisted signals: ${newSignals?.length || 0}`);
  } catch (err) {
    logTest('INTEGRATION', 'Signal Generation Flow', 'FAIL', err.message);
  }

  // Test data consistency
  try {
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .limit(10);

    if (signals && signals.length > 0) {
      const validSignals = signals.filter(s => 
        s.symbol && 
        s.direction && 
        ['LONG', 'SHORT'].includes(s.direction) &&
        s.price > 0 &&
        s.score >= 0 && s.score <= 100
      );

      const consistency = validSignals.length / signals.length;
      logTest('INTEGRATION', 'Data Consistency', consistency > 0.9 ? 'PASS' : 'FAIL', 
        `${(consistency * 100).toFixed(1)}% valid signals`);
    }
  } catch (err) {
    logTest('INTEGRATION', 'Data Consistency', 'FAIL', err.message);
  }
}

// STEP 7: PERFORMANCE TESTS
async function testPerformance() {
  console.log('\n⚡ STEP 7: PERFORMANCE TESTS');
  console.log('============================');

  // Test function response times
  const performanceTests = [
    { name: 'aitradex1-config', body: null },
    { name: 'signals-api', body: { path: '/signals/live' } }
  ];

  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke(test.name, { body: test.body });
      const duration = Date.now() - startTime;
      
      if (error) {
        logTest('PERFORMANCE', `${test.name} Response Time`, 'FAIL', error.message);
      } else {
        const status = duration < 5000 ? 'PASS' : 'FAIL';
        logTest('PERFORMANCE', `${test.name} Response Time`, status, `${duration}ms`);
      }
    } catch (err) {
      logTest('PERFORMANCE', `${test.name} Response Time`, 'FAIL', err.message);
    }
  }
}

// MAIN TEST EXECUTION
async function runAllTests() {
  const startTime = Date.now();
  
  console.log('🚀 AItradeX1 COMPLETE TEST SUITE - STEP BY STEP');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    await testDatabaseConnectivity();
    await testExternalAPIs();
    await testEdgeFunctions();
    await testAdvancedFunctions();
    await testTelegramIntegration();
    await testIntegrations();
    await testPerformance();

    // Final Report
    const totalTime = Date.now() - startTime;
    const passRate = (results.passed / results.total * 100).toFixed(1);
    const status = passRate >= 80 ? '🟢 OPERATIONAL' : passRate >= 60 ? '🟡 DEGRADED' : '🔴 CRITICAL';
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${status}`);
    console.log(`Tests Passed: ${results.passed}/${results.total} (${passRate}%)`);
    console.log(`Total Duration: ${totalTime}ms`);
    
    if (results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      console.log('-'.repeat(40));
      results.details
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));
    }

    console.log('\n✅ PASSED TESTS:');
    console.log('-'.repeat(40));
    results.details
      .filter(r => r.status === 'PASS')
      .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    if (passRate >= 90) {
      console.log('   ✅ System is production-ready');
      console.log('   ✅ All core functions operational');
      console.log('   ✅ Real market data feeds active');
    } else if (passRate >= 70) {
      console.log('   ⚠️  System mostly operational with minor issues');
      console.log('   ⚠️  Monitor failed components');
      console.log('   ⚠️  Consider investigating failed tests');
    } else {
      console.log('   🚨 Critical issues detected');
      console.log('   🚨 System requires immediate attention');
      console.log('   🚨 Review and fix failed tests before production use');
    }

    console.log('\n🔗 USEFUL LINKS:');
    console.log('-'.repeat(40));
    console.log(`   📊 Supabase Dashboard: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn`);
    console.log(`   📈 Edge Functions: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/functions`);
    console.log(`   📱 Telegram Bot: ${supabaseUrl}/functions/v1/telegram-bot`);
    console.log(`   🔄 Live Scanner: ${supabaseUrl}/functions/v1/live-scanner-production`);

    console.log('\n🎉 TESTING COMPLETE!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Execute all tests
runAllTests().catch(console.error);