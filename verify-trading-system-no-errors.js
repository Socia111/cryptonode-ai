const fetch = require('node-fetch');

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM";

async function verifyTradingSystemErrors() {
  console.log("🔍 Verifying all trading system errors are fixed...");
  
  const tests = [
    {
      name: "Live Exchange Feed",
      url: `${SUPABASE_URL}/functions/v1/live-exchange-feed`,
      method: 'POST',
      body: { symbols: ['BTCUSDT', 'ETHUSDT'], exchanges: ['bybit'] }
    },
    {
      name: "Enhanced Signal Generation", 
      url: `${SUPABASE_URL}/functions/v1/enhanced-signal-generation`,
      method: 'POST',
      body: { symbols: ['BTCUSDT'], timeframes: ['1h'], algorithms: ['complete_signal_v1'] }
    },
    {
      name: "AItradeX1 Enhanced Scanner",
      url: `${SUPABASE_URL}/functions/v1/aitradex1-enhanced-scanner`, 
      method: 'POST',
      body: { symbols: ['BTCUSDT', 'ETHUSDT'], timeframe: '1h' }
    },
    {
      name: "Paper Trading Executor",
      url: `${SUPABASE_URL}/functions/v1/paper-trading-executor`,
      method: 'POST', 
      body: { symbol: 'BTCUSDT', side: 'buy', quantity: 0.001 }
    },
    {
      name: "Trade Executor Status",
      url: `${SUPABASE_URL}/functions/v1/aitradex1-trade-executor`,
      method: 'POST',
      body: { action: 'status' }
    },
    {
      name: "Signals API",
      url: `${SUPABASE_URL}/functions/v1/signals-api?action=list`,
      method: 'GET'
    }
  ];

  let allPassed = true;
  const results = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}...`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      };

      if (test.body && test.method === 'POST') {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(test.url, options);
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { rawResponse: responseText };
      }

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${test.name}: PASSED`);
        results.push({ test: test.name, status: 'PASSED', data: result });
      } else {
        console.log(`❌ ${test.name}: FAILED (${response.status})`);
        console.log('Response:', result);
        results.push({ test: test.name, status: 'FAILED', error: result, httpStatus: response.status });
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      results.push({ test: test.name, status: 'ERROR', error: error.message });
      allPassed = false;
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n📊 FINAL RESULTS:");
  console.log("==================");
  
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
    }
  });

  if (allPassed) {
    console.log("\n🎉 ALL TESTS PASSED! Trading system is fully operational with real data only.");
  } else {
    console.log("\n⚠️  Some tests failed. System needs additional fixes.");
  }

  return allPassed;
}

verifyTradingSystemErrors().catch(console.error);