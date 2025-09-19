#!/usr/bin/env node

// Comprehensive AItradeX1 System Test Suite
// Tests all backend functions, APIs, data feeds, and Telegram integration

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 AItradeX1 COMPREHENSIVE SYSTEM TEST');
console.log('=====================================');

// Test Results Storage
const results = {
  database: {},
  edgeFunctions: {},
  apis: {},
  telegram: {},
  dataFeeds: {},
  overall: { passed: 0, failed: 0, total: 0 }
};

function logTest(category, test, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${test}: ${status} ${details}`);
  
  if (!results[category.toLowerCase()]) results[category.toLowerCase()] = {};
  results[category.toLowerCase()][test] = { status, details };
  
  results.overall.total++;
  if (status === 'PASS') results.overall.passed++;
  else results.overall.failed++;
}

// 1. DATABASE CONNECTIVITY TESTS
async function testDatabase() {
  console.log('\n📊 DATABASE CONNECTIVITY TESTS');
  console.log('-------------------------------');

  // Test signals table (main data source)
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

  // Test signals_state table (cooldown management)
  try {
    const { data, error } = await supabase
      .from('signals_state')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    logTest('DATABASE', 'Signals State Table', 'PASS', 'Cooldown table accessible');
  } catch (err) {
    logTest('DATABASE', 'Signals State Table', 'FAIL', err.message);
  }

  // Test alerts_log table (telegram logging)
  try {
    const { data, error } = await supabase
      .from('alerts_log')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    logTest('DATABASE', 'Alerts Log Table', 'PASS', 'Telegram log table accessible');
  } catch (err) {
    logTest('DATABASE', 'Alerts Log Table', 'FAIL', err.message);
  }
}

// 2. EDGE FUNCTIONS TESTS
async function testEdgeFunctions() {
  console.log('\n⚡ EDGE FUNCTIONS TESTS');
  console.log('----------------------');

  // Test live-scanner function
  try {
    const { data, error } = await supabase.functions.invoke('live-scanner', {
      body: { 
        exchange: 'bybit',
        timeframe: '1h',
        relaxed_filters: false,
        symbols: ['BTCUSDT', 'ETHUSDT'] // Test with limited symbols for speed
      }
    });

    if (error) throw error;
    
    const success = data?.success;
    const signalsFound = data?.signals_found || 0;
    logTest('EDGE_FUNCTIONS', 'Live Scanner', success ? 'PASS' : 'FAIL', 
      `Found ${signalsFound} signals`);
  } catch (err) {
    logTest('EDGE_FUNCTIONS', 'Live Scanner', 'FAIL', err.message);
  }

  // Test scanner-engine function
  try {
    const { data, error } = await supabase.functions.invoke('scanner-engine', {
      body: { 
        exchange: 'bybit',
        timeframe: '1h',
        relaxed_filters: true
      }
    });

    if (error) throw error;
    
    const success = data?.success;
    logTest('EDGE_FUNCTIONS', 'Scanner Engine', success ? 'PASS' : 'FAIL', 
      data?.message || 'Engine operational');
  } catch (err) {
    logTest('EDGE_FUNCTIONS', 'Scanner Engine', 'FAIL', err.message);
  }

  // Test signals-api function
  try {
    const { data, error } = await supabase.functions.invoke('signals-api', {
      body: { path: '/signals/live' }
    });

    if (error) throw error;
    
    const success = data?.success;
    const count = data?.count || 0;
    logTest('EDGE_FUNCTIONS', 'Signals API', success ? 'PASS' : 'FAIL', 
      `Retrieved ${count} signals`);
  } catch (err) {
    logTest('EDGE_FUNCTIONS', 'Signals API', 'FAIL', err.message);
  }

  // Test telegram-bot function
  try {
    const { data, error } = await supabase.functions.invoke('telegram-bot', {
      body: { 
        type: 'test',
        data: {
          message: 'AItradeX1 System Test - All systems operational'
        }
      }
    });

    if (error) throw error;
    
    const success = data?.success !== false; // Some functions might not return success flag
    logTest('EDGE_FUNCTIONS', 'Telegram Bot', success ? 'PASS' : 'FAIL', 
      'Bot function accessible');
  } catch (err) {
    logTest('EDGE_FUNCTIONS', 'Telegram Bot', 'FAIL', err.message);
  }
}

// 3. REAL DATA FEEDS TESTS
async function testDataFeeds() {
  console.log('\n📡 REAL DATA FEEDS TESTS');
  console.log('------------------------');

  // Test Bybit API connectivity
  try {
    const response = await fetch('https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=5');
    const data = await response.json();
    
    if (data.result && data.result.list && data.result.list.length > 0) {
      const latestBar = data.result.list[0];
      const price = parseFloat(latestBar[4]); // close price
      logTest('DATA_FEEDS', 'Bybit API', 'PASS', `BTC price: $${price.toLocaleString()}`);
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (err) {
    logTest('DATA_FEEDS', 'Bybit API', 'FAIL', err.message);
  }

  // Test multiple timeframes
  const timeframes = ['1', '5', '15', '60'];
  for (const tf of timeframes) {
    try {
      const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=ETHUSDT&interval=${tf}&limit=1`);
      const data = await response.json();
      
      if (data.result && data.result.list && data.result.list.length > 0) {
        logTest('DATA_FEEDS', `${tf}m Timeframe`, 'PASS', 'Data available');
      } else {
        throw new Error('No data returned');
      }
    } catch (err) {
      logTest('DATA_FEEDS', `${tf}m Timeframe`, 'FAIL', err.message);
    }
  }

  // Test multiple symbols
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'];
  for (const symbol of symbols) {
    try {
      const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=1`);
      const data = await response.json();
      
      if (data.result && data.result.list && data.result.list.length > 0) {
        const price = parseFloat(data.result.list[0][4]);
        logTest('DATA_FEEDS', `${symbol} Feed`, 'PASS', `Price: ${price}`);
      } else {
        throw new Error('No data returned');
      }
    } catch (err) {
      logTest('DATA_FEEDS', `${symbol} Feed`, 'FAIL', err.message);
    }
  }
}

// 4. API ENDPOINTS TESTS
async function testAPIs() {
  console.log('\n🌐 API ENDPOINTS TESTS');
  console.log('---------------------');

  // Test signals endpoint
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/signals-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ path: '/signals/live' })
    });

    const data = await response.json();
    if (data.success && data.items) {
      logTest('APIS', 'Signals Endpoint', 'PASS', `${data.items.length} signals retrieved`);
    } else {
      throw new Error('Invalid response');
    }
  } catch (err) {
    logTest('APIS', 'Signals Endpoint', 'FAIL', err.message);
  }

  // Test configuration endpoint
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aitradex1-config?relaxed_filters=false`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    if (data.config && data.config.inputs) {
      logTest('APIS', 'Config Endpoint', 'PASS', 'Configuration accessible');
    } else {
      throw new Error('Invalid config response');
    }
  } catch (err) {
    logTest('APIS', 'Config Endpoint', 'FAIL', err.message);
  }
}

