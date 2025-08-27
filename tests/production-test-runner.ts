// Production Test Runner with Advanced Features
import { EdgeFunctionTestHarness } from './edge-functions-harness.ts';

interface TestConfig {
  parallel: boolean;
  timeout: number;
  retries: number;
  telegram: boolean;
  verbose: boolean;
}

class ProductionTestRunner {
  private harness: EdgeFunctionTestHarness;
  private config: TestConfig;
  private logFile: string;
  
  constructor(config: Partial<TestConfig> = {}) {
    this.harness = new EdgeFunctionTestHarness();
    this.config = {
      parallel: true,
      timeout: 30000,
      retries: 2,
      telegram: true,
      verbose: false,
      ...config
    };
    this.logFile = `test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  }

  async runProductionSuite(): Promise<void> {
    console.log('🏭 Production Test Suite Starting...');
    console.log(`📋 Config: ${JSON.stringify(this.config, null, 2)}\n`);
    
    const suiteStart = Date.now();
    const results: any[] = [];

    try {
      // 1. Health Check
      console.log('🏥 Phase 1: Health Check');
      const healthResult = await this.withTimeout(
        this.harness.testScannerEngine(),
        5000
      );
      results.push({ phase: 'health', ...healthResult });
      
      if (!healthResult.success) {
        console.log('❌ Health check failed, aborting suite');
        return;
      }

      // 2. Core Functions
      console.log('\n⚡ Phase 2: Core Functions');
      if (this.config.parallel) {
        const coreResults = await Promise.allSettled([
          this.withRetry(() => this.harness.testScannerEngine()),
          this.withRetry(() => this.harness.testEnhancedSignalGeneration()),
          this.withRetry(() => this.harness.testCalculateSpynxScores()),
        ]);
        results.push(...coreResults.map((r, i) => ({ 
          phase: 'core', 
          index: i, 
          ...(r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }) 
        })));
      } else {
        // Sequential for debugging
        for (const test of ['scanner-engine', 'enhanced-signal-generation', 'calculate-spynx-scores']) {
          const result = await this.withRetry(() => this.harness.testFunction(test));
          results.push({ phase: 'core', test, ...result });
        }
      }

      // 3. Extended Functions
      console.log('\n📊 Phase 3: Extended Functions');
      const extendedResults = await Promise.allSettled([
        this.withRetry(() => this.harness.testBacktestEngine()),
        this.withRetry(() => this.harness.testSentimentAnalysis()),
        this.withRetry(() => this.harness.testTradeExecution()),
      ]);
      results.push(...extendedResults.map((r, i) => ({ 
        phase: 'extended', 
        index: i, 
        ...(r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }) 
      })));

      // 4. Telegram Integration (if enabled)
      if (this.config.telegram) {
        console.log('\n📱 Phase 4: Telegram Integration');
        const telegramResults = await Promise.allSettled([
          this.withRetry(() => this.harness.sendTestSignal(false)),
          this.withRetry(() => this.harness.sendTestSignal(true)),
        ]);
        results.push(...telegramResults.map((r, i) => ({ 
          phase: 'telegram', 
          type: i === 0 ? 'free' : 'premium',
          ...(r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }) 
        })));
      }

      // 5. End-to-End Signal Flow
      console.log('\n🔄 Phase 5: End-to-End Signal Flow');
      const e2eResult = await this.testSignalFlow();
      results.push({ phase: 'e2e', ...e2eResult });

    } catch (error) {
      console.error('💥 Suite failed:', error);
      results.push({ phase: 'suite', success: false, error: error.message });
    }

    const suiteDuration = Date.now() - suiteStart;
    
    // Generate comprehensive report
    await this.generateReport(results, suiteDuration);
  }

  private async testSignalFlow(): Promise<any> {
    console.log('🎯 Testing complete signal generation → Telegram flow...');
    
    try {
      // Generate signals
      const scanResult = await this.harness.testScannerEngine();
      if (!scanResult.success) {
        return { success: false, error: 'Scanner failed', step: 'generation' };
      }

      // Send to Telegram if we have signals
      if (scanResult.data?.signals_count > 0) {
        const telegramResult = await this.harness.sendTestSignal(false);
        return { 
          success: telegramResult.success, 
          signals_generated: scanResult.data.signals_count,
          telegram_sent: telegramResult.success,
          step: 'complete'
        };
      }

      return { success: true, signals_generated: 0, step: 'no_signals' };
    } catch (error) {
      return { success: false, error: error.message, step: 'flow_error' };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      try {
        const result = await this.withTimeout(fn(), this.config.timeout);
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt <= this.config.retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private async generateReport(results: any[], duration: number): Promise<void> {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      config: this.config,
      summary: {
        total,
        successful,
        failed,
        success_rate: ((successful / total) * 100).toFixed(1) + '%'
      },
      results,
      environment: {
        deno_version: Deno.version.deno,
        platform: Deno.build.os,
        arch: Deno.build.arch
      }
    };

    // Write to file
    await Deno.writeTextFile(this.logFile, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 Production Test Report');
    console.log('='.repeat(50));
    console.log(`✅ Success Rate: ${report.summary.success_rate}`);
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📁 Report saved: ${this.logFile}`);
    
    if (this.config.verbose) {
      console.log('\n📋 Detailed Results:');
      results.forEach((result, i) => {
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${result.phase}-${result.index || result.type || i}: ${result.function || 'test'}`);
        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });
    }

    // Exit with appropriate code
    if (failed > 0) {
      console.log(`\n❌ ${failed} tests failed`);
      Deno.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }

  async runContinuousMonitoring(intervalMinutes: number = 30): Promise<void> {
    console.log(`📡 Starting continuous monitoring (every ${intervalMinutes} minutes)...`);
    
    while (true) {
      try {
        const startTime = Date.now();
        console.log(`\n🔄 Monitor Check: ${new Date().toISOString()}`);
        
        // Quick health check
        const healthResult = await this.harness.testScannerEngine();
        
        if (healthResult.success) {
          console.log(`✅ Health check passed (${Date.now() - startTime}ms)`);
          
          // Send a test signal every hour
          if (new Date().getMinutes() === 0) {
            await this.harness.sendTestSignal(false);
            console.log('📱 Hourly test signal sent');
          }
        } else {
          console.log(`❌ Health check failed: ${healthResult.error}`);
          // Could trigger alerts here
        }
        
      } catch (error) {
        console.error('💥 Monitor error:', error);
      }
      
      // Wait for next check
      await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
    }
  }
}

// CLI interface for production runner
if (import.meta.main) {
  const command = Deno.args[0] || 'production';
  
  switch (command) {
    case 'production':
      const runner = new ProductionTestRunner({
        parallel: true,
        retries: 3,
        telegram: true,
        verbose: Deno.args.includes('--verbose')
      });
      await runner.runProductionSuite();
      break;
      
    case 'monitor':
      const monitor = new ProductionTestRunner({ timeout: 10000 });
      const interval = parseInt(Deno.args[1]) || 30;
      await monitor.runContinuousMonitoring(interval);
      break;
      
    case 'debug':
      const debugRunner = new ProductionTestRunner({
        parallel: false,
        retries: 0,
        telegram: false,
        verbose: true
      });
      await debugRunner.runProductionSuite();
      break;
      
    default:
      console.log('Usage: deno run --allow-net --allow-env --allow-write production-test-runner.ts [command]');
      console.log('Commands:');
      console.log('  production [--verbose] - Run full production test suite');
      console.log('  monitor [interval]     - Continuous monitoring (default: 30min)');
      console.log('  debug                  - Sequential tests with full logging');
  }
}