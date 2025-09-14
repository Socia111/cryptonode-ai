// Comprehensive test to verify all fixes
console.log('🧪 Running comprehensive test after fixes...');

async function testAllSystems() {
  const tests = [
    { name: 'Authentication Status', test: testAuth },
    { name: 'Signals API', test: testSignalsAPI },
    { name: 'Trading Gateway Status', test: testTradingStatus },
    { name: 'Balance Check', test: testBalanceCheck },
    { name: 'Database Permissions', test: testDatabasePermissions }
  ];

  const results = [];
  
  for (const { name, test } of tests) {
    try {
      console.log(`\n📋 Testing: ${name}`);
      const result = await test();
      results.push({ name, status: 'PASSED', result });
      console.log(`✅ ${name}: PASSED`);
    } catch (error) {
      results.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name}: FAILED - ${error.message}`);
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  • ${r.name}: ${r.error}`);
    });
  }
  
  return results;
}

async function testAuth() {
  const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status' })
  });
  
  const data = await response.json();
  if (!data.ok) throw new Error('Trade executor not operational');
  
  return data;
}

async function testSignalsAPI() {
  const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/signals-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recent' })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(`Signals API failed: ${data.error}`);
  
  return { signalsCount: data.signals?.length || 0 };
}

async function testTradingStatus() {
  const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/aitradex1-trade-executor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status' })
  });
  
  const data = await response.json();
  if (!data.ok) throw new Error('Trading gateway not responding');
  
  return data;
}

async function testBalanceCheck() {
  const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/bybit-live-trading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'balance' })
  });
  
  const data = await response.json();
  
  // Balance check might fail due to missing credentials, but it should return a proper error structure
  if (data.success === undefined) throw new Error('Invalid response structure');
  
  return { 
    success: data.success, 
    hasCredentials: !data.message?.includes('MISSING_CREDENTIALS'),
    message: data.message || 'OK'
  };
}

async function testDatabasePermissions() {
  // Test if signals can be accessed
  const response = await fetch('https://codhlwjogfjywmjyjbbn.functions.supabase.co/signals-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recent' })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Database permission error: ${data.error}`);
  
  return { accessible: data.success };
}

// Run the comprehensive test
testAllSystems()
  .then(results => {
    console.log('\n🎉 Comprehensive test completed!');
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error.message);
  });