// Final verification of all fixes
const testFunctions = async () => {
  const functions = [
    'demo-signal-generator',
    'aitradex1-enhanced-scanner',
    'enhanced-signal-generation',
    'live-scanner-production',
    'paper-trading-executor'
  ];

  console.log('🔍 Testing all functions after fixes...\n');

  const results = [];

  for (const func of functions) {
    try {
      console.log(`Testing ${func}...`);
      
      const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${func} - SUCCESS`);
        results.push({ function: func, status: 'SUCCESS', response: data });
      } else {
        console.log(`❌ ${func} - ERROR ${response.status}: ${data.error || 'Unknown error'}`);
        results.push({ function: func, status: 'ERROR', error: data });
      }
    } catch (error) {
      console.log(`❌ ${func} - EXCEPTION: ${error.message}`);
      results.push({ function: func, status: 'EXCEPTION', error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.status === 'SUCCESS').length;
  const total = results.length;
  console.log(`${successful}/${total} functions working correctly`);
  
  if (successful === total) {
    console.log('🎉 All functions are operational!');
  } else {
    console.log('⚠️ Some functions need attention.');
  }

  return results;
};

testFunctions();