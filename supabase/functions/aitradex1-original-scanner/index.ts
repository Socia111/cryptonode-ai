import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const log = (level: string, message: string, data: any = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
};

function generateMockSignals(count: number = 10) {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
  const signals = [];
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const confidence = 80 + Math.random() * 20; // 80-100%
    const price = 1000 + Math.random() * 50000; // Random price
    
    signals.push({
      id: crypto.randomUUID(),
      symbol,
      side,
      confidence: Math.round(confidence * 100) / 100,
      price: Math.round(price * 100) / 100,
      timestamp: new Date().toISOString(),
      source: 'aitradex1-scanner',
      indicators: {
        rsi: 30 + Math.random() * 40,
        macd: (Math.random() - 0.5) * 2,
        volume_spike: Math.random() > 0.7
      }
    });
  }
  
  return signals;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, count = 10 } = body;

    log('info', 'Scanner request', { action, count });

    if (action === 'generate_signals') {
      const signals = generateMockSignals(count);
      
      log('info', 'Generated signals', { 
        count: signals.length,
        symbols: [...new Set(signals.map(s => s.symbol))]
      });

      return json({
        success: true,
        signals,
        metadata: {
          generated_at: new Date().toISOString(),
          scanner_version: '1.0.0',
          total_signals: signals.length
        }
      });
    }

    if (action === 'status') {
      return json({
        status: 'operational',
        scanner_enabled: true,
        last_scan: new Date().toISOString(),
        supported_symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT']
      });
    }

    return json({ error: 'Invalid action' }, 400);

  } catch (error: any) {
    log('error', 'Scanner failed', { error: error.message });
    return json({
      error: 'Scanner error',
      message: error.message
    }, 500);
  }
});