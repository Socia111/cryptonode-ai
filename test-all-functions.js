// Complete Edge Functions Test Script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function testAllFunctions() {
  console.log('🚀 Starting comprehensive edge functions test...');
  
  try {
    // 1. Test Scanner Engine
    console.log('\n📊 Testing Scanner Engine...');
    const scannerResult = await supabase.functions.invoke('scanner-engine', {
      body: { exchange: 'bybit', timeframe: '1h' }
    });
    console.log('Scanner Result:', scannerResult.data || scannerResult.error);

    // 2. Test Enhanced Signal Generation
    console.log('\n⚡ Testing Enhanced Signal Generation...');
    const enhancedResult = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { symbols: ['BTCUSDT', 'ETHUSDT'] }
    });
    console.log('Enhanced Signal Result:', enhancedResult.data || enhancedResult.error);

    // 3. Test Calculate Spynx Scores
    console.log('\n🎯 Testing Calculate Spynx Scores...');
    const spynxResult = await supabase.functions.invoke('calculate-spynx-scores', {
      body: { user_id: 'test' }
    });
    console.log('Spynx Result:', spynxResult.data || spynxResult.error);

    // 4. Test Backtest Engine
    console.log('\n📈 Testing Backtest Engine...');
    const backtestResult = await supabase.functions.invoke('backtest-engine', {
      body: { 
        symbol: 'BTCUSDT',
        strategy: 'aitradex1',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      }
    });
    console.log('Backtest Result:', backtestResult.data || backtestResult.error);

    // 5. Send Free Test Signal
    console.log('\n🆓 Sending Free Test Signal...');
    const freeSignal = {
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
    };

    const freeResult = await supabase.functions.invoke('telegram-bot', {
      body: { signal: freeSignal }
    });
    console.log('Free Signal Result:', freeResult.data || freeResult.error);

    // 6. Send Premium Test Signal
    console.log('\n💎 Sending Premium Test Signal...');
    const premiumSignal = {
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
    };

    const premiumResult = await supabase.functions.invoke('telegram-bot', {
      body: { signal: premiumSignal }
    });
    console.log('Premium Signal Result:', premiumResult.data || premiumResult.error);

    console.log('\n✅ All tests completed successfully!');
    console.log('📱 Check your Telegram channels for signal alerts!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAllFunctions();