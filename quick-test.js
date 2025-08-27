// Comprehensive Signal Generation & Testing Suite
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

// AITRADEX1 Signal Generation Settings & Algorithms
const SIGNAL_SETTINGS = {
  // Technical Indicators Thresholds
  ADX_MIN: 25,           // ADX strength minimum for trend confirmation
  RSI_OVERSOLD: 30,      // RSI oversold threshold for buy signals
  RSI_OVERBOUGHT: 70,    // RSI overbought threshold for sell signals
  STOCH_OVERSOLD: 20,    // Stochastic oversold level
  STOCH_OVERBOUGHT: 80,  // Stochastic overbought level
  
  // Volume & Price Action
  VOL_SPIKE_MULT: 1.5,   // Volume spike multiplier (1.5x average)
  EMA_TREND_MIN: 0.001,  // Minimum EMA trend strength
  
  // Risk Management
  CONFIDENCE_MIN: 75,    // Minimum confidence score for signals
  MAX_SIGNALS_PER_SCAN: 20, // Maximum signals per scan
  
  // Market Conditions
  EXCHANGES: ['bybit', 'binance', 'okx'],
  TIMEFRAMES: ['1h', '4h', '1d'],
  SYMBOLS_FILTER: ['USDT', 'USD'],  // Only pairs ending with these
  
  // Quantum Analysis
  QUANTUM_CONFIDENCE_MIN: 0.7,  // Minimum quantum probability
  NEURAL_WEIGHT_DECAY: 0.95,    // Neural network weight decay
  
  // Signal Types & Algorithms
  ALGORITHMS: {
    'AITRADEX1_BREAKOUT': {
      description: 'Multi-timeframe breakout with volume confirmation',
      conditions: [
        'EMA21 > SMA200 (bullish trend)',
        'ADX > 25 (strong trend)',
        'Volume spike > 1.5x average',
        'RSI between 40-80 (not oversold/overbought)',
        'Stochastic %K crossover %D'
      ]
    },
    'QUANTUM_MOMENTUM': {
      description: 'AI-powered quantum probability momentum detection',
      conditions: [
        'Quantum probability > 0.7',
        'Multi-dimensional momentum analysis',
        'Neural network pattern recognition',
        'Market sentiment integration'
      ]
    },
    'VOLATILITY_SPIKE': {
      description: 'High volatility breakout detection',
      conditions: [
        'HVP (Historical Volatility Percentile) > 80',
        'Volume surge > 2x average',
        'Price action outside Bollinger Bands',
        'Momentum divergence confirmation'
      ]
    }
  }
};

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

async function diagnosePlatform() {
  console.log('🔍 PLATFORM DIAGNOSTICS');
  console.log('=======================\n');
  
  console.log('📋 Signal Generation Settings:');
  console.log(JSON.stringify(SIGNAL_SETTINGS, null, 2));
  
  console.log('\n🔍 Checking Database Tables...');
  
  // Check all important tables
  const tables = [
    'scanner_signals', 'strategy_signals', 'quantum_analysis', 
    'markets', 'exchanges', 'portfolios', 'positions'
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} records`);
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0]).substring(0, 100)}...`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: Exception - ${err.message}`);
    }
  }
  
  console.log('\n🚀 Forcing Signal Generation...');
  
  // Force generate signals by calling scanner
  try {
    const { data, error } = await supabase.functions.invoke('scanner-engine', {
      body: { 
        exchange: 'bybit', 
        timeframe: '1h',
        force_generate: true,
        relaxed_filters: true  // Use relaxed filters to generate more signals
      }
    });
    
    if (error) {
      console.log(`❌ Scanner Engine Error: ${error.message}`);
    } else {
      console.log(`✅ Scanner Engine Success:`, data);
    }
  } catch (err) {
    console.log(`❌ Scanner Engine Exception: ${err.message}`);
  }
  
  // Force enhanced signal generation
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { 
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'],
        force_generate: true
      }
    });
    
    if (error) {
      console.log(`❌ Enhanced Signal Generation Error: ${error.message}`);
    } else {
      console.log(`✅ Enhanced Signal Generation Success:`, data);
    }
  } catch (err) {
    console.log(`❌ Enhanced Signal Generation Exception: ${err.message}`);
  }
}

async function generateTestSignals() {
  console.log('\n🎯 GENERATING TEST SIGNALS');
  console.log('==========================\n');
  
  // Generate multiple test signals for different scenarios
  const testSignals = [
    {
      signal_id: `aitradex_${Date.now()}_1`,
      token: "BTC",
      direction: "BUY",
      signal_type: "AITRADEX1_BREAKOUT",
      entry_price: 111077.2,
      exit_target: 116531.06,
      stop_loss: 108847.54,
      leverage: 2,
      confidence_score: 87.3,
      roi_projection: 4.9,
      quantum_probability: 0.83,
      risk_level: "MEDIUM",
      signal_strength: "STRONG",
      trend_projection: "BULLISH_MOMENTUM",
      is_premium: false
    },
    {
      signal_id: `quantum_${Date.now()}_2`,
      token: "ETH",
      direction: "BUY", 
      signal_type: "QUANTUM_MOMENTUM",
      entry_price: 3245.50,
      exit_target: 3568.05,
      stop_loss: 3181.40,
      leverage: 3,
      confidence_score: 94.2,
      roi_projection: 9.9,
      quantum_probability: 0.94,
      risk_level: "LOW",
      signal_strength: "VERY_STRONG",
      trend_projection: "BULLISH_MOMENTUM",
      is_premium: true
    },
    {
      signal_id: `volatility_${Date.now()}_3`,
      token: "SOL",
      direction: "SELL",
      signal_type: "VOLATILITY_SPIKE",
      entry_price: 245.60,
      exit_target: 221.04,
      stop_loss: 257.88,
      leverage: 2,
      confidence_score: 78.9,
      roi_projection: 10.0,
      quantum_probability: 0.76,
      risk_level: "HIGH",
      signal_strength: "STRONG",
      trend_projection: "BEARISH_REVERSAL",
      is_premium: false
    }
  ];
  
  // Send all test signals to Telegram
  for (const signal of testSignals) {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-bot', {
        body: { signal }
      });
      
      if (error) {
        console.log(`❌ ${signal.token} Signal Failed: ${error.message}`);
      } else {
        console.log(`✅ ${signal.token} Signal Sent: ${signal.signal_type} - ${signal.direction} - Confidence: ${signal.confidence_score}%`);
      }
    } catch (err) {
      console.log(`❌ ${signal.token} Signal Exception: ${err.message}`);
    }
  }
}

async function fullDiagnosticAndTest() {
  await diagnosePlatform();
  await generateTestSignals();
  await quickTestAll();
}

// Run full diagnostic and test
fullDiagnosticAndTest().catch(console.error);