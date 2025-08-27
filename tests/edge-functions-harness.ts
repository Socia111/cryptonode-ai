// Edge Functions Test Harness for Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TestResult {
  function: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

interface TelegramSignal {
  signal_id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  signal_type: string;
  entry_price: number;
  exit_target?: number;
  stop_loss?: number;
  leverage: number;
  confidence_score: number;
  roi_projection: number;
  quantum_probability: number;
  risk_level: string;
  signal_strength: string;
  trend_projection: string;
  is_premium?: boolean;
}

class EdgeFunctionTestHarness {
  private supabase: any;
  private results: TestResult[] = [];

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async testFunction(name: string, body: any = {}): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing ${name}...`);
      
      const { data, error } = await this.supabase.functions.invoke(name, { body });
      
      const duration = Date.now() - startTime;
      
      if (error) {
        const result: TestResult = {
          function: name,
          success: false,
          duration,
          error: error.message || 'Unknown error'
        };
        this.results.push(result);
        console.log(`❌ ${name} failed in ${duration}ms: ${error.message}`);
        return result;
      }
      
      const result: TestResult = {
        function: name,
        success: true,
        duration,
        data
      };
      this.results.push(result);
      console.log(`✅ ${name} succeeded in ${duration}ms`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        function: name,
        success: false,
        duration,
        error: error.message || 'Unknown error'
      };
      this.results.push(result);
      console.log(`❌ ${name} failed in ${duration}ms: ${error.message}`);
      return result;
    }
  }

  async testScannerEngine(): Promise<TestResult> {
    return await this.testFunction('scanner-engine', {
      exchange: 'bybit',
      timeframe: '1h'
    });
  }

  async testEnhancedSignalGeneration(): Promise<TestResult> {
    return await this.testFunction('enhanced-signal-generation', {
      symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']
    });
  }

  async testCalculateSpynxScores(): Promise<TestResult> {
    return await this.testFunction('calculate-spynx-scores', {
      user_id: 'test_user'
    });
  }

  async testBacktestEngine(): Promise<TestResult> {
    return await this.testFunction('backtest-engine', {
      symbol: 'BTCUSDT',
      strategy: 'aitradex1',
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    });
  }

  async testSentimentAnalysis(): Promise<TestResult> {
    return await this.testFunction('sentiment-analysis', {
      symbols: ['BTCUSDT'],
      sources: ['twitter', 'reddit']
    });
  }

  async testTradeExecution(): Promise<TestResult> {
    return await this.testFunction('trade-execution', {
      signal_id: 'test_signal',
      action: 'validate',
      dry_run: true
    });
  }

  async sendTestSignal(isPremium: boolean = false): Promise<TestResult> {
    const signal: TelegramSignal = {
      signal_id: `test_${isPremium ? 'premium' : 'free'}_${Date.now()}`,
      token: isPremium ? "ETH" : "BTC",
      direction: "BUY",
      signal_type: isPremium ? "QUANTUM_BREAKOUT_PREMIUM" : "AITRADEX1_BREAKOUT",
      entry_price: isPremium ? 2500 : 45000,
      exit_target: isPremium ? 2712.5 : 47500,
      stop_loss: isPremium ? 2450 : 44000,
      leverage: isPremium ? 3 : 2,
      confidence_score: isPremium ? 95.5 : 82.5,
      roi_projection: isPremium ? 8.5 : 4.5,
      quantum_probability: isPremium ? 0.92 : 0.78,
      risk_level: isPremium ? "LOW" : "MEDIUM",
      signal_strength: isPremium ? "VERY_STRONG" : "STRONG",
      trend_projection: "BULLISH_MOMENTUM",
      is_premium: isPremium
    };

    return await this.testFunction('telegram-bot', { signal });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive edge functions test harness...\n');
    
    const startTime = Date.now();

    // Run all tests in parallel batches for maximum efficiency
    console.log('📦 Batch 1: Core Trading Functions');
    const batch1 = await Promise.allSettled([
      this.testScannerEngine(),
      this.testEnhancedSignalGeneration(),
      this.testCalculateSpynxScores(),
    ]);

    console.log('\n📦 Batch 2: Analysis & Execution Functions');
    const batch2 = await Promise.allSettled([
      this.testBacktestEngine(),
      this.testSentimentAnalysis(),
      this.testTradeExecution(),
    ]);

    console.log('\n📦 Batch 3: Telegram Signal Delivery');
    const batch3 = await Promise.allSettled([
      this.sendTestSignal(false), // Free signal
      this.sendTestSignal(true),  // Premium signal
    ]);

    const totalDuration = Date.now() - startTime;
    this.printSummary(totalDuration);
  }

  async runCoreTests(): Promise<void> {
    console.log('⚡ Running core functions test suite...\n');
    
    // Test essential functions
    await this.testScannerEngine();
    await this.testEnhancedSignalGeneration();
    await this.sendTestSignal(false);
    await this.sendTestSignal(true);
    
    this.printSummary();
  }

  async runSignalTests(): Promise<void> {
    console.log('📡 Testing signal generation and Telegram delivery...\n');
    
    // Test signal pipeline
    const scannerResult = await this.testScannerEngine();
    
    if (scannerResult.success) {
      console.log('🎯 Scanner generated signals, testing Telegram delivery...');
      await this.sendTestSignal(false);
      await this.sendTestSignal(true);
    }
    
    this.printSummary();
  }

  private printSummary(totalDuration?: number): void {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (totalDuration) {
      console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    }
    
    console.log('\nDetailed Results:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.function.padEnd(25)} ${duration.padStart(8)}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.success && result.data) {
        if (result.function === 'scanner-engine' && result.data.signals_count) {
          console.log(`   Generated ${result.data.signals_count} signals`);
        }
        if (result.function === 'telegram-bot') {
          console.log(`   Signal sent to Telegram`);
        }
      }
    });
    
    console.log('\n📱 Check your Telegram channels for signal alerts!');
    
    // Reset results for next run
    this.results = [];
  }

  async stressTest(iterations: number = 5): Promise<void> {
    console.log(`🔥 Running stress test with ${iterations} iterations...\n`);
    
    const stressResults: { iteration: number; success: number; failed: number; duration: number }[] = [];
    
    for (let i = 1; i <= iterations; i++) {
      console.log(`\n--- Iteration ${i}/${iterations} ---`);
      const iterationStart = Date.now();
      
      // Run core tests with error tracking
      const beforeCount = this.results.length;
      await this.runCoreTests();
      const afterCount = this.results.length;
      
      const iterationResults = this.results.slice(beforeCount);
      const success = iterationResults.filter(r => r.success).length;
      const failed = iterationResults.filter(r => !r.success).length;
      const duration = Date.now() - iterationStart;
      
      stressResults.push({ iteration: i, success, failed, duration });
      
      // Wait between iterations with backoff
      if (i < iterations) {
        const waitTime = failed > 0 ? 5000 : 2000; // Wait longer if failures
        console.log(`⏳ Waiting ${waitTime/1000} seconds before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Print stress test summary
    console.log('\n🏁 Stress Test Summary:');
    console.log('='.repeat(60));
    stressResults.forEach(result => {
      const statusIcon = result.failed === 0 ? '✅' : '⚠️';
      console.log(`${statusIcon} Iteration ${result.iteration}: ${result.success}✅ ${result.failed}❌ (${result.duration}ms)`);
    });
    
