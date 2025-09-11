import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TradeSignal {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopLoss?: string;
  takeProfit?: string;
}

interface BybitResponse {
  retCode: number;
  retMsg: string;
  result?: any;
  retExtInfo?: any;
}

// HMAC-SHA256 signature for Bybit API authentication
async function generateSignature(
  timestamp: string, 
  apiKey: string, 
  recv_window: string, 
  queryString: string, 
  apiSecret: string
): Promise<string> {
  const param_str = timestamp + apiKey + recv_window + queryString;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const msgData = encoder.encode(param_str);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function bybitApiCall(
  endpoint: string, 
  method: 'GET' | 'POST', 
  params: any = {}, 
  apiKey: string, 
  apiSecret: string,
  isTestnet: boolean = false
): Promise<BybitResponse> {
  const baseUrl = isTestnet 
    ? 'https://api-testnet.bybit.com' 
    : 'https://api.bybit.com';
    
  const timestamp = Date.now().toString();
  const recv_window = '5000';
  
  let queryString = '';
  let body = '';
  
  if (method === 'GET') {
    queryString = new URLSearchParams(params).toString();
  } else {
    body = JSON.stringify(params);
    queryString = body;
  }
  
  const signature = await generateSignature(timestamp, apiKey, recv_window, queryString, apiSecret);
  
  const headers = {
    'X-BAPI-API-KEY': apiKey,
    'X-BAPI-SIGN': signature,
    'X-BAPI-SIGN-TYPE': '2',
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': recv_window,
    'Content-Type': 'application/json',
  };
  
  const url = `${baseUrl}${endpoint}${method === 'GET' && queryString ? '?' + queryString : ''}`;
  
  console.log(`🔄 Bybit API Call: ${method} ${url}`);
  
  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  });
  
  const result = await response.json();
  console.log(`📊 Bybit Response:`, result);
  
  return result;
}

async function getAccountBalance(apiKey: string, apiSecret: string, isTestnet: boolean): Promise<any> {
  return await bybitApiCall('/v5/account/wallet-balance', 'GET', {
    accountType: 'UNIFIED'
  }, apiKey, apiSecret, isTestnet);
}

async function getPositions(apiKey: string, apiSecret: string, isTestnet: boolean): Promise<any> {
  return await bybitApiCall('/v5/position/list', 'GET', {
    category: 'linear'
  }, apiKey, apiSecret, isTestnet);
}

async function placeOrder(signal: TradeSignal, apiKey: string, apiSecret: string, isTestnet: boolean): Promise<any> {
  const orderParams = {
    category: 'linear',
    symbol: signal.symbol,
    side: signal.side,
    orderType: signal.orderType,
    qty: signal.qty,
    ...(signal.price && { price: signal.price }),
    ...(signal.timeInForce && { timeInForce: signal.timeInForce })
  };
  
  return await bybitApiCall('/v5/order/create', 'POST', orderParams, apiKey, apiSecret, isTestnet);
}

async function setTpSlOrder(
  symbol: string, 
  positionIdx: number, 
  takeProfit?: string, 
  stopLoss?: string,
  apiKey: string, 
  apiSecret: string, 
  isTestnet: boolean
): Promise<any> {
  const params: any = {
    category: 'linear',
    symbol,
    positionIdx
  };
  
  if (takeProfit) params.takeProfit = takeProfit;
  if (stopLoss) params.stopLoss = stopLoss;
  
  return await bybitApiCall('/v5/position/trading-stop', 'POST', params, apiKey, apiSecret, isTestnet);
}

// Risk Management Constants
const WHITELISTED_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 
  'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MANAUSDT', 'CATIUSDT'
];
const MIN_NOTIONAL_USD = 5;
const MAX_SPREAD_BPS = 1000; // 10%
const MAX_FUNDING_RATE = 0.0005; // 0.05% per 8h
const DEFAULT_ATR_SL_MULTIPLIER = 1.3;
const DEFAULT_ATR_TP_MULTIPLIER = 2.6;
const DAILY_LOSS_LIMIT_PERCENT = -1.5;

// Error code mapping for clean user feedback
const ERROR_CODES = {
  10003: 'Invalid API key',
  10004: 'Invalid signature - check API credentials',
  10005: 'Permission denied - enable Trade permission in Bybit',
  110001: 'Invalid price precision',
  110003: 'Invalid quantity precision', 
  110025: 'Below minimum notional amount',
  110026: 'Max leverage exceeded',
  130021: 'Order price out of valid range'
};

function getCleanErrorMessage(retCode: number, retMsg: string): string {
  return ERROR_CODES[retCode] || retMsg || 'Unknown error';
}

// Precision handling
function roundToTickSize(price: number, tickSize: string = '0.01'): string {
  const tick = parseFloat(tickSize);
  return (Math.round(price / tick) * tick).toFixed(tickSize.split('.')[1]?.length || 2);
}

