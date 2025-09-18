#!/usr/bin/env node

// Final AITRADEX1 system verification
const BASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

console.log('🎯 AITRADEX1 FINAL SYSTEM VERIFICATION');
console.log('=====================================\n');

async function checkSystemHealth() {
  const results = {
    database: false,
    signals: false,
    functions: false,
    realtime: false
  };

  // 1. Database connectivity
  try {
    console.log('📊 Testing database...');
    const response = await fetch(`${BASE_URL}/rest/v1/signals?select=count&limit=1`, {
      headers: { 'apikey': ANON_KEY }
    });
    
    if (response.ok) {
      console.log('✅ Database: Connected');
      results.database = true;
    } else {
      console.log('❌ Database: Failed');
    }
  } catch (error) {
    console.log('❌ Database: Error -', error.message);
  }

  // 2. Recent signals check
  try {
    console.log('📡 Checking signals...');
    const response = await fetch(`${BASE_URL}/rest/v1/signals?select=symbol,direction,score,created_at&order=created_at.desc&limit=10`, {
      headers: { 'apikey': ANON_KEY }
    });
    
    if (response.ok) {
      const signals = await response.json();
      console.log(`✅ Signals: ${signals.length} recent signals found`);
      
      if (signals.length > 0) {
        console.log('   Latest signals:');
        signals.slice(0, 3).forEach(s => {
          console.log(`   - ${s.symbol} ${s.direction} (Score: ${s.score})`);
        });
      }
      results.signals = true;
    } else {
      console.log('❌ Signals: Failed to retrieve');
    }
  } catch (error) {
    console.log('❌ Signals: Error -', error.message);
  }

  // 3. Edge functions test
  try {
    console.log('⚡ Testing functions...');
    const response = await fetch(`${BASE_URL}/functions/v1/demo-signal-generator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Functions: Demo generator working');
      results.functions = true;
    } else {
      console.log('❌ Functions: Demo generator failed');
    }
  } catch (error) {
    console.log('❌ Functions: Error -', error.message);
  }

  // 4. Overall system health
  console.log('\n📋 SYSTEM SUMMARY');
  console.log('=================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`Database Connection: ${results.database ? '✅' : '❌'}`);
  console.log(`Signal System: ${results.signals ? '✅' : '❌'}`);
  console.log(`Edge Functions: ${results.functions ? '✅' : '❌'}`);
  
  console.log(`\n🎯 System Health: ${passed}/${total} components operational`);
  
  if (passed === total) {
    console.log('🎉 ALL SYSTEMS FULLY OPERATIONAL!');
    console.log('\n✨ AITRADEX1 is ready for trading!');
  } else if (passed >= 3) {
    console.log('⚠️  System mostly operational - minor issues detected');
  } else {
    console.log('❌ System needs attention - critical issues detected');
  }
  
  return results;
}

// Execute verification
checkSystemHealth().catch(console.error);