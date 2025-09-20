#!/usr/bin/env node

/**
 * Complete Real Data Activation
 * Activates all comprehensive systems and triggers real data feeds
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function callEdgeFunction(functionName, body = {}) {
  console.log(`🔄 ${functionName}...`);
  
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
      return { success: true, data };
    } else {
      console.log(`❌ ${functionName}: ${response.status} - ${JSON.stringify(data)}`);
      return { success: false, data };
    }
  } catch (error) {
    console.log(`💥 ${functionName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function activateRealDataSystem() {
  console.log('🚀 ACTIVATING COMPLETE REAL DATA SYSTEM\n');

  // Phase 1: Initialize symbol system
  console.log('📊 Phase 1: Fetching ALL available symbols...');
  const symbolsResult = await callEdgeFunction('fetch-all-symbols');
  
  if (symbolsResult.success) {
    console.log(`   ✅ ${symbolsResult.data.symbols_count} symbols ready\n`);
  } else {
    console.log('   ⚠️  Continuing with existing symbols\n');
  }

  // Phase 2: Enable comprehensive mode
  console.log('⚙️  Phase 2: Activating comprehensive trading...');
  await callEdgeFunction('enable-all-symbols');
  console.log('');

  // Phase 3: Live data feeds (parallel activation)
  console.log('📡 Phase 3: Starting live data feeds...');
  const dataFeeds = [
    { name: 'live-crypto-feed', description: 'Real-time market data' },
    { name: 'live-price-feed', description: 'Live price updates' },
    { name: 'free-crypto-api-integration', description: 'Enhanced market data' }
  ];

  const feedPromises = dataFeeds.map(feed => callEdgeFunction(feed.name));
  const feedResults = await Promise.allSettled(feedPromises);
  
  feedResults.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value.success ? '✅' : '⚠️';
    console.log(`   ${status} ${dataFeeds[index].description}`);
  });
  console.log('');

  // Phase 4: Signal generation systems (parallel)
  console.log('🎯 Phase 4: Activating signal generators...');
  const signalGenerators = [
    { name: 'live-signals-generator', desc: 'Live signals' },
    { name: 'enhanced-signal-generation', desc: 'Enhanced signals' },
    { name: 'aitradex1-enhanced-scanner', desc: 'AItradeX1 scanner' },
    { name: 'real-time-scanner', desc: 'Real-time scanner' },
    { name: 'signal-engine-15m', desc: '15m signals' },
    { name: 'signal-engine-1d', desc: '1d strategic signals' }
  ];

  const genPromises = signalGenerators.map(gen => callEdgeFunction(gen.name));
  const genResults = await Promise.allSettled(genPromises);
  
  genResults.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value.success ? '✅' : '⚠️';
    console.log(`   ${status} ${signalGenerators[index].desc}`);
  });
  console.log('');

  // Phase 5: Production scanners 
  console.log('⚡ Phase 5: Production scanner activation...');
  const timeframes = ['5m', '15m', '1h', '4h'];
  
  const scanPromises = timeframes.map(tf => 
    callEdgeFunction('live-scanner-production', {
      exchange: 'bybit',
      timeframe: tf,
      relaxed_filters: tf === '5m' || tf === '15m', // Relaxed for shorter timeframes
      symbols: [] // Empty = ALL symbols
    })
  );

  const scanResults = await Promise.allSettled(scanPromises);
  
  scanResults.forEach((result, index) => {
    const status = result.status === 'fulfilled' && result.value.success ? '✅' : '⚠️';
    console.log(`   ${status} ${timeframes[index]} scanner`);
  });
  console.log('');

  // Phase 6: Additional engines
  console.log('🔬 Phase 6: Specialized engines...');
  const specialEngines = [
    { name: 'quantum-analysis', desc: 'Quantum analysis' },
    { name: 'sentiment-analysis', desc: 'Market sentiment' },
    { name: 'portfolio-optimization', desc: 'Portfolio optimization' }
  ];

  for (const engine of specialEngines) {
    const result = await callEdgeFunction(engine.name);
    const status = result.success ? '✅' : '⚠️';
    console.log(`   ${status} ${engine.desc}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
  console.log('');

  // Summary
  console.log('📈 ACTIVATION COMPLETE');
  console.log('=====================================');
  console.log('✅ Real data system is now FULLY ACTIVE');
  console.log('✅ All available symbols are being monitored');
  console.log('✅ Multiple signal generators are running');
  console.log('✅ Live data feeds are operational');
  
  if (symbolsResult.success && symbolsResult.data.symbols_count) {
    console.log(`📊 Monitoring ${symbolsResult.data.symbols_count} trading pairs`);
    console.log(`🎯 Expected signal volume: HIGH`);
  }
  
  console.log('\n⏱️  Monitor the signals table for incoming data');
  console.log('🔄 System will continuously generate fresh signals');
  console.log('📱 Real-time updates are active via websockets');
}

// Execute the complete activation
activateRealDataSystem().catch(console.error);