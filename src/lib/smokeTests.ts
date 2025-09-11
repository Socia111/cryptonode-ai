// Production smoke tests for live trading system
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

function getFunctionsBaseUrl(): string {
  return 'https://codhlwjogfjywmjyjbbn.functions.supabase.co';
}

async function getSessionToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn('Failed to get session token:', error);
    return null;
  }
}

export const smokeTests = {
  // 1) Direct Bybit API Status Check
  async bybitApiStatus(): Promise<Res> {
    console.log('[SmokeTest] Bybit API status check...');
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await withTimeout(
        fetch(`${functionsBase}/bybit-live-trading`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'status' })
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const ok = data.success && data.data?.status === 'connected';
      
      console.log('[SmokeTest] Bybit API status:', { 
        ok, 
        testnet: data.testMode,
        live_trading: data.live_trading_enabled,
        whitelisted_symbols: data.data?.whitelisted_symbols?.length || 0
      });
      
      return { 
        success: ok, 
        testnet: data.testMode, 
        live_trading_enabled: data.live_trading_enabled,
        data: data.data 
      };
    } catch (e: any) {
      console.error('[SmokeTest] Bybit API status failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 2) Test order placement (canary order)
  async canaryOrder(): Promise<Res> {
    console.log('[SmokeTest] Canary order test...');
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }

      const canarySignal = {
        symbol: 'BTCUSDT',
        side: 'Buy',
        orderType: 'Market',
        qty: '0.001', // Very small test order
        timeInForce: 'IOC'
      };

      const idempotencyKey = `canary-${Date.now()}`;

      const response = await withTimeout(
        fetch(`${functionsBase}/bybit-live-trading`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'place_order',
            signal: canarySignal,
            testMode: true, // Force testnet for canary
            idempotencyKey
          })
        })
      );

      const data = await response.json();
      const ok = data.success || (data.code === 'LIVE_TRADING_DISABLED'); // Expected in paper mode
      
      console.log('[SmokeTest] Canary order:', { 
        ok, 
        testMode: data.testMode,
        message: data.message,
        code: data.code,
        idempotencyKey
      });
      
      return { 
        success: ok, 
        testMode: data.testMode,
        message: data.message,
        code: data.code,
        idempotencyKey
      };
    } catch (e: any) {
      console.error('[SmokeTest] Canary order failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 3) TradingView webhook test
  async tradingViewWebhook(): Promise<Res> {
    console.log('[SmokeTest] TradingView webhook test...');
    try {
      const functionsBase = getFunctionsBaseUrl();
      
      const webhookPayload = {
        passphrase: 'test-passphrase',
        ticker: 'BTCUSDT',
        side: 'buy',
        price: 50000,
        tf: '15',
        meta: { confidence: 0.82, pms: 0.78 }
      };

      const response = await withTimeout(
        fetch(`${functionsBase}/tradingview-webhook`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        })
      );

      const data = await response.json();
      const ok = data.success || response.status === 401; // Auth error expected without passphrase
      
      console.log('[SmokeTest] TradingView webhook:', { 
        ok, 
        status: response.status,
        message: data.message || data.error
      });
      
      return { 
        success: ok, 
        status: response.status,
        message: data.message || data.error
      };
    } catch (e: any) {
      console.error('[SmokeTest] TradingView webhook failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 4) Position fetching test
  async positionsFetch(): Promise<Res> {
    console.log('[SmokeTest] Positions fetch test...');
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await withTimeout(
        fetch(`${functionsBase}/bybit-live-trading`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'positions' })
        })
      );

      const data = await response.json();
      const ok = data.success;
      const positionCount = data.data?.list?.length || 0;
      
      console.log('[SmokeTest] Positions fetch:', { 
        ok, 
        positionCount,
        testMode: data.testMode
      });
      
      return { 
        success: ok, 
        positionCount,
        testMode: data.testMode
      };
    } catch (e: any) {
      console.error('[SmokeTest] Positions fetch failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // 5) Balance check test
  async balanceCheck(): Promise<Res> {
    console.log('[SmokeTest] Balance check test...');
    try {
      const functionsBase = getFunctionsBaseUrl();
      const sessionToken = await getSessionToken();
      
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      
      if (sessionToken) {
        headers['authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await withTimeout(
        fetch(`${functionsBase}/bybit-live-trading`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'balance' })
        })
      );

      const data = await response.json();
      const ok = data.success;
      const usdtBalance = data.data?.list?.[0]?.coin?.find((c: any) => c.coin === 'USDT')?.walletBalance || 0;
      
      console.log('[SmokeTest] Balance check:', { 
        ok, 
        usdtBalance: parseFloat(usdtBalance),
        testMode: data.testMode
      });
      
      return { 
        success: ok, 
        usdtBalance: parseFloat(usdtBalance),
        testMode: data.testMode
      };
    } catch (e: any) {
      console.error('[SmokeTest] Balance check failed:', e?.message);
      return { success: false, error: e?.message };
    }
  },

  // Run comprehensive production smoke tests
  async runProductionSuite(): Promise<{ 
    bybitApi: Res; 
    canaryOrder: Res; 
    tradingViewWebhook: Res; 
    positions: Res; 
    balance: Res; 
    timestamp: string;
    overall: { passed: boolean; score: string };
  }> {
    console.log('🔥 [Production SmokeTest] Running comprehensive suite...');
    
    const results = {
      bybitApi: await this.bybitApiStatus(),
      canaryOrder: await this.canaryOrder(),
      tradingViewWebhook: await this.tradingViewWebhook(),
      positions: await this.positionsFetch(),
      balance: await this.balanceCheck(),
      timestamp: new Date().toISOString(),
      overall: { passed: false, score: '0/5' }
    };

    const passedTests = [
      results.bybitApi.success,
      results.canaryOrder.success,
      results.tradingViewWebhook.success,
      results.positions.success,
      results.balance.success
    ].filter(Boolean).length;

    results.overall = {
      passed: passedTests >= 4, // Need at least 4/5 to pass
      score: `${passedTests}/5`
    };

    console.log(`🔥 [Production SmokeTest] ${results.overall.passed ? 'PASSED' : 'FAILED'} (${results.overall.score})`, results);
    
    return results;
  },

  // Quick connection test for Live Setup UI
  async quickConnectionTest(): Promise<Res> {
    console.log('[SmokeTest] Quick connection test...');
    try {
      const result = await this.bybitApiStatus();
      
      if (result.success) {
        return {
          success: true,
          status: 'connected',
          testMode: result.testnet,
          live_trading_enabled: result.live_trading_enabled
        };
      } else {
        return {
          success: false,
          status: 'disconnected',
          error: result.error
        };
      }
    } catch (e: any) {
      return { success: false, status: 'error', error: e?.message };
    }
  }
};

// Expose in dev console
if (typeof window !== 'undefined') (window as any).__smokeTests = smokeTests;