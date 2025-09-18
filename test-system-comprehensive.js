// Comprehensive system test to verify all errors are fixed
const comprehensiveSystemTest = async () => {
  console.log('🔧 Running comprehensive system test...\n');

  // Test 1: Database table access
  console.log('📊 Testing database table access...');
  
  const dbTests = [
    { table: 'signals', action: 'SELECT count(*) FROM signals' },
    { table: 'exchange_feed_status', action: 'SELECT count(*) FROM exchange_feed_status' },
    { table: 'execution_orders', action: 'SELECT count(*) FROM execution_orders' },
    { table: 'user_trading_accounts', action: 'SELECT count(*) FROM user_trading_accounts' },
    { table: 'trading_configs', action: 'SELECT count(*) FROM trading_configs' }
  ];

  for (const test of dbTests) {
    try {
      const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/rest/v1/' + test.table + '?select=count', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${test.table} - accessible`);
      } else {
        console.log(`❌ ${test.table} - access denied (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.table} - error: ${error.message}`);
    }
  }

  // Test 2: Edge Functions
  console.log('\n🔧 Testing edge functions...');
  
  const functions = [
    'demo-signal-generator',
    'enhanced-signal-generation', 
    'aitradex1-enhanced-scanner',
    'live-signal-orchestrator',
    'paper-trading-executor'
  ];

  for (const func of functions) {
    try {
      const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
        },
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${func} - working`);
      } else {
        console.log(`⚠️ ${func} - error: ${data.error || 'unknown'}`);
      }
    } catch (error) {
      console.log(`❌ ${func} - exception: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Test 3: Signal constraint validation
  console.log('\n🎯 Testing signal constraint validation...');
  
  try {
    const testSignal = {
      symbol: 'TESTUSDT',
      timeframe: '1h',
      direction: 'LONG', // Correct value
      price: 50000,
      entry_price: 49500,
      score: 85,
      bar_time: new Date().toISOString()
    };

    const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/rest/v1/signals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      },
      body: JSON.stringify(testSignal)
    });

    if (response.ok) {
      console.log('✅ Signal direction constraint - working correctly');
      
      // Clean up test signal
      await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/rest/v1/signals?symbol=eq.TESTUSDT', {
        method: 'DELETE',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
        }
      });
    } else {
      const data = await response.json();
      console.log(`❌ Signal constraint test failed: ${data.message || data.error}`);
    }
  } catch (error) {
    console.log(`❌ Signal constraint test exception: ${error.message}`);
  }

  console.log('\n🏁 Comprehensive system test complete!');
};

comprehensiveSystemTest();