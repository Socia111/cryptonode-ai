#!/usr/bin/env node

console.log('🚨 Testing Emergency Fixes...\n');

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

async function testFunction(name, url, expectAuth = false) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (expectAuth) {
      headers['Authorization'] = `Bearer ${ANON_KEY}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`);
      console.log(`   Status: ${response.status}`);
      if (data.signals_created !== undefined) {
        console.log(`   Signals: ${data.signals_created}`);
      }
    } else {
      console.log(`❌ ${name}: FAILED`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.message || data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: NETWORK ERROR`);
    console.log(`   ${error.message}`);
  }
  console.log('');
}

async function testDatabaseAccess() {
  try {
    console.log('📊 Testing Database Access...');
    
    // Test signals table access
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=id,symbol,score&limit=5`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const signals = await response.json();
      console.log(`✅ Signals table: ${signals.length} signals accessible`);
    } else {
      console.log(`❌ Signals table: ${response.status} ${response.statusText}`);
    }
    
    // Test live_prices table access
    const pricesResponse = await fetch(`${SUPABASE_URL}/rest/v1/live_prices?select=symbol,price&limit=3`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (pricesResponse.ok) {
      const prices = await pricesResponse.json();
      console.log(`✅ Live prices table: ${prices.length} prices accessible`);
    } else {
      console.log(`❌ Live prices table: ${pricesResponse.status} ${pricesResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`❌ Database test failed: ${error.message}`);
  }
  console.log('');
}

async function main() {
  // Test database access first
  await testDatabaseAccess();
  
  // Test Edge Functions
  console.log('🧪 Testing Edge Functions...\n');
  
  await testFunction(
    'Enhanced Signal Generation',
    `${SUPABASE_URL}/functions/v1/enhanced-signal-generation`
  );
  
  await testFunction(
    'Real-time Scanner',
    `${SUPABASE_URL}/functions/v1/real-time-scanner`
  );
  
  await testFunction(
    'Live Signals Generator',
    `${SUPABASE_URL}/functions/v1/live-signals-generator`
  );
  
  await testFunction(
    'Database Setup',
    `${SUPABASE_URL}/functions/v1/database-setup`
  );
  
  console.log('🎯 Emergency Fixes Test Complete!');
  console.log('');
  console.log('Expected Results:');
  console.log('- All database access: ✅ SUCCESS');
  console.log('- All edge functions: ✅ SUCCESS (no more 401 errors)');
  console.log('- Signal generation: Creating 10+ signals');
}

main().catch(console.error);