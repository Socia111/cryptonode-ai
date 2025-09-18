// Final verification test
const finalVerificationTest = async () => {
  console.log('🎯 Running final system verification...\n');

  // Test all core functions
  const testResults = [];
  
  const coreTests = [
    {
      name: 'Demo Signal Generation',
      url: 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/demo-signal-generator',
      method: 'POST',
      body: { test: true }
    },
    {
      name: 'Live Signal Orchestrator', 
      url: 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-signal-orchestrator',
      method: 'POST',
      body: { test: true }
    },
    {
      name: 'Enhanced Scanner',
      url: 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-enhanced-scanner', 
      method: 'POST',
      body: { symbols: ['BTCUSDT'] }
    },
    {
      name: 'Paper Trading Executor',
      url: 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/paper-trading-executor',
      method: 'POST', 
      body: { symbol: 'BTCUSDT', side: 'BUY', quantity: 0.001 }
    }
  ];

  for (const test of coreTests) {
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
        },
        body: JSON.stringify(test.body)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ ${test.name} - WORKING`);
        testResults.push({ test: test.name, status: 'PASS', error: null });
      } else {
        console.log(`⚠️ ${test.name} - ISSUE: ${data.error || 'Unknown error'}`);
        testResults.push({ test: test.name, status: 'FAIL', error: data.error });
      }
    } catch (error) {
      console.log(`❌ ${test.name} - EXCEPTION: ${error.message}`);
      testResults.push({ test: test.name, status: 'ERROR', error: error.message });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const totalTests = testResults.length;
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL! No errors detected.');
  } else {
    console.log('⚠️ Some issues remain. Check the test results above.');
  }
  
  return { passedTests, totalTests, results: testResults };
};

finalVerificationTest();