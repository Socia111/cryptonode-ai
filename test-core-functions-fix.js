#!/usr/bin/env node

// Test Core Functions After Fix
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function testFunction(name, body = {}) {
  try {
    console.log(`🔍 Testing ${name}...`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${name} - SUCCESS`);
      if (result.signals_generated) console.log(`   📊 Signals: ${result.signals_generated}`);
      if (result.signals) console.log(`   📈 Count: ${result.signals}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${name} - FAILED (${response.status})`);
      console.log(`   Error: ${error.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${name} - EXCEPTION: ${error.message}`);
    return false;
  }
}

async function testDatabase() {
  try {
    console.log("🗄️ Testing database access...");
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    
    if (response.ok) {
      console.log("✅ Database - Accessible");
      return true;
    } else {
      console.log(`❌ Database - Failed (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Database - Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🧪 Core Functions Test Suite");
  console.log("=============================\n");
  
  const results = [];
  
  // Test database first
  results.push({ name: 'Database Access', success: await testDatabase() });
  
  console.log(""); // spacer
  
  // Test core functions
  const coreFunctions = [
    { name: 'demo-signal-generator', body: { trigger: 'test' } },
    { name: 'signals-api', body: { test: true } },
    { name: 'live-signal-orchestrator', body: { initialize: true } },
    { name: 'calculate-spynx-scores', body: { trigger: 'test' } },
    { name: 'aitradex1-enhanced-scanner', body: { symbols: ['BTCUSDT', 'ETHUSDT'] } },
    { name: 'enhanced-signal-generation', body: { enhanced_mode: true } }
  ];
  
  for (const func of coreFunctions) {
    const success = await testFunction(func.name, func.body);
    results.push({ name: func.name, success });
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS");
  console.log("=".repeat(50));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ WORKING (${working.length}):`);
  working.forEach(r => console.log(`   ${r.name}`));
  
  console.log(`\n❌ FAILED (${failed.length}):`);
  failed.forEach(r => console.log(`   ${r.name}`));
  
  console.log(`\n📈 SUCCESS RATE: ${(working.length/results.length*100).toFixed(1)}%`);
  
  if (failed.length === 0) {
    console.log("\n🎉 ALL CORE FUNCTIONS WORKING!");
  } else {
    console.log(`\n⚠️  ${failed.length} functions need attention`);
  }
}

main().catch(console.error);