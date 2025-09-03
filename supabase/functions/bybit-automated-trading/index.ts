import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradingConfig {
  enabled: boolean;
  max_position_size: number;
  risk_per_trade: number;
  max_open_positions: number;
  min_confidence_score: number;
  timeframes: string[];
  symbols_blacklist: string[];
  use_leverage: boolean;
  leverage_amount: number;
}

interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, config } = await req.json() as { action: string; config: TradingConfig };
    
    console.log(`[Automated Trading] Action: ${action}, Config:`, config);

    // Get Bybit credentials from Supabase secrets
    const bybitApiKey = Deno.env.get('BYBIT_API_KEY');
    const bybitApiSecret = Deno.env.get('BYBIT_API_SECRET');

    if (!bybitApiKey || !bybitApiSecret) {
      throw new Error('Bybit API credentials not configured');
    }

    const credentials: BybitCredentials = {
      apiKey: bybitApiKey,
      apiSecret: bybitApiSecret,
      testnet: false // Set to true for testing
    };

    switch (action) {
      case 'status':
        return await handleStatusCheck(supabase, config);
      
      case 'start':
        return await handleStartAutomation(supabase, config, credentials);
      
      case 'stop':
        return await handleStopAutomation(supabase, config);
      
      case 'execute_all':
        return await handleBulkExecution(supabase, config, credentials);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[Automated Trading] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleStatusCheck(supabase: any, config: TradingConfig) {
  console.log('[Status Check] Checking trading system status...');
  
  // Get active positions
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('status', 'open');

  // Get today's trades
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTrades } = await supabase
    .from('trades')
    .select('*')
    .gte('created_at', today);

  // Calculate stats
  const stats = {
    activePositions: positions?.length || 0,
    todayPnL: todayTrades?.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0) || 0,
    totalVolume: todayTrades?.reduce((sum: number, trade: any) => sum + (trade.volume || 0), 0) || 0,
    winRate: calculateWinRate(todayTrades || [])
  };

  console.log('[Status Check] Stats:', stats);

  return new Response(
    JSON.stringify({
      success: true,
      status: config.enabled ? 'active' : 'inactive',
      stats,
      config
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStartAutomation(supabase: any, config: TradingConfig, credentials: BybitCredentials) {
  console.log('[Start Automation] Starting automated trading...');
  
  // Validate Bybit connection
  const connectionValid = await validateBybitConnection(credentials);
  if (!connectionValid) {
    throw new Error('Failed to connect to Bybit API');
  }

  // Store automation state
  await supabase
    .from('trading_automation')
    .upsert({
      id: 1,
      enabled: true,
      config: config,
      last_updated: new Date().toISOString()
    });

  // Start monitoring for new signals
  await startSignalMonitoring(supabase, config, credentials);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Automated trading started',
      config
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStopAutomation(supabase: any, config: TradingConfig) {
  console.log('[Stop Automation] Stopping automated trading...');
  
  // Update automation state
  await supabase
    .from('trading_automation')
    .upsert({
      id: 1,
      enabled: false,
      config: config,
      last_updated: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Automated trading stopped'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBulkExecution(supabase: any, config: TradingConfig, credentials: BybitCredentials) {
  console.log('[Bulk Execution] Executing all eligible signals...');
  
  // Get high-confidence signals from last 24 hours
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .gte('score', config.min_confidence_score)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .in('timeframe', config.timeframes)
    .not('symbol', 'in', `(${config.symbols_blacklist.join(',')})`)
    .order('score', { ascending: false })
    .limit(20);

  let executedCount = 0;
  const results = [];

  for (const signal of signals || []) {
    try {
      const orderResult = await executeSignalOrder(signal, config, credentials);
      if (orderResult.success) {
        executedCount++;
        results.push({ signal: signal.symbol, success: true });
        
        // Log the trade
        await supabase
          .from('trades')
          .insert({
            signal_id: signal.id,
            symbol: signal.symbol,
            side: signal.direction.toLowerCase(),
            entry_price: signal.price,
            stop_loss: signal.sl,
            take_profit: signal.tp,
            size: config.max_position_size,
            status: 'executed',
            exchange: 'bybit'
          });
      }
    } catch (error) {
      console.error(`[Bulk Execution] Failed to execute ${signal.symbol}:`, error);
      results.push({ signal: signal.symbol, success: false, error: error.message });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      executed_count: executedCount,
      total_signals: signals?.length || 0,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startSignalMonitoring(supabase: any, config: TradingConfig, credentials: BybitCredentials) {
  console.log('[Signal Monitoring] Starting real-time signal monitoring...');
  
  // This would typically set up a webhook or polling mechanism
  // For now, we'll just log that monitoring has started
  
  return true;
}

async function validateBybitConnection(credentials: BybitCredentials): Promise<boolean> {
  try {
    console.log('[Bybit Validation] Testing API connection...');
    
    const timestamp = Date.now().toString();
    const baseUrl = credentials.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    
    // Simple API test call
    const response = await fetch(`${baseUrl}/v5/market/time`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': credentials.apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('[Bybit Validation] Connection test result:', result);
    
    return response.ok && result.retCode === 0;
  } catch (error) {
    console.error('[Bybit Validation] Connection failed:', error);
    return false;
  }
}

async function executeSignalOrder(signal: any, config: TradingConfig, credentials: BybitCredentials) {
  console.log(`[Order Execution] Executing order for ${signal.symbol}...`);
  
  try {
    const orderData = {
      category: "linear",
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      orderType: "Market",
      qty: calculateOrderSize(signal.price, config.max_position_size).toString(),
      stopLoss: signal.sl.toString(),
      takeProfit: signal.tp.toString()
    };

    if (config.use_leverage) {
      // Set leverage first
      await setLeverage(signal.symbol, config.leverage_amount, credentials);
    }

    // Execute the market order
    const orderResult = await submitBybitOrder(orderData, credentials);
    
    console.log(`[Order Execution] Order result for ${signal.symbol}:`, orderResult);
    
    return {
      success: orderResult.success,
      orderId: orderResult.orderId,
      symbol: signal.symbol
    };
    
  } catch (error) {
    console.error(`[Order Execution] Failed for ${signal.symbol}:`, error);
    throw error;
  }
}

async function setLeverage(symbol: string, leverage: number, credentials: BybitCredentials) {
  const timestamp = Date.now().toString();
  const baseUrl = credentials.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  
  const leverageData = {
    category: "linear",
    symbol: symbol,
    buyLeverage: leverage.toString(),
    sellLeverage: leverage.toString()
  };

  const signature = await generateSignature('POST', '/v5/position/set-leverage', leverageData, credentials.apiSecret, timestamp);
  
  const response = await fetch(`${baseUrl}/v5/position/set-leverage`, {
    method: 'POST',
    headers: {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leverageData)
  });

  return await response.json();
}

async function submitBybitOrder(orderData: any, credentials: BybitCredentials) {
  const timestamp = Date.now().toString();
  const baseUrl = credentials.testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  
  const signature = await generateSignature('POST', '/v5/order/create', orderData, credentials.apiSecret, timestamp);
  
  const response = await fetch(`${baseUrl}/v5/order/create`, {
    method: 'POST',
    headers: {
      'X-BAPI-API-KEY': credentials.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  const result = await response.json();
  
  return {
    success: response.ok && result.retCode === 0,
    orderId: result.result?.orderId,
    result
  };
}

async function generateSignature(method: string, endpoint: string, params: any, secret: string, timestamp: string): Promise<string> {
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const signaturePayload = timestamp + credentials.apiKey + '5000' + queryString;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signaturePayload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function calculateOrderSize(price: number, maxPositionUSDT: number): number {
  return Math.floor((maxPositionUSDT / price) * 1000) / 1000; // Round to 3 decimal places
}

function calculateWinRate(trades: any[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0);
  return (winningTrades.length / trades.length) * 100;
}