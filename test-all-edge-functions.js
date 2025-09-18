#!/usr/bin/env node

// Comprehensive Edge Function Test
// Tests all functions shown in the screenshots to identify failures

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

// List of all functions from the screenshots
const ALL_FUNCTIONS = [
  'aira-rankings-sync',
  'aitradex1-config', 
  'automated-crypto-scanner',
  'coinapi-proxy',
  'crypto-scheduler',
  'free-crypto-api-integration',
  'live-crypto-feed',
  'realtime-crypto-scanner',
  'scanner-engine',
  'trade-execution',
  'aitradex1-trade-executor',
  'live-scanner-production',
  'bybit-authenticate',
  'enhanced-signal-generation',
  'diagnostics',
  'jwt-token-generator',
  'live-exchange-feed',
  'live-feed-trigger',
  'quantum-analysis',
  'symbol-validator',
  'ccxt-live-feed',
  'bybit-live-trading',
  'calculate-spynx-scores',
  'tradingview-webhook',
  'log-security-event',
  'webhook-alerts',
  'direct-bybit-test',
  'direct-3commas-test',
  'connect-bybit',
  'roll-trade',
  'ai-signals-refresh',
  'trade-connection-test',
  'trade-execute',
  'coin-prioritizer',
  'backtest-tethered',
  'generate-signals',
  'sentiment-analysis',
  'signal-ingestion',
  'signals-live-feed',
  'trade-diag',
  'bybit-live-signals',
  'crypto-live-signals',
  'signals-api',
  'stripe-webhook',
  'bybit-order-execution',
  'debug-bybit-api',
  'aitradex1-original-scanner',
  'aitradex1-enhanced-scanner',
  'aitradex1-confluence-scanner',
  'aitradex1-advanced-scanner',
  'bybit-comprehensive-scanner',
  'trigger-comprehensive-scan',
  'automated-trading-engine',
  'manual-trade-execution',
  'debug-trading-status',
  'bybit-broker',
  'bybit-automated-trading',
  'spynx-scores-engine',
  'signal-automation-trigger',
  'system-test-automation',
  'comprehensive-trading-pipeline',
  // Recently restored
  'demo-signal-generator',
  'live-signal-orchestrator'
];

async function testFunction(functionName) {
  try {
    console.log(`🔍 Testing ${functionName}...`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${functionName} - Working (${response.status})`);
      return { name: functionName, status: 'WORKING', code: response.status, result };
    } else {
      const errorText = await response.text();
      console.log(`❌ ${functionName} - Failed (${response.status}): ${errorText.substring(0, 100)}`);
      return { name: functionName, status: 'FAILED', code: response.status, error: errorText };
    }
  } catch (error) {
    console.log(`💥 ${functionName} - Exception: ${error.message}`);
    return { name: functionName, status: 'EXCEPTION', error: error.message };
  }
}

async function main() {
  console.log("🧪 Starting Comprehensive Edge Function Test");
  console.log(`📋 Testing ${ALL_FUNCTIONS.length} functions total\n`);
  
  const results = [];
  const BATCH_SIZE = 5;
  
  // Test in batches to avoid overwhelming the system
  for (let i = 0; i < ALL_FUNCTIONS.length; i += BATCH_SIZE) {
    const batch = ALL_FUNCTIONS.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i/BATCH_SIZE) + 1}: Testing ${batch.join(', ')}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(func => testFunction(func))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          name: batch[index],
          status: 'PROMISE_FAILED',
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 COMPREHENSIVE TEST RESULTS");
  console.log("=".repeat(80));
  
  const working = results.filter(r => r.status === 'WORKING');
  const failed = results.filter(r => r.status === 'FAILED');
  const exceptions = results.filter(r => r.status === 'EXCEPTION' || r.status === 'PROMISE_FAILED');
  
  console.log(`\n✅ WORKING FUNCTIONS (${working.length}):`);
  working.forEach(r => console.log(`   ${r.name} (${r.code})`));
  
  console.log(`\n❌ FAILED FUNCTIONS (${failed.length}):`);
  failed.forEach(r => console.log(`   ${r.name} (${r.code}) - ${r.error?.substring(0, 80)}`));
  
  console.log(`\n💥 EXCEPTION FUNCTIONS (${exceptions.length}):`);
  exceptions.forEach(r => console.log(`   ${r.name} - ${r.error?.substring(0, 80)}`));
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Functions: ${results.length}`);
  console.log(`   Working: ${working.length} (${(working.length/results.length*100).toFixed(1)}%)`);
  console.log(`   Failed: ${failed.length} (${(failed.length/results.length*100).toFixed(1)}%)`);
  console.log(`   Exceptions: ${exceptions.length} (${(exceptions.length/results.length*100).toFixed(1)}%)`);
  
  // Priority functions that must work
  const PRIORITY_FUNCTIONS = [
    'demo-signal-generator',
    'signals-api', 
    'live-signal-orchestrator',
    'aitradex1-enhanced-scanner',
    'enhanced-signal-generation',
    'live-scanner-production',
    'bybit-authenticate'
  ];
  
  console.log(`\n🎯 PRIORITY FUNCTION STATUS:`);
  PRIORITY_FUNCTIONS.forEach(funcName => {
    const result = results.find(r => r.name === funcName);
    if (result) {
      const status = result.status === 'WORKING' ? '✅' : '❌';
      console.log(`   ${status} ${funcName} - ${result.status}`);
    } else {
      console.log(`   ❓ ${funcName} - NOT TESTED`);
    }
  });
  
  return results;
}

main().catch(console.error);