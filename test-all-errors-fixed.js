// Test all edge functions to verify errors are fixed
const testAllFunctions = async () => {
  const functions = [
    'demo-signal-generator',
    'signals-api',
    'live-signal-orchestrator', 
    'calculate-spynx-scores',
    'aitradex1-enhanced-scanner',
    'enhanced-signal-generation',
    'challenge-expiry-reminder',
    'daily-challenge-reminder'
  ];

  console.log('🔍 Testing all functions for errors...\n');

  for (const func of functions) {
    try {
      console.log(`Testing ${func}...`);
      
      const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ trigger: 'test' })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${func} - SUCCESS`);
      } else if (response.status === 404) {
        console.log(`❌ ${func} - NOT FOUND (404)`);
      } else {
        console.log(`⚠️ ${func} - ERROR ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${func} - EXCEPTION: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🏁 Function testing complete!');
};

testAllFunctions();