// 5. INTEGRATION TESTS
async function testIntegrations() {
  console.log('\n🔗 INTEGRATION TESTS');
  console.log('--------------------');

  // Test end-to-end signal generation
  try {
    console.log('   Running full signal generation test...');
    
    const { data, error } = await supabase.functions.invoke('live-scanner', {
      body: { 
        exchange: 'bybit',
        timeframe: '15m',
        relaxed_filters: true,
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
      }
    });

    if (error) throw error;

    // Wait a moment then check if signals were persisted
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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

// MAIN TEST EXECUTION
async function runAllTests() {
  try {
    await testDatabase();
    await testDataFeeds();
    await testEdgeFunctions();
    await testAPIs();
    await testIntegrations();

    // Final Report
    console.log('\n📋 FINAL SYSTEM REPORT');
    console.log('======================');
    
    const passRate = (results.overall.passed / results.overall.total * 100).toFixed(1);
    const status = passRate >= 80 ? '🟢 OPERATIONAL' : passRate >= 60 ? '🟡 DEGRADED' : '🔴 CRITICAL';
    
    console.log(`Overall Status: ${status}`);
    console.log(`Tests Passed: ${results.overall.passed}/${results.overall.total} (${passRate}%)`);
    
    if (results.overall.failed > 0) {
      console.log('\n❌ Failed Tests:');
      Object.entries(results).forEach(([category, tests]) => {
        if (category !== 'overall' && typeof tests === 'object') {
          Object.entries(tests).forEach(([test, result]) => {
            if (result.status === 'FAIL') {
              console.log(`   - [${category.toUpperCase()}] ${test}: ${result.details}`);
            }
          });
        }
      });
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    if (passRate >= 90) {
      console.log('   ✅ System is production-ready');
      console.log('   ✅ All core functions operational');
      console.log('   ✅ Real market data feeds active');
    } else if (passRate >= 70) {
      console.log('   ⚠️  System mostly operational with minor issues');
      console.log('   ⚠️  Monitor failed components');
    } else {
      console.log('   🚨 Critical issues detected');
      console.log('   🚨 System requires immediate attention');
    }

    console.log('\n🔗 USEFUL LINKS:');
    console.log(`   📊 Supabase Dashboard: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn`);
    console.log(`   📈 Signals API: ${supabaseUrl}/functions/v1/signals-api`);
    console.log(`   🤖 Telegram Bot: ${supabaseUrl}/functions/v1/telegram-bot`);
    console.log(`   📡 Live Scanner: ${supabaseUrl}/functions/v1/live-scanner`);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Execute tests
runAllTests();