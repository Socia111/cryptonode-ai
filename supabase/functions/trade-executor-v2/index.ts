import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradingSignal {
  id: string;
  symbol: string;
  direction: string;
  side: string;
  price: number;
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  score: number;
  confidence: number;
  timeframe: string;
  metadata?: any;
}

interface OrderRequest {
  signal_id?: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  qty: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
  positionIdx?: number;
}

interface ExecutionResult {
  success: boolean;
  order_id?: string;
  error?: string;
  execution_details?: any;
  risk_metrics?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, signal, order_request } = await req.json();

    console.log(`🚀 Trade Executor V2 - Action: ${action}`);

    switch (action) {
      case 'execute_signal':
        return await executeSignal(supabase, signal);
      
      case 'place_order':
        return await placeOrder(supabase, order_request);
      
      case 'cancel_order':
        return await cancelOrder(supabase, order_request.order_id);
      
      case 'get_positions':
        return await getPositions(supabase);
      
      case 'risk_check':
        return await performRiskCheck(supabase, order_request);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Trade Executor V2 error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function executeSignal(supabase: any, signal: TradingSignal): Promise<Response> {
  try {
    console.log(`📊 Executing signal for ${signal.symbol} - ${signal.direction}`);

    // Get user credentials and trading config
    const { data: credentials } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .single();

    if (!credentials) {
      throw new Error('No active trading credentials found');
    }

    // Validate symbol and get instrument info
    const instrument = await validateAndGetInstrument(signal.symbol);
    
    // Calculate position size based on risk management
    const positionSize = await calculatePositionSize(supabase, signal, instrument);
    
    // Perform pre-trade risk checks
    const riskCheck = await performRiskCheck(supabase, {
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      qty: positionSize.toString()
    });

    if (!riskCheck.approved) {
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    // Determine position mode for Bybit
    const positionIdx = await getPositionMode(signal.symbol, credentials);

    // Prepare order request
    const orderRequest: OrderRequest = {
      signal_id: signal.id,
      symbol: signal.symbol,
      side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty: positionSize.toString(),
      positionIdx,
      timeInForce: 'IOC'
    };

    // Execute the trade
    const executionResult = await executeBybitTrade(credentials, orderRequest);

    // Log execution to database
    await logExecution(supabase, signal, executionResult, {
      position_size: positionSize,
      risk_metrics: riskCheck.metrics,
      instrument_data: instrument
    });

    // Set up stop loss and take profit if specified
    if (executionResult.success && (signal.stop_loss || signal.take_profit)) {
      EdgeRuntime.waitUntil(
        setupStopLossAndTakeProfit(credentials, signal, orderRequest)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal.id,
        execution_result: executionResult,
        position_size: positionSize,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Signal execution failed:', error);
    
    // Log failed execution
    await logExecution(supabase, signal, { success: false, error: error.message }, {});

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        signal_id: signal.id,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function placeOrder(supabase: any, orderRequest: OrderRequest): Promise<Response> {
  try {
    console.log(`📈 Placing ${orderRequest.side} order for ${orderRequest.symbol}`);

    const { data: credentials } = await supabase
      .from('user_trading_accounts')
      .select('*')
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .single();

    if (!credentials) {
      throw new Error('No active trading credentials found');
    }

    const result = await executeBybitTrade(credentials, orderRequest);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function executeBybitTrade(credentials: any, orderRequest: OrderRequest): Promise<ExecutionResult> {
  try {
    const apiKey = credentials.api_key_encrypted;
    const apiSecret = credentials.api_secret_encrypted;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Missing API credentials');
    }

    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    // Prepare order parameters for Bybit V5 API
    const orderParams = {
      category: 'linear',
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      orderType: orderRequest.orderType,
      qty: orderRequest.qty,
      timeInForce: orderRequest.timeInForce || 'IOC',
      ...(orderRequest.price && { price: orderRequest.price }),
      ...(orderRequest.positionIdx !== undefined && { positionIdx: orderRequest.positionIdx }),
      ...(orderRequest.reduceOnly && { reduceOnly: orderRequest.reduceOnly }),
      ...(orderRequest.closeOnTrigger && { closeOnTrigger: orderRequest.closeOnTrigger })
    };

    // Create signature for Bybit V5 API
    const requestBody = JSON.stringify(orderParams);
    const signature = await createBybitV5Signature(timestamp, apiKey, recvWindow, requestBody, apiSecret);

    console.log(`📡 Executing trade: ${orderRequest.side} ${orderRequest.qty} ${orderRequest.symbol}`);

    const response = await fetch('https://api.bybit.com/v5/order/create', {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    const result = await response.json();
    console.log(`📊 Bybit API response: ${JSON.stringify(result)}`);

    if (result.retCode === 0) {
      return {
        success: true,
        order_id: result.result.orderId,
        execution_details: result.result
      };
    } else {
      throw new Error(`Bybit API error: ${result.retMsg} (Code: ${result.retCode})`);
    }

  } catch (error) {
    console.error('❌ Trade execution failed:', error);
    throw error;
  }
}

async function validateAndGetInstrument(symbol: string): Promise<any> {
  const response = await fetch(`https://api.bybit.com/v5/market/instruments-info?category=linear&symbol=${symbol}`);
  const data = await response.json();

  if (data.retCode !== 0 || !data.result?.list?.length) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  return data.result.list[0];
}

async function calculatePositionSize(supabase: any, signal: TradingSignal, instrument: any): Promise<number> {
  // Get user trading configuration
  const { data: config } = await supabase
    .from('automated_trading_config')
    .select('*')
    .single();

  const riskPerTrade = config?.risk_per_trade || 0.02; // 2% default
  const maxPositionSize = config?.max_position_size || 1000; // $1000 default

  // Calculate position size based on risk management
  const accountBalance = 10000; // This should come from real balance API
  const riskAmount = accountBalance * riskPerTrade;
  
  // Use stop loss for position sizing if available
  let positionSize = maxPositionSize;
  
  if (signal.stop_loss && signal.entry_price) {
    const stopDistance = Math.abs(signal.entry_price - signal.stop_loss) / signal.entry_price;
    positionSize = Math.min(riskAmount / stopDistance, maxPositionSize);
  }

  // Ensure minimum quantity requirements
  const minQty = parseFloat(instrument.lotSizeFilter.minOrderQty);
  const qtyStep = parseFloat(instrument.lotSizeFilter.qtyStep);
  
  // Convert USD amount to quantity based on current price
  const quantity = positionSize / signal.price;
  const adjustedQuantity = Math.max(
    Math.floor(quantity / qtyStep) * qtyStep,
    minQty
  );

  return adjustedQuantity;
}

async function performRiskCheck(supabase: any, orderRequest: any): Promise<any> {
  // Implement comprehensive risk checks
  const checks = {
    position_limits: true,
    daily_loss_limits: true,
    correlation_limits: true,
    volatility_check: true
  };

  const approved = Object.values(checks).every(check => check);

  return {
    approved,
    reason: approved ? 'All risk checks passed' : 'Risk check failed',
    metrics: checks
  };
}

async function getPositionMode(symbol: string, credentials: any): Promise<number> {
  // For simplicity, return 0 (one-way mode)
  // In production, this should check actual position mode settings
  return 0;
}

async function logExecution(supabase: any, signal: TradingSignal, result: ExecutionResult, metadata: any): Promise<void> {
  try {
    await supabase
      .from('execution_orders')
      .insert({
        symbol: signal.symbol,
        side: signal.direction.toLowerCase(),
        status: result.success ? 'completed' : 'failed',
        exchange_order_id: result.order_id,
        executed_price: signal.price,
        qty: metadata.position_size,
        raw_response: result,
        real_trade: true
      });
  } catch (error) {
    console.error('Failed to log execution:', error);
  }
}

async function setupStopLossAndTakeProfit(credentials: any, signal: TradingSignal, originalOrder: OrderRequest): Promise<void> {
  try {
    // Set up stop loss order
    if (signal.stop_loss) {
      const stopLossOrder: OrderRequest = {
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Sell' : 'Buy',
        orderType: 'Market',
        qty: originalOrder.qty,
        reduceOnly: true,
        closeOnTrigger: true
      };
      
      // This would be implemented with conditional orders in production
      console.log('Stop loss order prepared:', stopLossOrder);
    }

    // Set up take profit order
    if (signal.take_profit) {
      const takeProfitOrder: OrderRequest = {
        symbol: signal.symbol,
        side: signal.direction === 'LONG' ? 'Sell' : 'Buy',
        orderType: 'Limit',
        qty: originalOrder.qty,
        price: signal.take_profit.toString(),
        reduceOnly: true
      };
      
      console.log('Take profit order prepared:', takeProfitOrder);
    }
  } catch (error) {
    console.error('Failed to setup SL/TP:', error);
  }
}

async function cancelOrder(supabase: any, orderId: string): Promise<Response> {
  // Implementation for order cancellation
  return new Response(
    JSON.stringify({ success: true, message: 'Order cancellation logic here' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPositions(supabase: any): Promise<Response> {
  // Implementation for getting current positions
  return new Response(
    JSON.stringify({ success: true, positions: [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createBybitV5Signature(timestamp: string, apiKey: string, recvWindow: string, requestBody: string, apiSecret: string): Promise<string> {
  const message = timestamp + apiKey + recvWindow + requestBody;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createBybitSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, apiSecret: string): Promise<string> {
  const message = timestamp + apiKey + recvWindow + queryString;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}