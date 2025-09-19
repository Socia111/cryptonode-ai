import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Type definitions matching the frontend interfaces
interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty?: number;
  amount_usd?: number;
  leverage?: number;
  
  user_id?: string;
  signal_id?: string;
  order_type?: 'Market' | 'Limit';
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  reduce_only?: boolean;
}

interface TradeExecutionResult {
  success: boolean;
  trade_id?: string;
  
  result: any;
  message: string;
  execution_time_ms?: number;
  avg_price?: string;
  executed_qty?: string;
  error_code?: string;
  retry_count?: number;
}

interface BybitCredentials {
  api_key: string;
  api_secret: string;
  testnet: boolean;
}

async function getUserCredentials(userId: string): Promise<BybitCredentials | null> {
  try {
    console.log(`🔍 Fetching credentials for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('user_trading_accounts')
      .select('api_key_encrypted, api_secret_encrypted, account_type')
      .eq('user_id', userId)
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('❌ No user credentials found:', error?.message);
      return null;
    }

    // Note: In production, these should be properly encrypted/decrypted
    // For now, we're storing them as plain text (not recommended for production)
    console.log(`✅ Found user credentials for ${data.account_type} account`);
    
    return {
      api_key: data.api_key_encrypted,
      api_secret: data.api_secret_encrypted,
      testnet: data.account_type === 'testnet'
    };
  } catch (error) {
    console.error('❌ Error fetching user credentials:', error);
    return null;
  }
}

async function getSystemCredentials(): Promise<BybitCredentials> {
  const isTestnet = Deno.env.get('PAPER_TRADING') === 'true' || Deno.env.get('BYBIT_TESTNET') === 'true';
  const apiKey = Deno.env.get('BYBIT_API_KEY') || '';
  const apiSecret = Deno.env.get('BYBIT_API_SECRET') || '';
  
  console.log(`🔧 Using system credentials for ${isTestnet ? 'testnet' : 'mainnet'}`);
  console.log(`🔑 System API key available: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!apiKey || !apiSecret) {
    throw new Error('System credentials not configured. Please set BYBIT_API_KEY and BYBIT_API_SECRET environment variables.');
  }
  
  return {
    api_key: apiKey,
    api_secret: apiSecret,
    testnet: isTestnet
  };
}

function createBybitSignature(params: string, secret: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(timestamp + 'BYBIT_API_KEY' + '5000' + params);
  const key = encoder.encode(secret);
  
  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => 
    crypto.subtle.sign('HMAC', cryptoKey, data)
  ).then(signature => 
    Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

async function executeBybitTrade(trade: TradeRequest, credentials: BybitCredentials) {
  const timestamp = Date.now().toString();
  const baseUrl = credentials.testnet 
    ? 'https://api-testnet.bybit.com' 
    : 'https://api.bybit.com';

  // Validate symbol is provided
  if (!trade.symbol) {
    throw new Error('Symbol is required for trade execution');
  }

  const symbol = trade.symbol.replace('/', '').toUpperCase();
  console.log(`🔄 Executing ${trade.side} trade for ${symbol}`);

  // 1. Use simplified symbol validation (skip external validator for now)
  const minQty = 0.001;
  const qtyStep = 0.001;
  const tickSize = 0.01;
  const minNotional = 5; // Minimum notional value in USDT
  console.log(`📊 Using default symbol info: minQty=${minQty}, qtyStep=${qtyStep}, tickSize=${tickSize}, minNotional=${minNotional}`);

  // 2. Calculate quantity if amount_usd is provided
  let qty = trade.qty;
  let currentPrice = 0;

  if (!qty && trade.amount_usd) {
    // Get current price to calculate qty
    const priceResponse = await fetch(`${baseUrl}/v5/market/tickers?category=linear&symbol=${symbol}`);
    const priceData = await priceResponse.json();
    
    if (priceData.retCode === 0 && priceData.result.list.length > 0) {
      currentPrice = parseFloat(priceData.result.list[0].lastPrice);
      qty = trade.amount_usd / currentPrice;
      
      // Apply quantity precision based on qtyStep
      const qtyStepPrecision = qtyStep.toString().split('.')[1]?.length || 0;
      qty = Math.floor(qty / parseFloat(qtyStep)) * parseFloat(qtyStep);
      qty = parseFloat(qty.toFixed(qtyStepPrecision));
      
      console.log(`💰 Calculated qty: ${qty} (price: ${currentPrice}, amount: ${trade.amount_usd})`);
    } else {
      throw new Error('Could not fetch current price for quantity calculation');
    }
  }

  // 3. Validate calculated quantity
  if (!qty || qty < minQty) {
    throw new Error(`Quantity ${qty} is below minimum ${minQty} for ${symbol}`);
  }

  // 4. Calculate notional value for validation
  const notionalValue = qty * (currentPrice || 1);
  if (notionalValue < minNotional) {
    throw new Error(`Notional value ${notionalValue} is below minimum ${minNotional} for ${symbol}`);
  }

  // 5. Create order parameters with proper precision
  const orderParams = {
    category: 'linear',
    symbol: symbol,
    side: trade.side,
    orderType: 'Market',
    qty: qty.toString(),
    timeInForce: 'IOC'
  };

  console.log(`📋 Order params:`, orderParams);

  const paramsString = Object.entries(orderParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = await createBybitSignature(paramsString, credentials.api_secret, timestamp);

  console.log(`🔐 Sending order to ${baseUrl}/v5/order/create`);

  const response = await fetch(`${baseUrl}/v5/order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': credentials.api_key,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000'
    },
    body: JSON.stringify(orderParams)
  });

  const result = await response.json();
  console.log(`📊 Bybit response:`, result);
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, ...payload } = requestBody;
    
    console.log('🎯 Trade executor request:', { action, hasPayload: !!payload });

    switch (action) {
      case 'execute_trade': {
        const trade: TradeRequest = payload;
        
        console.log('🎯 Trade execution request:', {
          symbol: trade.symbol,
          side: trade.side,
          qty: trade.qty,
          amount_usd: trade.amount_usd,
          user_id: trade.user_id ? 'provided' : 'system',
          paper_mode: trade.paper_mode
        });

        // Live trading only - paper trading removed
        const liveTradeEnabled = Deno.env.get('LIVE_TRADING_ENABLED') === 'true';
        
        if (!liveTradeEnabled) {
          throw new Error('Live trading is disabled');
        }
        
        let result;
        let credentials = null;
        const startTime = Date.now();

        // Execute live trade only
        console.log('💰 Executing live trade...');
        
        // Get credentials with user preference first, then system fallback
        if (trade.user_id) {
          console.log('🔍 Attempting to use user credentials...');
          credentials = await getUserCredentials(trade.user_id);
        }
        
        if (!credentials) {
          console.log('🔧 Falling back to system credentials...');
          credentials = await getSystemCredentials();
        }

        result = await executeBybitTrade(trade, credentials);

        const executionTime = Date.now() - startTime;

        // Enhanced trade logging with more details
        const logData = {
          user_id: trade.user_id || '00000000-0000-0000-0000-000000000000',
          symbol: trade.symbol,
          side: trade.side,
          qty: trade.qty || (result.result?.cumExecQty ? parseFloat(result.result.cumExecQty) : null),
          amount_usd: trade.amount_usd,
          leverage: trade.leverage || 1,
          paper_mode: false, // Live trading only
          status: result.retCode === 0 ? 'executed' : 'failed',
          exchange_order_id: result.result?.orderId || null,
          ret_code: result.retCode,
          ret_msg: result.retMsg,
          raw_response: result,
          execution_time_ms: executionTime,
          avg_price: result.result?.avgPrice || result.result?.price || null,
          credentials_source: credentials ? (trade.user_id ? 'user' : 'system') : 'none'
        };

        const { error: logError } = await supabase
          .from('execution_orders')
          .insert(logData);

        if (logError) {
          console.error('❌ Failed to log trade execution:', logError);
        } else {
          console.log('📊 Trade logged successfully');
        }

        const responseData = {
          success: result.retCode === 0,
          trade_id: result.result?.orderId || result.result?.orderLinkId,
          paper_mode: false, // Live trading only
          result: result,
          message: result.retMsg || 'Trade executed successfully',
          execution_time_ms: executionTime,
          avg_price: result.result?.avgPrice || result.result?.price || null,
          executed_qty: result.result?.cumExecQty || result.result?.qty || null
        };

        console.log('✅ Trade execution completed:', {
          success: responseData.success,
          trade_id: responseData.trade_id,
          paper_mode: responseData.paper_mode,
          execution_time: `${executionTime}ms`
        });

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'validate_credentials': {
        const { user_id } = payload;
        
        let credentials = null;
        if (user_id) {
          credentials = await getUserCredentials(user_id);
        }
        
        if (!credentials) {
          credentials = await getSystemCredentials();
        }

        const hasValidCredentials = !!(credentials?.api_key && credentials?.api_secret);

        return new Response(JSON.stringify({
          success: true,
          has_credentials: hasValidCredentials,
          testnet: credentials?.testnet || false,
          paper_mode: Deno.env.get('PAPER_TRADING') === 'true'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        return new Response(JSON.stringify({
          success: true,
          status: 'active',
          paper_mode: Deno.env.get('PAPER_TRADING') === 'true',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in trade executor:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});