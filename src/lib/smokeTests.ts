// Smoke test utilities for post-deployment verification
import { supabase } from '@/lib/supabaseClient';

export const smokeTests = {
  // 1. Config ping - verify basic connectivity
  async configPing() {
    console.log('[SmokeTest] Running config ping...');
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('id')
        .limit(1);
      
      const result = {
        success: !error,
        rows: data?.length ?? 0,
        error: error?.message
      };
      
      console.log('[SmokeTest] Config ping result:', result);
      return result;
    } catch (e: any) {
      console.error('[SmokeTest] Config ping failed:', e.message);
      return { success: false, rows: 0, error: e.message };
    }
  },

  // 2. Test realtime connectivity
  async realtimeTest() {
    console.log('[SmokeTest] Testing realtime connectivity...');
    return new Promise((resolve) => {
      let received = false;
      
      const channel = supabase
        .channel('smoke_test_channel')
        .on('presence', { event: 'sync' }, () => {
          received = true;
          console.log('[SmokeTest] Realtime connection established');
          supabase.removeChannel(channel);
          resolve({ success: true, connected: true });
        })
        .subscribe();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!received) {
          console.log('[SmokeTest] Realtime timeout');
          supabase.removeChannel(channel);
          resolve({ success: false, connected: false, error: 'Timeout' });
        }
      }, 5000);
    });
  },

  // 3. Function connectivity test
  async functionTest(functionName: string) {
    console.log(`[SmokeTest] Testing function: ${functionName}...`);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true }
      });
      
      const result = {
        success: !error,
        data,
        error: error?.message
      };
      
      console.log(`[SmokeTest] Function ${functionName} result:`, result);
      return result;
    } catch (e: any) {
      console.error(`[SmokeTest] Function ${functionName} failed:`, e.message);
      return { success: false, error: e.message };
    }
  },

  // Run all smoke tests
  async runAll() {
    console.log('🔥 [SmokeTest] Running full smoke test suite...');
    
    const results = {
      config: await this.configPing(),
      realtime: await this.realtimeTest(),
      signalGeneration: await this.functionTest('enhanced-signal-generation'),
      timestamp: new Date().toISOString()
    };
    
    const allPassed = Object.values(results).every(r => 
      typeof r === 'object' && 'success' in r ? r.success : true
    );
    
    console.log(`🔥 [SmokeTest] Suite ${allPassed ? 'PASSED' : 'FAILED'}:`, results);
    return results;
  }
};

// Export for dev console access
if (typeof window !== 'undefined') {
  (window as any).__smokeTests = smokeTests;
}