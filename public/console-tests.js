// AItradeX1 Browser Console Smoke Tests
// Copy and paste these into your browser console for quick testing

const PROJECT_ID = 'codhlwjogfjywmjyjbbn';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

console.log('🚀 AItradeX1 Console Tests Loaded');
console.log('Run: await quickSmokeTest() for all tests');

// Quick smoke test function
async function quickSmokeTest() {
  console.log('🧪 Starting quick smoke tests...');
  
  try {
    // 0) Functions up?
    console.log('0️⃣ Testing function availability...');
    const pingResults = await Promise.allSettled([
      fetch(`${BASE_URL}/bybit-broker/ping`).then(r => r.json()),
      fetch(`${BASE_URL}/automated-trading-engine/ping`).then(r => r.json())
    ]);
    console.log('✅ Ping results:', pingResults);

    // 1) Secrets visible (masked)
    console.log('1️⃣ Testing secrets visibility...');
    const secrets = await fetch(`${BASE_URL}/bybit-broker/env`).then(r => r.json());
    console.log('✅ Secrets:', secrets);

    // 2) Live Bybit check (signer test)
    console.log('2️⃣ Testing Bybit connection...');
    const connection = await fetch(`${BASE_URL}/bybit-broker/test-connection`).then(r => r.json());
    console.log('✅ Bybit connection:', connection);

    // 3) Status via engine
    console.log('3️⃣ Testing trading engine status...');
    const status = await fetch(`${BASE_URL}/automated-trading-engine`, {
      method: 'POST', 
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    }).then(r => r.json());
    console.log('✅ Trading engine status:', status);

    // 4) Signal generation test
    console.log('4️⃣ Testing signal generation...');
    const signals = await fetch(`${BASE_URL}/live-scanner-production`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        exchange: 'bybit', 
        timeframe: '5m', 
        relaxed_filters: true,
        symbols: ['BTCUSDT'] 
      })
    }).then(r => r.json());
    console.log('✅ Signal generation:', signals);

    console.log('🎉 All smoke tests completed successfully!');
    return { success: true, message: 'All tests passed!' };

  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    return { success: false, error: error.message };
  }
}

// Individual test functions
async function testBybitWebSocket() {
  console.log('🌐 Testing Bybit WebSocket...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
    const messages = [];
    
    const timeout = setTimeout(() => {
      ws.close();
      console.log('❌ WebSocket timeout');
      resolve({ success: false, error: 'timeout' });
    }, 10000);

    ws.onopen = () => {
      console.log('🔗 WebSocket connected, subscribing...');
      ws.send(JSON.stringify({ 
        op: 'subscribe', 
        args: ['publicTrade.BTCUSDT', 'orderbook.1.BTCUSDT'] 
      }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      messages.push(data);
      console.log('📨 WS Message:', data);
      
      if (messages.length >= 3) {
        clearTimeout(timeout);
        ws.close();
        console.log('✅ WebSocket test complete!');
        resolve({ success: true, messageCount: messages.length, samples: messages.slice(0, 2) });
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', error);
      resolve({ success: false, error: 'connection_error' });
    };
  });
}

// Check realtime subscription state
function checkRealtimeChannels() {
  if (typeof supabase !== 'undefined') {
    const channels = supabase.getChannels();
    console.log('📡 Realtime channels:', channels.map(c => ({ 
      name: c.topic || c.name, 
      state: c.state 
    })));
    return channels;
  } else {
    console.log('⚠️ Supabase client not available in this context');
    return null;
  }
}

// Quick Bybit retCode decoder
function decodeBybitError(retCode) {
  const codes = {
    10002: 'Time drift - check system time vs Bybit server time',
    10004: 'Signature mismatch - check API secret and signing process',
    10005: 'Permission denied - check API key permissions',
    401: 'Unauthorized - check API key',
    403: 'Forbidden - check IP allowlist',
    10003: 'Invalid API key',
    10006: 'Too many requests',
    10007: 'Invalid request format'
  };
  
  return codes[retCode] || `Unknown retCode: ${retCode}`;
}

// Export functions for easy access
window.quickSmokeTest = quickSmokeTest;
window.testBybitWebSocket = testBybitWebSocket;
window.checkRealtimeChannels = checkRealtimeChannels;
window.decodeBybitError = decodeBybitError;

console.log('🎯 Available functions:');
console.log('  - await quickSmokeTest()');
console.log('  - await testBybitWebSocket()');
console.log('  - checkRealtimeChannels()');
console.log('  - decodeBybitError(code)');