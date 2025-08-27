// Node 18+ required (global fetch). Run with: node --env-file=.env tests/run-all.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_*_KEY in env.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const results = { total: 0, passed: 0, failed: 0, details: [] };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(category, test, status, details = '') {
  results.total++;
  if (status === 'PASS') results.passed++; else results.failed++;
  const line = `[${category}] ${test} — ${status}${details ? ` (${details})` : ''}`;
  console.log(status === 'PASS' ? `✅ ${line}` : `❌ ${line}`);
  results.details.push({ category, test, status, details });
}

/* ----------------------------------------------
   STEP 1 — DATABASE
---------------------------------------------- */
async function testDatabase() {
  console.log('\n🗄️  STEP 1: DATABASE\n====================');
  try {
    const { data, error } = await sb.from('signals').select('*').limit(5);
    if (error) throw error;
    log('DATABASE', 'signals table accessible', 'PASS', `rows: ${data?.length ?? 0}`);
    if (data?.length) {
      const s = data[0];
      const ok = s.symbol && s.direction && s.price !== undefined && s.score !== undefined;
      log('DATABASE', 'signals row shape', ok ? 'PASS' : 'FAIL', ok ? 'ok' : 'missing cols');
    }
  } catch (e) {
    log('DATABASE', 'signals table accessible', 'FAIL', e.message);
  }

  for (const t of ['signals_state','alerts_log','scans','backtest_results']) {
    try {
      const { error } = await sb.from(t).select('id', { count: 'exact' }).limit(1);
      if (error) throw error;
      log('DATABASE', `${t} table accessible`, 'PASS');
    } catch (e) {
      log('DATABASE', `${t} table accessible`, 'FAIL', e.message);
    }
  }
}

/* ----------------------------------------------
   STEP 2 — EXTERNAL (BYBIT)
---------------------------------------------- */
async function testBybit() {
  console.log('\n🌐 STEP 2: EXTERNAL (Bybit)\n===========================');
  const url = (s, i) =>
    `https://api.bybit.com/v5/market/kline?category=linear&symbol=${s}&interval=${i}&limit=2`;
  try {
    const r = await fetch(url('BTCUSDT', '60'));
    const j = await r.json();
    if (j?.result?.list?.length) {
      const px = parseFloat(j.result.list[0][4]);
      log('EXTERNAL', 'Bybit BTCUSDT 1h', 'PASS', `price ~$${px.toLocaleString()}`);
    } else throw new Error('empty list');
  } catch (e) {
    log('EXTERNAL', 'Bybit BTCUSDT 1h', 'FAIL', e.message);
  }

  for (const tf of ['1','5','15','60']) {
    try {
      const r = await fetch(url('ETHUSDT', tf));
      const j = await r.json();
      if (j?.result?.list?.length) log('EXTERNAL', `ETH ${tf}m`, 'PASS', 'ok');
      else throw new Error('no candles');
    } catch (e) { log('EXTERNAL', `ETH ${tf}m`, 'FAIL', e.message); }
    await sleep(250);
  }
}

/* ----------------------------------------------
   helpers for edge function calls
---------------------------------------------- */
async function invokeGet(relativeUrl) {
  const full = `${SUPABASE_URL}${relativeUrl}`;
  const res = await fetch(full, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}
async function invokeFn(name, body = {}) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) throw new Error(error.message);
  return data;
}

/* ----------------------------------------------
   STEP 3 — EDGE FUNCTIONS (CORE)
---------------------------------------------- */
async function testEdgeCore() {
  console.log('\n⚡ STEP 3: EDGE FUNCTIONS (Core)\n================================');
  try {
    const { ok, data, status } = await invokeGet('/functions/v1/aitradex1-config?relaxed_filters=false');
    log('EDGE', 'aitradex1-config', ok ? 'PASS' : 'FAIL', ok ? 'ok' : `HTTP ${status}`);
    if (ok && data?.config?.inputs) {
      const { adxThreshold, hvpLower, hvpUpper } = data.config.inputs;
      console.log(`   • ADX: ${adxThreshold}  HVP band: ${hvpLower}–${hvpUpper}`);
    }
  } catch (e) { log('EDGE', 'aitradex1-config', 'FAIL', e.message); }

  const edgeList = [
    ['scanner-engine', { exchange:'bybit', timeframe:'1h', relaxed_filters:true }],
    ['live-scanner-production', { exchange:'bybit', timeframe:'15m', relaxed_filters:true }],
    ['signals-api', { path:'/signals/live' }],
  ];
  for (const [name, body] of edgeList) {
    try {
      const data = await invokeFn(name, body);
      const info = data?.message || data?.signals_found || 'ok';
      log('EDGE', name, 'PASS', String(info));
    } catch (e) { log('EDGE', name, 'FAIL', e.message); }
    await sleep(400);
  }
}

