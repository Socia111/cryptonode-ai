// Test the completely fixed system
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testCompletelyFixedSystem() {
  console.log("🔧 Testing completely fixed system...");
  let testsRun = 0;
  let testsPassed = 0;

  async function runTest(name, testFn) {
    testsRun++;
    try {
      console.log(`\n${testsRun}️⃣ ${name}`);
      const result = await testFn();
      if (result) {
        testsPassed++;
        console.log(`✅ PASS: ${name}`);
      } else {
        console.log(`❌ FAIL: ${name}`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${name} - ${error.message}`);
    }
  }

  // Test 1: Database access
  await runTest("Database signals access", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=count&score=gte.70`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    return response.ok;
  });

  // Test 2: Demo signal generator
  await runTest("Demo signal generator function", async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/demo-signal-generator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'test' })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   📊 Generated ${result.signals_generated} signals`);
      return result.success;
    }
    return false;
  });

  // Test 3: Live signal orchestrator
  await runTest("Live signal orchestrator function", async () => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/live-signal-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'test' })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   🚀 Generated ${result.live_signals_generated} live signals`);
      return result.success;
    }
    return false;
  });

  // Test 4: Check if signals are being created
  await runTest("Recent signals created", async () => {
    // Wait a moment for signals to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.70&created_at=gte.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}&limit=10`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    if (response.ok) {
      const signals = await response.json();
      console.log(`   📈 Found ${signals.length} recent signals`);
      if (signals.length > 0) {
        console.log(`   💡 Sample: ${signals[0].symbol} ${signals[0].direction} Score:${signals[0].score}`);
      }
      return signals.length > 0;
    }
    return false;
  });

  // Test 5: Frontend signal fetching
  await runTest("Frontend signal fetching", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.75&created_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&order=created_at.desc&limit=50`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'accept-profile': 'public'
      }
    });

    if (response.ok) {
      const signals = await response.json();
      console.log(`   🎯 Frontend would show ${signals.length} signals`);
      return true;
    }
    return false;
  });

  // Summary
  console.log(`\n📊 TEST SUMMARY`);
  console.log(`Tests Run: ${testsRun}`);
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Success Rate: ${((testsPassed/testsRun)*100).toFixed(1)}%`);
  
  if (testsPassed === testsRun) {
    console.log("\n🎉 ALL TESTS PASSED! System is working correctly.");
    console.log("✅ Database permissions fixed");
    console.log("✅ Functions created and working");
    console.log("✅ Live signals being generated");
    console.log("✅ Frontend should now display signals");
  } else {
    console.log(`\n⚠️  ${testsRun - testsPassed} tests failed. Check logs above.`);
  }
}

testCompletelyFixedSystem();