    const totalSuccess = stressResults.reduce((sum, r) => sum + r.success, 0);
    const totalFailed = stressResults.reduce((sum, r) => sum + r.failed, 0);
    const avgDuration = stressResults.reduce((sum, r) => sum + r.duration, 0) / stressResults.length;
    
    console.log(`\n📊 Overall: ${totalSuccess}✅ ${totalFailed}❌ | Avg: ${avgDuration.toFixed(0)}ms/iteration`);
  }

  async monitorPerformance(): Promise<void> {
    console.log('📈 Performance monitoring mode...\n');
    
    while (true) {
      await this.testScannerEngine();
      await this.sendTestSignal(false);
      
      console.log('⏳ Waiting 30 seconds before next check...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

// Export for use in other test files
export { EdgeFunctionTestHarness, TestResult, TelegramSignal };

// CLI interface
if (import.meta.main) {
  const harness = new EdgeFunctionTestHarness();
  const command = Deno.args[0] || 'all';
  
  switch (command) {
    case 'all':
      await harness.runAllTests();
      break;
    case 'core':
      await harness.runCoreTests();
      break;
    case 'signals':
      await harness.runSignalTests();
      break;
    case 'stress':
      const iterations = parseInt(Deno.args[1]) || 5;
      await harness.stressTest(iterations);
      break;
    case 'monitor':
      await harness.monitorPerformance();
      break;
    default:
      console.log('Usage: deno run --allow-net --allow-env edge-functions-harness.ts [command]');
      console.log('Commands: all, core, signals, stress [iterations], monitor');
  }
}