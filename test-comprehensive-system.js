#!/usr/bin/env node

/**
 * Test the comprehensive trading system
 * Runs the comprehensive signal system and validates it's working
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function callEdgeFunction(functionName, body = {}) {
  console.log(`🔄 Testing ${functionName}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${functionName}: Success`);
      if (data.symbols_count) {
        console.log(`   Symbols: ${data.symbols_count}`);
      }
      if (data.signals_created) {
        console.log(`   Signals: ${data.signals_created}`);
      }
      if (data.symbols_processed) {
        console.log(`   Processed: ${data.symbols_processed}`);
      }
    } else {
      console.log(`❌ ${functionName}: Error ${response.status}`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`💥 ${functionName}: Exception - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testComprehensiveSystem() {
  console.log('🚀 Testing Comprehensive Trading System...\n');

  // Step 1: Test symbol fetching
  console.log('📊 Step 1: Testing symbol fetching...');
  const fetchResult = await callEdgeFunction('fetch-all-symbols');
  console.log('');

  // Step 2: Test live signal generation with new symbols
  console.log('🎯 Step 2: Testing live signal generation...');
  const liveSignalsResult = await callEdgeFunction('live-signals-generator');
  console.log('');

  // Step 3: Test enhanced signal generation
  console.log('🔬 Step 3: Testing enhanced signal generation...');
  const enhancedResult = await callEdgeFunction('enhanced-signal-generation');
  console.log('');

  // Step 4: Test production scanner
  console.log('⚡ Step 4: Testing production scanner...');
  const scannerResult = await callEdgeFunction('live-scanner-production', {
    exchange: 'bybit',
    timeframe: '15m',
    relaxed_filters: true
  });
  console.log('');

  // Summary Report
  console.log('📈 Test Summary');
  console.log('=====================================');
  
  const tests = [
    { name: 'Symbol Fetching', result: fetchResult.success },
    { name: 'Live Signals', result: liveSignalsResult.success },
    { name: 'Enhanced Signals', result: enhancedResult.success },
    { name: 'Production Scanner', result: scannerResult.success }
  ];

  const successful = tests.filter(t => t.success).length;
  const total = tests.length;
  
  console.log(`✅ Tests passed: ${successful}/${total}`);
  
  tests.forEach(test => {
    const status = test.result ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
  });

  if (fetchResult.data?.symbols_count) {
    console.log(`\n🎯 Total symbols available: ${fetchResult.data.symbols_count}`);
  }
  
  if (successful === total) {
    console.log('\n✨ Comprehensive trading system is fully operational!');
  } else {
    console.log('\n⚠️  Some components need attention - check logs above');
  }

  console.log('\n📚 Next steps:');
  console.log('- Monitor signals table for incoming data');
  console.log('- Run trigger-comprehensive-signals.js for full activation');
  console.log('- Check signal quality and volume');
}

// Run the test
testComprehensiveSystem().catch(console.error);