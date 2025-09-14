import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bybit API configuration
const BYBIT_API_KEY = Deno.env.get('BYBIT_API_KEY')!;
const BYBIT_API_SECRET = Deno.env.get('BYBIT_API_SECRET')!;
const BYBIT_BASE_URL = 'https://api.bybit.com';

interface TradeRequest {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  sl: number;
  tp: number;
  quantity: number;
}

class BybitTrader {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(apiKey: string, apiSecret: string, baseUrl: string = BYBIT_BASE_URL) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  private async createSignature(timestamp: string, method: string, path: string, params: string): Promise<string> {
    const message = timestamp + this.apiKey + method + path + params;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.apiSecret),
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

  private async makeRequest(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const path = endpoint;
    const queryString = method === 'GET' ? new URLSearchParams(params).toString() : '';
    const body = method !== 'GET' ? JSON.stringify(params) : '';
    
    const signature = await this.createSignature(
      timestamp,
      method,
      path,
      method === 'GET' ? queryString : body
    );

    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    };

    const url = this.baseUrl + path + (queryString ? '?' + queryString : '');
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.retCode !== 0) {
        let errorMessage = data.retMsg || 'Unknown API error';
        
        switch (data.retCode) {
          case 10010:
            errorMessage = `IP restriction: Please whitelist Supabase IPs in your Bybit API settings`;
            break;
          case 10003:
            errorMessage = 'Invalid API key. Please check your credentials.';
            break;
          case 170130:
            errorMessage = 'Insufficient wallet balance for this trade.';
            break;
        }
        
        throw new Error(`Bybit API error (${data.retCode}): ${errorMessage}`);
      }
      
      return data;
    } catch (error) {
      console.error('Bybit API request failed:', { endpoint, method, error });
      throw error;
    }
  }

  async getAccountBalance(): Promise<any> {
    return this.makeRequest('GET', '/v5/account/wallet-balance', {
      accountType: 'UNIFIED'
    });
  }

  async placeOrder(orderParams: {
    symbol: string;
    side: 'Buy' | 'Sell';
    orderType: 'Market' | 'Limit';
    qty: string;
    price?: string;
    stopLoss?: string;
    takeProfit?: string;
  }): Promise<any> {
    const params = {
      category: 'linear', // Use futures for better liquidity
      symbol: orderParams.symbol,
      side: orderParams.side,
      orderType: orderParams.orderType,
      qty: orderParams.qty,
      timeInForce: 'IOC', // Immediate or Cancel for market orders
      ...(orderParams.price && { price: orderParams.price }),
      ...(orderParams.stopLoss && { 
        stopLoss: orderParams.stopLoss,
        slTriggerBy: 'LastPrice',
        slOrderType: 'Market'
      }),
      ...(orderParams.takeProfit && { 
        takeProfit: orderParams.takeProfit,
        tpTriggerBy: 'LastPrice',
        tpOrderType: 'Market'
      }),
    };

    return this.makeRequest('POST', '/v5/order/create', params);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tradeRequest: TradeRequest = await req.json();
    
    console.log('🚀 Manual trade execution request received:', tradeRequest);

    // Validate required fields
    if (!tradeRequest.symbol || !tradeRequest.direction || !tradeRequest.quantity) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: symbol, direction, or quantity' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API credentials
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Bybit API credentials not configured' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trader = new BybitTrader(BYBIT_API_KEY, BYBIT_API_SECRET);

    // Prepare order parameters
    const symbol = tradeRequest.symbol.replace('/', '');
    const side = tradeRequest.direction === 'LONG' ? 'Buy' : 'Sell';
    const quantity = tradeRequest.quantity.toFixed(6);

    console.log('📊 Executing order:', {
      symbol,
      side,
      quantity,
      stopLoss: tradeRequest.sl,
      takeProfit: tradeRequest.tp
    });

    // Execute the trade
    const orderResult = await trader.placeOrder({
      symbol,
      side,
      orderType: 'Market',
      qty: quantity,
      stopLoss: tradeRequest.sl?.toString(),
      takeProfit: tradeRequest.tp?.toString()
    });

    if (orderResult.result) {
      console.log('✅ Trade executed successfully:', orderResult.result);
      
      return new Response(
        JSON.stringify({
          success: true,
          orderId: orderResult.result.orderId,
          symbol: tradeRequest.symbol,
          side: tradeRequest.direction,
          quantity: tradeRequest.quantity,
          message: `${tradeRequest.direction} order placed for ${tradeRequest.symbol}`,
          details: orderResult.result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Order placement failed - no result returned');
    }

  } catch (error) {
    console.error('❌ Manual trade execution failed:', error);
    
    let errorMessage = 'Trade execution failed';
    let helpText = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('Unmatched IP')) {
        helpText = 'Please remove IP restrictions from your Bybit API key or whitelist Supabase IPs';
      } else if (errorMessage.includes('Invalid API')) {
        helpText = 'Check your Bybit API credentials in Edge Function secrets';
      } else if (errorMessage.includes('Insufficient balance')) {
        helpText = 'Ensure you have sufficient USDT balance in your Bybit account';
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        help: helpText,
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});