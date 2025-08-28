#!/usr/bin/env node

/**
 * Live Data Feed Trigger
 * Triggers all real-time data feeds to populate the database
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
      console.log(`   Data:`, JSON.stringify(data, null, 2));
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

async function triggerLiveFeeds() {
  console.log('🚀 Starting real-time data feed triggers...\n');

  // 1. Trigger live crypto feed
  await callEdgeFunction('live-crypto-feed', {
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'],
    exchanges: ['bybit', 'binance']
  });

  console.log('');

  // 2. Trigger free crypto API integration
  await callEdgeFunction('free-crypto-api-integration', {
    market_data: true,
    price_updates: true
  });

  console.log('');

  // 3. Trigger realtime crypto scanner with relaxed filters
  await callEdgeFunction('realtime-crypto-scanner', {
    algorithms: ['AITRADEX1', 'AIRATETHECOIN'],
    timeframes: ['5m', '15m', '1h'],
    limit: 50
  });

  console.log('');

  // 4. Trigger automated crypto scanner
  await callEdgeFunction('automated-crypto-scanner');

  console.log('');

  // 5. Trigger live scanner production
  await callEdgeFunction('live-scanner-production', {
    exchange: 'bybit',
    timeframe: '1h',
    relaxed_filters: true,
    symbols: []
  });

  console.log('');

  // 6. Generate fresh signals
  await callEdgeFunction('generate-signals', {
    force_refresh: true,
    algorithms: ['AITRADEX1']
  });

  console.log('');

  // 7. Update AIRA rankings
  await callEdgeFunction('aira-rankings-sync', {
    force_update: true
  });

  console.log('\n✨ All real-time data feeds triggered!');
  console.log('⏱️  Data should populate within 1-2 minutes');
}

// Run the feeds
triggerLiveFeeds().catch(console.error);