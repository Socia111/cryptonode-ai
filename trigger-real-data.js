#!/usr/bin/env node

/**
 * Real Data Trigger - No Samples
 * Triggers live edge functions to populate database with real trading data
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
      if (data.signals_found !== undefined) {
        console.log(`   📊 Signals found: ${data.signals_found}`);
      }
      if (data.symbols_processed !== undefined) {
        console.log(`   🔍 Symbols processed: ${data.symbols_processed}`);
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

async function generateRealData() {
  console.log('🚀 Generating REAL trading data...\n');

  // 1. Live Scanner Production - Multiple timeframes
  const timeframes = ['5m', '15m', '30m', '1h', '2h', '4h'];
  
  for (const tf of timeframes) {
    await callEdgeFunction('live-scanner-production', {
      exchange: 'bybit',
      timeframe: tf,
      relaxed_filters: true,
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT']
    });
    console.log('');
  }

  // 2. Enhanced Signal Generation
  await callEdgeFunction('enhanced-signal-generation', {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    timeframes: ['15m', '1h'],
    algorithms: ['AITRADEX1', 'AIRATETHECOIN']
  });
  console.log('');

  // 3. Quantum Analysis
  await callEdgeFunction('quantum-analysis', {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    analysis_types: ['wave_analysis', 'sentiment_analysis', 'momentum_analysis']
  });
  console.log('');

  // 4. Calculate Spynx Scores
  await callEdgeFunction('calculate-spynx-scores', {
    user_id: '00000000-0000-0000-0000-000000000000', // System user
    force_refresh: true
  });
  console.log('');

  // 5. Generate live signals
  await callEdgeFunction('generate-signals', {
    force_refresh: true,
    algorithms: ['AITRADEX1'],
    timeframes: ['15m', '1h']
  });

  console.log('\n✨ Real data generation complete!');
  console.log('⏱️  Check your database for live trading data');
}

// Execute
generateRealData().catch(console.error);