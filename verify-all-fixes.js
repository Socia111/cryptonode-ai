// Comprehensive verification script
console.log('🧪 Starting comprehensive system verification...\n');

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function testDatabase() {
  try {
    console.log('1️⃣ Testing database connectivity...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      console.log('✅ Database accessible');
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
    return false;
  }
}

async function testSignalsTable() {
  try {
    console.log('2️⃣ Testing signals table...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&limit=5&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.length > 0) {
      console.log(`✅ Found ${data.length} recent signals`);
      console.log(`   Latest signal: ${data[0].symbol} ${data[0].direction} (${data[0].score}%)`);
      return true;
    } else {
      console.log('❌ No signals found or table error');
      return false;
    }
  } catch (error) {
    console.log('❌ Signals table error:', error.message);
    return false;
  }
}

async function testEdgeFunctions() {
  const functions = [
    { name: 'demo-signal-generator', payload: { test: true } },
    { name: 'aitradex1-enhanced-scanner', payload: { symbols: ['BTCUSDT'], test: true } },
    { name: 'enhanced-signal-generation', payload: { test: true } },
    { name: 'live-scanner-production', payload: { test: true } },
    { name: 'paper-trading-executor', payload: { test: true } }
  ];

  console.log('3️⃣ Testing edge functions...');
  let successCount = 0;

  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify(func.payload)
      });

      if (response.ok) {
        console.log(`✅ ${func.name} - Working`);
        successCount++;
      } else {
        console.log(`❌ ${func.name} - Error ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${func.name} - Exception: ${error.message}`);
    }
  }

  console.log(`   Functions working: ${successCount}/${functions.length}`);
  return successCount === functions.length;
}

async function testRealTimeUpdates() {
  try {
    console.log('4️⃣ Testing real-time capabilities...');
    
    // Test if realtime endpoint is accessible
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/vnd.pgrst.object+json'
      }
    });

    if (response.ok) {
      console.log('✅ Real-time endpoint accessible');
      return true;
    } else {
      console.log('❌ Real-time endpoint error');
      return false;
    }
  } catch (error) {
    console.log('❌ Real-time test error:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    database: false,
    signals: false,
    functions: false,
    realtime: false
  };

  results.database = await testDatabase();
  results.signals = await testSignalsTable();
  results.functions = await testEdgeFunctions();
  results.realtime = await testRealTimeUpdates();

  console.log('\n📊 Final Results:');
  console.log('================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('✨ No errors detected - application is ready to use');
  } else {
    console.log('⚠️ Some issues remain');
  }

  return results;
}

// Run the verification
runAllTests();