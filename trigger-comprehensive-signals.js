#!/usr/bin/env node

/**
 * Comprehensive Signal System Trigger
 * Enables all symbols and triggers comprehensive signal generation
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function callEdgeFunction(functionName, body = {}) {
  console.log(`🔄 Triggering ${functionName}...`);
  
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
    } else {
      console.log(`❌ ${functionName}: Error ${response.status}`);
      console.log(`   Error:`, data);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`💥 ${functionName}: Exception - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function enableComprehensiveTrading() {
  console.log('🚀 Enabling Comprehensive Trading System...\n');

  // Step 1: Fetch and enable all symbols
  console.log('📊 Phase 1: Fetching all available symbols...');
  const fetchResult = await callEdgeFunction('fetch-all-symbols');
  
  if (!fetchResult.success) {
    console.error('❌ Failed to fetch symbols. Aborting.');
    return;
  }
  
  console.log('');

  // Step 2: Enable comprehensive system
  console.log('⚙️  Phase 2: Enabling comprehensive trading...');
  const enableResult = await callEdgeFunction('enable-all-symbols');
  
  if (!enableResult.success) {
    console.error('❌ Failed to enable comprehensive system. Aborting.');
    return;
  }
  
  console.log('');

  // Step 3: Trigger comprehensive signal generation
  console.log('🎯 Phase 3: Generating comprehensive signals...');
  
  const signalGenerators = [
    { name: 'live-signals-generator', description: 'Live market signals' },
    { name: 'enhanced-signal-generation', description: 'Enhanced technical signals' },
    { name: 'live-scanner-production', description: 'Production scanner', body: { 
      exchange: 'bybit', 
      timeframe: '15m', 
      relaxed_filters: true,
      comprehensive_scan: true 
    }},
    { name: 'real-time-scanner', description: 'Real-time scanner' },
    { name: 'aitradex1-enhanced-scanner', description: 'AItradeX1 enhanced scanner' }
  ];

  const results = [];
  for (const generator of signalGenerators) {
    const result = await callEdgeFunction(generator.name, generator.body || {});
    results.push({ generator: generator.description, success: result.success });
    
    // Small delay between calls to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📈 Phase 4: Summary Report');
  console.log('=====================================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Signal generators triggered: ${successful}/${total}`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.generator}`);
  });

  if (fetchResult.data?.symbols_count) {
    console.log(`\n🎯 Total symbols enabled: ${fetchResult.data.symbols_count}`);
    console.log(`📊 Expected signal volume: ${Math.round(fetchResult.data.symbols_count * 0.1)} - ${Math.round(fetchResult.data.symbols_count * 0.3)} signals`);
  }
  
  console.log('\n✨ Comprehensive trading system is now active!');
  console.log('⏱️  Monitor the signals table for incoming data');
}

// Run the comprehensive system
enableComprehensiveTrading().catch(console.error);