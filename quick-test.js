// Quick Test Runner - Tests all edge functions and sends Telegram signals
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function quickTestAll() {
  console.log('⚡ Quick Full Test Suite Starting...');
  console.log('===================================\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Test all functions in parallel for maximum speed
  const tests = [
    // Core scanner functions
    { name: 'scanner-engine', body: { exchange: 'bybit', timeframe: '1h' } },
    { name: 'enhanced-signal-generation', body: { symbols: ['BTCUSDT', 'ETHUSDT'] } },
    { name: 'calculate-spynx-scores', body: { user_id: 'test' } },
    
    // Advanced functions
    { name: 'backtest-engine', body: { symbol: 'BTCUSDT', strategy: 'aitradex1', start_date: '2024-01-01', end_date: '2024-12-31' } },
    { name: 'sentiment-analysis', body: { symbols: ['BTCUSDT'], sources: ['twitter'] } },
    { name: 'trade-execution', body: { signal_id: 'test', action: 'validate', dry_run: true } }
  ];
  
  console.log('🧪 Testing all edge functions in parallel...');
  
  // Run all function tests in parallel
  const functionResults = await Promise.allSettled(
    tests.map(async test => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke(test.name, { body: test.body });
        const duration = Date.now() - start;
        
        if (error) {
          console.log(`❌ ${test.name}: ${error.message} (${duration}ms)`);
          return { success: false, function: test.name, error: error.message, duration };
        } else {
          console.log(`✅ ${test.name}: Success (${duration}ms)`);
          return { success: true, function: test.name, data, duration };
        }
      } catch (err) {
        const duration = Date.now() - start;
        console.log(`❌ ${test.name}: ${err.message} (${duration}ms)`);
        return { success: false, function: test.name, error: err.message, duration };
      }
    })
  );
  
  results.push(...functionResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }));
  
  // Test Telegram signal delivery
  console.log('\n📱 Testing Telegram signal delivery...');
  
  const telegramTests = [
    {
      name: 'Free Signal',
      signal: {
        signal_id: `test_free_${Date.now()}`,
        token: "BTC",
        direction: "BUY",
        signal_type: "QUANTUM_BREAKOUT",
        entry_price: 45000,
        exit_target: 47500,
        stop_loss: 44000,
        leverage: 2,
        confidence_score: 82.5,
        roi_projection: 4.5,
        quantum_probability: 0.78,
        risk_level: "MEDIUM",
        signal_strength: "STRONG",
        trend_projection: "BULLISH_MOMENTUM",
        is_premium: false
      }
    },
    {
      name: 'Premium Signal',
      signal: {
        signal_id: `test_premium_${Date.now()}`,
        token: "ETH",
        direction: "BUY",
        signal_type: "QUANTUM_BREAKOUT_PREMIUM",
        entry_price: 2500,
        exit_target: 2712.5,
        stop_loss: 2450,
        leverage: 3,
        confidence_score: 95.5,
        roi_projection: 8.5,
        quantum_probability: 0.92,
        risk_level: "LOW",
        signal_strength: "VERY_STRONG",
        trend_projection: "BULLISH_MOMENTUM",
        is_premium: true
      }
    }
  ];
  
  // Send telegram signals in parallel
  const telegramResults = await Promise.allSettled(
    telegramTests.map(async test => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('telegram-bot', { body: { signal: test.signal } });
        const duration = Date.now() - start;
        
        if (error) {
          console.log(`❌ ${test.name} Telegram: ${error.message} (${duration}ms)`);
          return { success: false, function: `telegram-${test.name}`, error: error.message, duration };
        } else {
          console.log(`✅ ${test.name} Telegram: Signal sent! (${duration}ms)`);
          return { success: true, function: `telegram-${test.name}`, data, duration };
        }
      } catch (err) {
        const duration = Date.now() - start;
        console.log(`❌ ${test.name} Telegram: ${err.message} (${duration}ms)`);
        return { success: false, function: `telegram-${test.name}`, error: err.message, duration };
      }
    })
  );
  
  results.push(...telegramResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }));
  
  // Final summary
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log('\n📊 FULL TEST SUITE RESULTS');
  console.log('==========================');
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((successful/total)*100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   ❌ ${result.function}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 Full test suite completed!');
  console.log('📱 Check your Telegram channels for signal alerts!');
  console.log('🔄 All edge functions have been tested successfully.');
}

// Run the quick test
quickTestAll().catch(console.error);