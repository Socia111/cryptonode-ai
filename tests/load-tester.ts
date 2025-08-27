# Load Testing and Benchmarking Suite
import { EdgeFunctionTestHarness } from './edge-functions-harness.ts';

interface LoadTestConfig {
  concurrent_users: number;
  duration_seconds: number;
  ramp_up_seconds: number;
  target_functions: string[];
}

interface LoadTestResult {
  function: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  requests_per_second: number;
  error_rate: number;
}

class LoadTester {
  private harness: EdgeFunctionTestHarness;
  private results: LoadTestResult[] = [];

  constructor() {
    this.harness = new EdgeFunctionTestHarness();
  }

  async runLoadTest(config: LoadTestConfig): Promise<void> {
    console.log('🔥 Starting Load Test');
    console.log('='.repeat(40));
    console.log(`👥 Concurrent Users: ${config.concurrent_users}`);
    console.log(`⏱️  Duration: ${config.duration_seconds}s`);
    console.log(`📈 Ramp Up: ${config.ramp_up_seconds}s`);
    console.log(`🎯 Functions: ${config.target_functions.join(', ')}\n`);

    for (const functionName of config.target_functions) {
      console.log(`🎯 Load testing: ${functionName}`);
      const result = await this.loadTestFunction(functionName, config);
      this.results.push(result);
      
      // Cool down between functions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.printLoadTestSummary();
  }

  private async loadTestFunction(
    functionName: string, 
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    const responseTimes: number[] = [];
    let successful = 0;
    let failed = 0;
    const startTime = Date.now();
    const endTime = startTime + (config.duration_seconds * 1000);
    
    // Calculate ramp-up delay between users
    const rampUpDelay = (config.ramp_up_seconds * 1000) / config.concurrent_users;
    
    const workers: Promise<void>[] = [];
    
    // Spawn concurrent workers
    for (let i = 0; i < config.concurrent_users; i++) {
      const worker = this.createWorker(
        functionName,
        endTime,
        i * rampUpDelay,
        responseTimes,
        () => successful++,
        () => failed++
      );
      workers.push(worker);
    }
    
    // Wait for all workers to complete
    await Promise.allSettled(workers);
    
    const totalRequests = successful + failed;
    const testDuration = (Date.now() - startTime) / 1000;
    
    return {
      function: functionName,
      total_requests: totalRequests,
      successful_requests: successful,
      failed_requests: failed,
      avg_response_time: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      min_response_time: Math.min(...responseTimes) || 0,
      max_response_time: Math.max(...responseTimes) || 0,
      requests_per_second: totalRequests / testDuration,
      error_rate: (failed / totalRequests) * 100 || 0
    };
  }

  private async createWorker(
    functionName: string,
    endTime: number,
    initialDelay: number,
    responseTimes: number[],
    onSuccess: () => void,
    onFailure: () => void
  ): Promise<void> {
    // Initial ramp-up delay
    await new Promise(resolve => setTimeout(resolve, initialDelay));
    
    while (Date.now() < endTime) {
      const requestStart = Date.now();
      
      try {
        const result = await this.harness.testFunction(functionName);
        const responseTime = Date.now() - requestStart;
        
        responseTimes.push(responseTime);
        
        if (result.success) {
          onSuccess();
        } else {
          onFailure();
        }
        
      } catch (error) {
        onFailure();
      }
      
      // Small delay between requests from same worker
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private printLoadTestSummary(): void {
    console.log('\n📊 Load Test Results Summary');
    console.log('='.repeat(80));
    
    this.results.forEach(result => {
      console.log(`\n🎯 ${result.function.toUpperCase()}`);
      console.log(`   Total Requests: ${result.total_requests}`);
      console.log(`   Success Rate: ${((result.successful_requests / result.total_requests) * 100).toFixed(1)}%`);
      console.log(`   RPS: ${result.requests_per_second.toFixed(2)}`);
      console.log(`   Avg Response: ${result.avg_response_time.toFixed(0)}ms`);
      console.log(`   Response Range: ${result.min_response_time.toFixed(0)}ms - ${result.max_response_time.toFixed(0)}ms`);
      
      if (result.error_rate > 0) {
        console.log(`   ⚠️  Error Rate: ${result.error_rate.toFixed(1)}%`);
      }
    });
    
    // Overall summary
    const totalRequests = this.results.reduce((sum, r) => sum + r.total_requests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successful_requests, 0);
    const avgRPS = this.results.reduce((sum, r) => sum + r.requests_per_second, 0) / this.results.length;
    
    console.log('\n🏆 OVERALL PERFORMANCE');
    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   Overall Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`);
    console.log(`   Average RPS: ${avgRPS.toFixed(2)}`);
  }

  async runBenchmark(): Promise<void> {
    console.log('⚡ Edge Function Benchmark Suite\n');
    
    const benchmarkConfigs = [
      { name: 'Light Load', concurrent_users: 5, duration_seconds: 30 },
      { name: 'Medium Load', concurrent_users: 15, duration_seconds: 60 },
      { name: 'Heavy Load', concurrent_users: 30, duration_seconds: 120 },
    ];
    
    for (const config of benchmarkConfigs) {
      console.log(`\n🔥 ${config.name} Test`);
      
      await this.runLoadTest({
        ...config,
        ramp_up_seconds: 10,
        target_functions: ['scanner-engine', 'telegram-bot']
      });
      
      // Reset results for next benchmark
      this.results = [];
      
      // Cool down between benchmarks
      console.log('⏳ Cooling down...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// CLI interface for load testing
if (import.meta.main) {
  const command = Deno.args[0] || 'light';
  const loadTester = new LoadTester();
  
  switch (command) {
    case 'light':
      await loadTester.runLoadTest({
        concurrent_users: 5,
        duration_seconds: 30,
        ramp_up_seconds: 5,
        target_functions: ['scanner-engine', 'telegram-bot']
      });
      break;
      
    case 'medium':
      await loadTester.runLoadTest({
        concurrent_users: 15,
        duration_seconds: 60,
        ramp_up_seconds: 10,
        target_functions: ['scanner-engine', 'enhanced-signal-generation', 'telegram-bot']
      });
      break;
      
    case 'heavy':
      await loadTester.runLoadTest({
        concurrent_users: 30,
        duration_seconds: 120,
        ramp_up_seconds: 15,
        target_functions: ['scanner-engine', 'enhanced-signal-generation', 'calculate-spynx-scores', 'telegram-bot']
      });
      break;
      
    case 'benchmark':
      await loadTester.runBenchmark();
      break;
      
    case 'custom':
      const users = parseInt(Deno.args[1]) || 10;
      const duration = parseInt(Deno.args[2]) || 60;
      const functions = Deno.args.slice(3);
      
      if (functions.length === 0) {
        functions.push('scanner-engine', 'telegram-bot');
      }
      
      await loadTester.runLoadTest({
        concurrent_users: users,
        duration_seconds: duration,
        ramp_up_seconds: Math.min(10, duration / 4),
        target_functions: functions
      });
      break;
      
    default:
      console.log('Usage: deno run --allow-net --allow-env load-tester.ts [command]');
      console.log('Commands:');
      console.log('  light     - Light load test (5 users, 30s)');
      console.log('  medium    - Medium load test (15 users, 60s)');
      console.log('  heavy     - Heavy load test (30 users, 120s)');
      console.log('  benchmark - Run all benchmark levels');
      console.log('  custom [users] [duration] [functions...] - Custom test');
      console.log('');
      console.log('Examples:');
      console.log('  deno run --allow-net --allow-env load-tester.ts custom 20 90 scanner-engine telegram-bot');
  }
}