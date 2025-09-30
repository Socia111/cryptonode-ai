import { supabase } from '@/integrations/supabase/client';

export interface SystemTestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: string;
}

export class SystemTester {
  private results: SystemTestResult[] = [];

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string) {
    this.results.push({
      component,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  async testSignalGeneration(): Promise<void> {
    try {
      console.log('🧪 Testing signal generation...');
      
      const { data, error } = await supabase.functions.invoke('aitradex1-strategy-engine', {
        body: { 
          symbols: ['BTCUSDT', 'ETHUSDT'], 
          timeframe: '1h',
          force_refresh: true 
        }
      });

      if (error) {
        this.addResult('Signal Generation', 'fail', `Error: ${error.message}`);
        return;
      }

      if (data && data.signals_generated > 0) {
        this.addResult('Signal Generation', 'pass', `Generated ${data.signals_generated} signals`);
      } else {
        this.addResult('Signal Generation', 'warning', 'No signals generated');
      }
    } catch (error) {
      this.addResult('Signal Generation', 'fail', `Exception: ${error}`);
    }
  }

  async testTradingStatus(): Promise<void> {
    try {
      console.log('🧪 Testing trading status...');
      
      const { data, error } = await supabase.functions.invoke('debug-trading-status');

      if (error) {
        this.addResult('Trading Status', 'fail', `Error: ${error.message}`);
        return;
      }

      if (data?.success) {
        this.addResult('Trading Status', 'pass', 'Trading system operational');
      } else {
        this.addResult('Trading Status', 'warning', 'Trading system issues detected');
      }
    } catch (error) {
      this.addResult('Trading Status', 'fail', `Exception: ${error}`);
    }
  }

  async testDatabase(): Promise<void> {
    try {
      console.log('🧪 Testing database connectivity...');
      
      const { data, error } = await supabase
        .from('signals')
        .select('id, symbol, score, created_at')
        .eq('is_active', true)
        .limit(5);

      if (error) {
        this.addResult('Database', 'fail', `Error: ${error.message}`);
        return;
      }

      this.addResult('Database', 'pass', `Found ${data?.length || 0} active signals`);
    } catch (error) {
      this.addResult('Database', 'fail', `Exception: ${error}`);
    }
  }

  async testScheduler(): Promise<void> {
    try {
      console.log('🧪 Testing crypto scheduler...');
      
      const { data, error } = await supabase.functions.invoke('crypto-scheduler', {
        body: { test: true }
      });

      if (error) {
        this.addResult('Scheduler', 'fail', `Error: ${error.message}`);
        return;
      }

      if (data?.success) {
        this.addResult('Scheduler', 'pass', 'Scheduler responding correctly');
      } else {
        this.addResult('Scheduler', 'warning', 'Scheduler response unclear');
      }
    } catch (error) {
      this.addResult('Scheduler', 'fail', `Exception: ${error}`);
    }
  }

  async runAllTests(): Promise<SystemTestResult[]> {
    this.results = [];
    
    console.log('🚀 Starting AItradeX1 System Tests...');
    
    await Promise.all([
      this.testDatabase(),
      this.testTradingStatus(),
      this.testSignalGeneration(),
      this.testScheduler()
    ]);

    console.log('✅ System tests completed:', this.results);
    return this.results;
  }

  getResults(): SystemTestResult[] {
    return this.results;
  }
}

export const systemTester = new SystemTester();