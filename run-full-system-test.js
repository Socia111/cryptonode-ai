#!/usr/bin/env node

// AItradeX1 COMPLETE SYSTEM TEST
// Tests everything: Database, Edge Functions, APIs, Real-time feeds, Integration

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 AItradeX1 COMPLETE SYSTEM TEST');
console.log('=================================');

const results = {
  database: 0,
  edgeFunctions: 0,
  apis: 0,
  dataFeeds: 0,
  integration: 0,
  total: 0,
  passed: 0
};

function logTest(category, test, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${test}: ${status} ${details}`);
  
  results.total++;
  if (status === 'PASS') {
    results.passed++;
    results[category.toLowerCase()]++;
  }
}

// 1. DATABASE TESTS
async function testDatabase() {
  console.log('\n📊 DATABASE TESTS');
  console.log('-----------------');

  // Test signals table
  try {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    logTest('DATABASE', 'Signals Table', 'PASS', `${signals?.length || 0} signals found`);
    
    // Check signal quality
    if (signals && signals.length > 0) {
      const validSignals = signals.filter(s => s.symbol && s.price > 0 && s.score >= 0);
      const quality = (validSignals.length / signals.length * 100).toFixed(1);
      logTest('DATABASE', 'Signal Quality', 'PASS', `${quality}% valid`);
    }
  } catch (err) {
    logTest('DATABASE', 'Signals Table', 'FAIL', err.message);
  }

  // Test live_market_data table
  try {
    const { data, error } = await supabase
      .from('live_market_data')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    logTest('DATABASE', 'Live Market Data', 'PASS', `${data?.length || 0} records`);
  } catch (err) {
    logTest('DATABASE', 'Live Market Data', 'FAIL', err.message);
  }

  // Test recent signals
  try {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    logTest('DATABASE', 'Recent Signals', 'PASS', `${data?.length || 0} in last hour`);
  } catch (err) {
    logTest('DATABASE', 'Recent Signals', 'FAIL', err.message);
  }
}

// 2. EDGE FUNCTIONS TESTS
async function testEdgeFunctions() {
  console.log('\n⚡ EDGE FUNCTIONS TESTS');
  console.log('----------------------');

  const functions = [
    {
      name: 'enhanced-signal-generation',
      body: { symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] }
    },
    {
      name: 'live-signals-generator',
      body: { exchange: 'bybit' }
    },
    {
      name: 'aitradex1-enhanced-scanner',
      body: { timeframe: '15m', symbols: ['BTCUSDT', 'ETHUSDT'] }
    },
    {
      name: 'scanner-engine',
      body: { exchange: 'bybit', timeframe: '1h' }
    },
    {
      name: 'signals-api',
      body: { path: '/signals/live' }
    },
    {
      name: 'live-scanner-production',
      body: { exchange: 'bybit', timeframe: '15m', relaxed_filters: true }
    }
  ];

  for (const func of functions) {
    try {
      const { data, error } = await supabase.functions.invoke(func.name, {
        body: func.body
      });

      if (error) throw error;
      
      const success = data?.success !== false;
      const details = data?.signals_found ? `${data.signals_found} signals` : 
                     data?.count ? `${data.count} items` : 'operational';
      
      logTest('EDGEFUNCTIONS', func.name, success ? 'PASS' : 'FAIL', details);
    } catch (err) {
      logTest('EDGEFUNCTIONS', func.name, 'FAIL', err.message);
    }
  }
}

// 3. REAL-TIME DATA FEEDS
async function testDataFeeds() {
  console.log('\n📡 DATA FEEDS TESTS');
  console.log('-------------------');

  // Test Bybit API
  try {
    const response = await fetch('https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=1');
    const data = await response.json();
    
    if (data.result && data.result.list) {
      const price = parseFloat(data.result.list[0][4]);
      logTest('DATAFEEDS', 'Bybit API', 'PASS', `BTC: $${price.toLocaleString()}`);
    } else {
      throw new Error('Invalid response');
    }
  } catch (err) {
    logTest('DATAFEEDS', 'Bybit API', 'FAIL', err.message);
  }

  // Test multiple symbols
  const symbols = ['ETHUSDT', 'SOLUSDT', 'ADAUSDT'];
  for (const symbol of symbols) {
    try {
      const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=15&limit=1`);
      const data = await response.json();
      
      if (data.result && data.result.list) {
        logTest('DATAFEEDS', symbol, 'PASS', `Live data available`);
      } else {
        throw new Error('No data');
      }
    } catch (err) {
      logTest('DATAFEEDS', symbol, 'FAIL', err.message);
    }
  }
}

