// Comprehensive API Test Script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function runComprehensiveAPITest() {
  console.log('🔍 Starting Comprehensive API Test...\n');
  
  const tests = [];
  
  // 1. Test Supabase Connection
  console.log('1️⃣ Testing Supabase Database Connection...');
  try {
    const { data, error } = await supabase.from('signals').select('count').limit(1);
    if (error) {
      tests.push({ name: 'Supabase DB', status: 'FAILED', error: error.message });
    } else {
      tests.push({ name: 'Supabase DB', status: 'PASSED', result: 'Connected' });
    }
  } catch (e) {
    tests.push({ name: 'Supabase DB', status: 'ERROR', error: e.message });
  }

  // 2. Test API Keys Table
  console.log('2️⃣ Testing API Keys Table...');
  try {
    const { data, error } = await supabase.from('api_keys').select('*').limit(1);
    if (error) {
      tests.push({ name: 'API Keys Table', status: 'FAILED', error: error.message });
    } else {
      tests.push({ name: 'API Keys Table', status: 'PASSED', result: `Found ${data?.length || 0} keys` });
    }
  } catch (e) {
    tests.push({ name: 'API Keys Table', status: 'ERROR', error: e.message });
  }

  // 3. Test Bybit API Diagnostics Function
  console.log('3️⃣ Testing Bybit API Diagnostics...');
  try {
    const { data, error } = await supabase.functions.invoke('api-diagnostics');
    if (error) {
      tests.push({ name: 'API Diagnostics', status: 'FAILED', error: error.message });
    } else {
      tests.push({ name: 'API Diagnostics', status: 'PASSED', result: data });
    }
  } catch (e) {
    tests.push({ name: 'API Diagnostics', status: 'ERROR', error: e.message });
  }

  // 4. Test Live Scanner Production
  console.log('4️⃣ Testing Live Scanner Production...');
  try {
    const { data, error } = await supabase.functions.invoke('live-scanner-production', {
      body: { exchange: 'bybit', timeframe: '1h', symbols: ['BTCUSDT'] }
    });
    if (error) {
      tests.push({ name: 'Live Scanner', status: 'FAILED', error: error.message });
    } else {
      tests.push({ name: 'Live Scanner', status: 'PASSED', result: data });
    }
  } catch (e) {
    tests.push({ name: 'Live Scanner', status: 'ERROR', error: e.message });
  }

  // 5. Test Bybit Order Execution
  console.log('5️⃣ Testing Bybit Order Execution...');
  try {
    const { data, error } = await supabase.functions.invoke('bybit-order-execution', {
      body: { 
        symbol: 'BTCUSDT',
        side: 'Buy',
        orderType: 'Market',
        qty: '0.001',
        testMode: true
      }
    });
    if (error) {
      tests.push({ name: 'Order Execution', status: 'FAILED', error: error.message });
    } else {
      tests.push({ name: 'Order Execution', status: 'PASSED', result: data });
    }
  } catch (e) {
    tests.push({ name: 'Order Execution', status: 'ERROR', error: e.message });
  }

  // Display Results
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  tests.forEach((test, i) => {
    const emoji = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${emoji} ${test.name}: ${test.status}`);
    
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
    
    if (test.result && typeof test.result === 'object') {
      console.log(`   Result: ${JSON.stringify(test.result, null, 2)}`);
    } else if (test.result) {
      console.log(`   Result: ${test.result}`);
    }
    console.log('');
  });

  // Generate Solutions
  console.log('🔧 SOLUTIONS FOR COMMON ISSUES');
  console.log('===============================');
  
  const failedTests = tests.filter(t => t.status === 'FAILED' || t.status === 'ERROR');
  
  if (failedTests.length === 0) {
    console.log('✅ All tests passed! Your API connections are working properly.');
  } else {
    failedTests.forEach(test => {
      console.log(`\n❌ ${test.name} Issue:`);
      
      if (test.name === 'API Keys Table' && test.error?.includes('permission')) {
        console.log('   Solution: You need to add BYBIT_API_KEY and BYBIT_API_SECRET in Supabase secrets');
        console.log('   1. Go to Supabase Dashboard > Settings > Edge Functions');
        console.log('   2. Add BYBIT_API_KEY secret');
        console.log('   3. Add BYBIT_API_SECRET secret');
      }
      
      if (test.name === 'API Diagnostics' && test.error?.includes('function')) {
        console.log('   Solution: api-diagnostics function may not be deployed');
        console.log('   1. Check if the function exists in Supabase Dashboard > Edge Functions');
        console.log('   2. Redeploy if necessary');
      }
      
      if (test.name === 'Order Execution' && test.error?.includes('10004')) {
        console.log('   Solution: Bybit API signature error');
        console.log('   1. Verify API keys are correct');
        console.log('   2. Check system time synchronization');
        console.log('   3. Ensure API keys have trading permissions');
      }
      
      if (test.name === 'Order Execution' && test.error?.includes('10005')) {
        console.log('   Solution: Bybit permissions missing');
        console.log('   1. Log into Bybit API management');
        console.log('   2. Enable "Trade" permission for your API key');
        console.log('   3. Enable "Spot & Margin Trading" if needed');
      }
      
      console.log(`   Error Details: ${test.error}`);
    });
  }
  
  console.log('\n🔗 Useful Links:');
  console.log('- Supabase Dashboard: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn');
  console.log('- Edge Functions: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/functions');
  console.log('- Function Secrets: https://supabase.com/dashboard/project/codhlwjogfjywmjyjbbn/settings/functions');
  console.log('- Bybit API Management: https://www.bybit.com/app/user/api-management');
}

// Run the test
runComprehensiveAPITest().catch(console.error);