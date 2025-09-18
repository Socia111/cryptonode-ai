// Test all functions after direction constraint fixes
const testAllFunctionsAfterFix = async () => {
  const functions = [
    'demo-signal-generator',
    'enhanced-signal-generation',
    'aitradex1-enhanced-scanner',
    'live-signal-orchestrator'
  ];

  console.log('🔍 Testing functions after direction constraint fixes...\n');

  for (const func of functions) {
    try {
      console.log(`Testing ${func}...`);
      
      const response = await fetch(`https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ trigger: 'test_constraint_fix' })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${func} - SUCCESS`);
        if (data.signals_generated) {
          console.log(`   Generated ${data.signals_generated} signals`);
        }
      } else {
        console.log(`⚠️ ${func} - ERROR ${response.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${func} - EXCEPTION: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n🏁 Function testing complete!');
};

testAllFunctionsAfterFix();