function roundToQtyStep(qty: number, qtyStep: string = '0.001'): string {
  const step = parseFloat(qtyStep);
  return (Math.round(qty / step) * step).toFixed(qtyStep.split('.')[1]?.length || 3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, signal, testMode = true, idempotencyKey, ...params } = await req.json();
    
    // Get environment variables
    const apiKey = Deno.env.get('BYBIT_API_KEY');
    const apiSecret = Deno.env.get('BYBIT_API_SECRET');
    const liveTrading = Deno.env.get('LIVE_TRADING_ENABLED') === 'true';
    const isTestnet = Deno.env.get('BYBIT_TESTNET') === 'true' || testMode || !liveTrading;
    
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Bybit API credentials not configured',
          code: 'MISSING_CREDENTIALS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Master kill switch check
    if (!liveTrading && action === 'place_order') {
      console.log('🔒 Live trading disabled via LIVE_TRADING_ENABLED secret');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Live trading is currently disabled',
          code: 'LIVE_TRADING_DISABLED',
          testMode: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Bybit Live Trading - Action: ${action}, TestMode: ${isTestnet}`);

    let result;

    switch (action) {
      case 'balance':
        result = await getAccountBalance(apiKey, apiSecret, isTestnet);
        break;
        
      case 'positions':
        result = await getPositions(apiKey, apiSecret, isTestnet);
        break;
        
      case 'place_order':
        if (!signal) {
          throw new Error('Signal data required for placing orders');
        }

        // Risk validation
        if (!WHITELISTED_SYMBOLS.includes(signal.symbol)) {
          throw new Error(`Symbol ${signal.symbol} not whitelisted for trading`);
        }

        const notionalValue = parseFloat(signal.qty) * parseFloat(signal.price || '0');
        if (notionalValue < MIN_NOTIONAL_USD) {
          throw new Error(`Order below minimum notional of $${MIN_NOTIONAL_USD}`);
        }

        // Add precision rounding
        if (signal.price) signal.price = roundToTickSize(parseFloat(signal.price));
        signal.qty = roundToQtyStep(parseFloat(signal.qty));
        if (signal.stopLoss) signal.stopLoss = roundToTickSize(parseFloat(signal.stopLoss));
        if (signal.takeProfit) signal.takeProfit = roundToTickSize(parseFloat(signal.takeProfit));
        
        console.log('📋 Placing order with signal:', { ...signal, idempotencyKey });
        result = await placeOrder(signal, apiKey, apiSecret, isTestnet);
        
        // Set TP/SL if provided and order was successful
        if (result.retCode === 0 && (signal.takeProfit || signal.stopLoss)) {
          console.log('🎯 Setting TP/SL for order');
          const tpSlResult = await setTpSlOrder(
            signal.symbol,
            0, // Position index for one-way mode
            signal.takeProfit,
            signal.stopLoss,
            apiKey, 
            apiSecret, 
            isTestnet
          );
          result.tpSlResult = tpSlResult;
        }
        break;
        
      case 'close_position':
        if (!signal?.symbol) {
          throw new Error('Symbol required for closing position');
        }
        
        // Get current position to determine size and side
        const positions = await getPositions(apiKey, apiSecret, isTestnet);
        const position = positions.result?.list?.find((p: any) => p.symbol === signal.symbol);
        
        if (!position || parseFloat(position.size) === 0) {
          throw new Error(`No open position found for ${signal.symbol}`);
        }
        
        // Close position by creating opposite order
        const closeSignal: TradeSignal = {
          symbol: signal.symbol,
          side: position.side === 'Buy' ? 'Sell' : 'Buy',
          orderType: 'Market',
          qty: position.size,
          timeInForce: 'IOC'
        };
        
        result = await placeOrder(closeSignal, apiKey, apiSecret, isTestnet);
        break;
        
      case 'status':
        // Health check endpoint
        result = {
          retCode: 0,
          retMsg: 'OK',
          result: {
            status: 'connected',
            testnet: isTestnet,
            live_trading_enabled: liveTrading,
            whitelisted_symbols: WHITELISTED_SYMBOLS,
            min_notional_usd: MIN_NOTIONAL_USD,
            timestamp: new Date().toISOString()
          }
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const success = result.retCode === 0;
    const cleanMessage = success ? result.retMsg : getCleanErrorMessage(result.retCode, result.retMsg);
    
    return new Response(
      JSON.stringify({
        success,
        data: result.result,
        message: cleanMessage,
        retCode: result.retCode,
        testMode: isTestnet,
        live_trading_enabled: liveTrading,
        ...(idempotencyKey && { idempotencyKey })
      }),
      { 
        status: success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Bybit Live Trading Error:', error);
    
    // Map common errors to user-friendly messages
    let userMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.message.includes('fetch')) {
      userMessage = 'Network error - please try again';
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timeout - exchange may be busy';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message.includes('not whitelisted')) {
      errorCode = 'SYMBOL_NOT_WHITELISTED';
    } else if (error.message.includes('minimum notional')) {
      errorCode = 'BELOW_MIN_NOTIONAL';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: userMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});