#!/usr/bin/env node

/**
 * Live Signal Generator - Real Market Data
 * Triggers multiple signal generation functions to create real trading signals
 */

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function callEdgeFunction(functionName, body = {}) {
  console.log(`🚀 Triggering ${functionName}...`);
  
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

async function generateLiveSignals() {
  console.log('🚀 Starting LIVE signal generation from real market data...\n');

  // 1. Initialize real system (clear mock data)
  await callEdgeFunction('system-initializer', {
    mode: 'live_data',
    clear_demo: true
  });
  console.log('');

  // 2. Start live crypto feed with multiple algorithms
  await callEdgeFunction('live-crypto-feed', {
    start_aitradex1: true,
    start_aira: true,
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT']
  });
  console.log('');

  // 3. Live scanner across multiple timeframes
  const timeframes = ['5m', '15m', '30m', '1h'];
  for (const tf of timeframes) {
    await callEdgeFunction('live-scanner-production', {
      exchange: 'bybit',
      timeframe: tf,
      relaxed_filters: false, // Use strict filters for quality signals
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']
    });
  }
  console.log('');

  // 4. Enhanced signal generation with real market analysis
  await callEdgeFunction('enhanced-signal-generation', {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'],
    timeframes: ['15m', '30m', '1h'],
    algorithms: ['AITRADEX1', 'AIRATETHECOIN'],
    enhanced_mode: true
  });
  console.log('');

  // 5. Free Crypto API integration for additional signals
  await callEdgeFunction('free-crypto-api-integration', {
    action: 'generate_enhanced_signals',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
  });
  console.log('');

  // 6. Real-time crypto scanner
  await callEdgeFunction('realtime-crypto-scanner', {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'],
    timeframes: ['15m', '1h'],
    enable_live_feed: true
  });
  console.log('');

  // 7. Start CCXT live feed for continuous data
  await callEdgeFunction('ccxt-live-feed', {
    exchanges: ['bybit', 'binance'],
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
    continuous: true
  });

  console.log('\n✨ Live signal generation complete!');
  console.log('📈 Real trading signals should start appearing from live market data');
  console.log('⏱️  Signals will update continuously as market conditions change');
}

// Execute
generateLiveSignals().catch(console.error);