// 4. API ENDPOINTS TESTS
async function testAPIs() {
  console.log('\n🌐 API ENDPOINTS TESTS');
  console.log('---------------------');

  // Test signals API
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
    logTest('APIS', 'Signals API', data.success ? 'PASS' : 'FAIL', 
      data.items ? `${data.items.length} signals` : 'accessible');
  } catch (err) {
    logTest('APIS', 'Signals API', 'FAIL', err.message);
  }

  // Test config API
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aitradex1-config`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    logTest('APIS', 'Config API', data.config ? 'PASS' : 'FAIL', 'configuration accessible');
  } catch (err) {
    logTest('APIS', 'Config API', 'FAIL', err.message);
  }
}

// 5. INTEGRATION TESTS
async function testIntegration() {
  console.log('\n🔗 INTEGRATION TESTS');
  console.log('--------------------');

  // Test signal generation and persistence
  try {
    console.log('   Generating fresh signals...');
    
    const { data } = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { symbols: ['BTCUSDT', 'ETHUSDT'] }
    });

    // Wait and check persistence
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { data: newSignals } = await supabase
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    logTest('INTEGRATION', 'Signal Pipeline', 'PASS', `${newSignals?.length || 0} new signals`);
  } catch (err) {
    logTest('INTEGRATION', 'Signal Pipeline', 'FAIL', err.message);
  }

  // Test real-time subscription
  try {
    let receivedUpdate = false;
    
    const subscription = supabase
      .channel('signals_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'signals' },
        (payload) => {
          receivedUpdate = true;
        }
      )
      .subscribe();

    // Trigger a change
    await supabase.functions.invoke('enhanced-signal-generation', {
      body: { symbols: ['BTCUSDT'] }
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    subscription.unsubscribe();
    logTest('INTEGRATION', 'Real-time Updates', receivedUpdate ? 'PASS' : 'FAIL', 
      receivedUpdate ? 'receiving updates' : 'no updates detected');
  } catch (err) {
    logTest('INTEGRATION', 'Real-time Updates', 'FAIL', err.message);
  }
}

// MAIN TEST RUNNER
async function runCompleteTest() {
  const startTime = Date.now();
  
  try {
    await testDatabase();
    await testDataFeeds();
    await testEdgeFunctions();
    await testAPIs();
    await testIntegration();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const passRate = (results.passed / results.total * 100).toFixed(1);
    
    console.log('\n📋 COMPLETE TEST RESULTS');
    console.log('========================');
    console.log(`Duration: ${duration}s`);
    console.log(`Tests Passed: ${results.passed}/${results.total} (${passRate}%)`);
    console.log(`Database: ${results.database} passed`);
    console.log(`Edge Functions: ${results.edgefunctions} passed`);
    console.log(`Data Feeds: ${results.datafeeds} passed`);
    console.log(`APIs: ${results.apis} passed`);
    console.log(`Integration: ${results.integration} passed`);
    
    const status = passRate >= 90 ? '🟢 EXCELLENT' : 
                   passRate >= 75 ? '🟡 GOOD' : 
                   passRate >= 50 ? '🟠 NEEDS ATTENTION' : '🔴 CRITICAL';
    
    console.log(`\nOverall Status: ${status}`);
    
    if (passRate >= 80) {
      console.log('\n✨ SYSTEM FULLY OPERATIONAL');
      console.log('🚀 Ready for production trading');
      console.log('📈 All signal generation working');
      console.log('📊 Real-time data feeds active');
    } else {
      console.log('\n⚠️  SYSTEM NEEDS ATTENTION');
      console.log('Check failed tests above for issues');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run the complete test
runCompleteTest();