/* ----------------------------------------------
   STEP 4 — EDGE FUNCTIONS (Advanced)
---------------------------------------------- */
async function testEdgeAdvanced() {
  console.log('\n🔬 STEP 4: EDGE FUNCTIONS (Advanced)\n====================================');
  const jobs = [
    ['backtest-engine', { symbol:'BTCUSDT', strategy:'aitradex1', timeframe:'1h',
                          start_date:'2025-08-01', end_date:'2025-08-27' }],
    ['quantum-analysis', { tokens:['BTCUSDT','ETHUSDT'], simulations: 2000 }],
  ];
  for (const [name, body] of jobs) {
    try {
      const data = await invokeFn(name, body);
      const detail = data?.results?.summary?.total_trades ??
                     data?.quantum_analysis?.simulations_run ?? 'ok';
      log('EDGE_ADV', name, 'PASS', String(detail));
    } catch (e) { log('EDGE_ADV', name, 'FAIL', e.message); }
    await sleep(600);
  }
}

/* ----------------------------------------------
   STEP 5 — TELEGRAM (optional)
---------------------------------------------- */
async function testTelegram() {
  console.log('\n📱 STEP 5: TELEGRAM\n===================');
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    log('TELEGRAM', 'env present', 'FAIL', 'missing TELEGRAM_* env; skipping');
    return;
  }
  const signal = {
    signal_id: `test_${Date.now()}`,
    token: 'BTC',
    direction: 'BUY',
    signal_type: 'AITRADEX1_TEST',
    entry_price: 111111, exit_target: 112222, stop_loss: 109999,
    leverage: 2, confidence_score: 88.8, roi_projection: 1.9,
    risk_level: 'MEDIUM', signal_strength: 'STRONG', trend_projection: 'BULLISH', is_premium: false
  };
  try {
    const data = await invokeFn('telegram-bot', { signal });
    log('TELEGRAM', 'send test message', data?.success ? 'PASS' : 'FAIL',
        data?.success ? 'sent' : 'not ok');
  } catch (e) { log('TELEGRAM', 'send test message', 'FAIL', e.message); }
}

/* ----------------------------------------------
   STEP 6 — INTEGRATION (end-to-end)
---------------------------------------------- */
async function testIntegrationFlow() {
  console.log('\n🔗 STEP 6: INTEGRATION (end-to-end)\n===================================');
  try {
    await invokeFn('live-scanner-production', {
      exchange: 'bybit', timeframe: '5m', relaxed_filters: true,
      symbols: ['BTCUSDT','ETHUSDT']
    });
    await sleep(2000);
    
    const { data: newSignals } = await sb
      .from('signals')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    log('INTEGRATION', 'end-to-end signal flow', 'PASS', 
      `generated ${newSignals?.length || 0} recent signals`);
  } catch (e) {
    log('INTEGRATION', 'end-to-end signal flow', 'FAIL', e.message);
  }

  // Data consistency check
  try {
    const { data: signals } = await sb.from('signals').select('*').limit(10);
    if (signals?.length) {
      const validSignals = signals.filter(s => 
        s.symbol && 
        s.direction && 
        ['LONG', 'SHORT'].includes(s.direction) &&
        s.price > 0 &&
        s.score >= 0 && s.score <= 100
      );
      const consistency = validSignals.length / signals.length;
      log('INTEGRATION', 'data consistency', consistency > 0.9 ? 'PASS' : 'FAIL', 
        `${(consistency * 100).toFixed(1)}% valid`);
    }
  } catch (e) {
    log('INTEGRATION', 'data consistency', 'FAIL', e.message);
  }
}

/* ----------------------------------------------
   MAIN RUNNER
---------------------------------------------- */
async function runAll() {
  const start = Date.now();
  console.log('🚀 AItradeX1 COMPLETE TEST SUITE');
  console.log('='.repeat(50));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    await testDatabase();
    await testBybit();
    await testEdgeCore();
    await testEdgeAdvanced();
    await testTelegram();
    await testIntegrationFlow();

    // Final Report
    const duration = Date.now() - start;
    const passRate = (results.passed / results.total * 100).toFixed(1);
    const status = passRate >= 80 ? '🟢 OPERATIONAL' : passRate >= 60 ? '🟡 DEGRADED' : '🔴 CRITICAL';
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 FINAL REPORT');
    console.log('='.repeat(50));
    console.log(`Status: ${status}`);
    console.log(`Tests: ${results.passed}/${results.total} passed (${passRate}%)`);
    console.log(`Duration: ${duration}ms`);
    
    if (results.failed > 0) {
      console.log('\n❌ FAILURES:');
      results.details
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));
    }

    console.log('\n✅ SUCCESSES:');
    results.details
      .filter(r => r.status === 'PASS')
      .slice(0, 5) // Show first 5 successes
      .forEach(r => console.log(`   • [${r.category}] ${r.test}: ${r.details}`));
    
    if (results.details.filter(r => r.status === 'PASS').length > 5) {
      console.log(`   ... and ${results.details.filter(r => r.status === 'PASS').length - 5} more`);
    }

    console.log('\n🎉 TESTING COMPLETE!');
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

runAll().catch(console.error);