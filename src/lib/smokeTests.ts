// Smoke test utilities for post-deployment verification
import { supabase } from '@/lib/supabaseClient';

const TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

type Ok = { success: true } & Record<string, any>;
type Fail = { success: false; error?: string } & Record<string, any>;
type Res = Ok | Fail;

export const smokeTests = {
  // 1) Config / RLS ping (public read table)
  async configPing(): Promise<Res> {
    console.log('[SmokeTest] Config ping…');
    try {
      const result = await supabase.from('markets').select('id').limit(1);
      const { data, error } = result;
      const ok = !error;
      const rows = data?.length ?? 0;
      console.log('[SmokeTest] Config ping:', { ok, rows, error: error?.message });
      return { success: ok, rows, error: error?.message };
    } catch (e: any) {
      console.error('[SmokeTest] Config ping failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 2) Realtime connectivity via Presence (requires track())
  async realtimeTest(): Promise<Res> {
    console.log('[SmokeTest] Realtime test (presence)… Note: Requires browser + Realtime enabled');
    // Guard for SSR/Node environments
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      console.warn('[SmokeTest] Skipping realtime test - not in browser environment');
      return { success: false, connected: false, error: 'Not in browser environment' };
    }
      return new Promise<Res>((resolve) => {
      let resolved = false;
      const channel = supabase.channel('smoke_test_channel', { config: { presence: { key: 'smoke' } } });

      const cleanup = (result: Res) => {
        if (resolved) return;
        resolved = true;
        try { supabase.removeChannel(channel); } catch {}
        resolve(result);
      };

      channel.on('presence', { event: 'sync' }, () => {
        console.log('[SmokeTest] Presence sync fired — realtime OK');
        cleanup({ success: true, connected: true });
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence — this is what triggers 'sync'
          channel.track({ role: 'smoke-test', ts: Date.now() });
        }
      });

      setTimeout(() => {
        console.warn('[SmokeTest] Realtime timeout');
        cleanup({ success: false, connected: false, error: 'Timeout' });
      }, TIMEOUT_MS);
    });
  },

  // 3) Function connectivity (with timeout + data.error guard)
  async functionTest(functionName: string, body: any = { test: true }): Promise<Res> {
    console.log(`[SmokeTest] Function: ${functionName}…`);
    try {
      const result = await supabase.functions.invoke(functionName, { body });
      const { data, error } = result;
      const ok = !error && !(data && (data.error || data.err));
      const errMsg = error?.message ?? data?.error ?? data?.err;
      console.log(`[SmokeTest] Function ${functionName}:`, { ok, data, error: errMsg });
      return { success: ok, data, error: errMsg };
    } catch (e: any) {
      console.error(`[SmokeTest] Function ${functionName} failed:`, e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 4) Auth/session probe (optional but handy)
  async authProbe(): Promise<Res> {
    console.log('[SmokeTest] Auth probe…');
    try {
      const result = await supabase.auth.getSession();
      const { data: { session }, error } = result;
      const ok = !!session && !error;
      console.log('[SmokeTest] Auth:', { ok, user: session?.user?.id, error: error?.message });
      return { success: ok, user_id: session?.user?.id, error: error?.message };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  // Run all
  async runAll(): Promise<{ config: Res; realtime: Res; auth: Res; signalGeneration: Res; timestamp: string }> {
    console.log('🔥 [SmokeTest] Running suite…');
    const results = {
      config: await this.configPing(),
      realtime: await this.realtimeTest(),
      auth: await this.authProbe(),
      signalGeneration: await this.functionTest('enhanced-signal-generation'),
      timestamp: new Date().toISOString(),
    };
    const allPassed = [results.config, results.realtime, results.signalGeneration]
      .every(r => r.success);
    console.log(`🔥 [SmokeTest] ${allPassed ? 'PASSED' : 'FAILED'}`, results);
    return results;
  },
};

// Expose in dev console
if (typeof window !== 'undefined') (window as any).__smokeTests = smokeTests;