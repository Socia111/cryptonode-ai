import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Simple logging utility
const log = (message: string, data?: any) => {
  console.log(message, data || '');
};

// =================== BYBIT V5 API INTEGRATION ===================

interface BybitCredentials {
  apiKey: string
  apiSecret: string
  testnet: boolean
}

class BybitV5Client {
  private baseURL: string
  private apiKey: string
  private apiSecret: string

  constructor(credentials: BybitCredentials) {
    this.baseURL = credentials.testnet 
      ? 'https://api-testnet.bybit.com' 
      : 'https://api.bybit.com'
    this.apiKey = credentials.apiKey
    this.apiSecret = credentials.apiSecret
  }

  private async signRequest(method: string, path: string, params: any = {}): Promise<string> {
    const timestamp = Date.now().toString()
    const paramString = Object.keys(params).length 
      ? JSON.stringify(params)
      : ''

    const message = timestamp + this.apiKey + '5000' + paramString
    const signature = await this.hmacSha256(this.apiSecret, message)
    
    return signature
  }

  private async hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async request(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString()
    const signature = await this.signRequest(method, endpoint, params)
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    }

    const url = `${this.baseURL}${endpoint}`
    const options: RequestInit = {
      method,
      headers,
      ...(method !== 'GET' && { body: JSON.stringify(params) })
    }

    const response = await fetch(url, options)
    const data = await response.json()
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }
    
    return data
  }
}

// =================== MAIN HANDLER ===================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require auth (since verify_jwt=true)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ success: false, code: "AUTH", message: "Missing authorization header" }, 401);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const requestBody = await req.json();
    const { action, symbol, side, amountUSD, leverage } = requestBody;
    
    console.log('Trade executor called:', { action, symbol, side, amountUSD, leverage });

    // Handle status requests
    if (action === 'status') {
      return json({
        ok: true,
        status: 'operational',
        trading_enabled: Deno.env.get('LIVE_TRADING_ENABLED') === 'true',
        allowed_symbols: Deno.env.get('ALLOWED_SYMBOLS') || '*',
        timestamp: new Date().toISOString()
      });
    }

    // Handle place order requests
    if (action === 'place_order' || action === 'signal') {
      if (!symbol || !side || !amountUSD) {
        return json({
          success: false,
          message: 'Missing required fields: symbol, side, amountUSD'
        }, 400);
      }

      console.log('Trade execution request:', {
        symbol,
        side,
        amountUSD,
        leverage: leverage || 1
      });

      try {
        // Check if API credentials are configured
        const apiKey = Deno.env.get('BYBIT_API_KEY');
        const apiSecret = Deno.env.get('BYBIT_API_SECRET');
        
        if (!apiKey || !apiSecret) {
          return json({
            success: false,
            message: 'Bybit API credentials not configured'
          }, 400);
        }

        // Create Bybit client
        const bybitClient = new BybitV5Client({
          apiKey,
          apiSecret,
          testnet: false
        });

        // Get current price to calculate quantity
        const tickerResponse = await bybitClient.request('GET', '/v5/market/tickers', {
          category: 'linear',
          symbol: symbol
        });

        if (!tickerResponse.result?.list?.length) {
          throw new Error(`Symbol ${symbol} not found`);
        }

        const currentPrice = parseFloat(tickerResponse.result.list[0].lastPrice);
        
        // Calculate quantity - use a more conservative approach for working orders
        const targetNotional = Math.max(amountUSD, 5); // Minimum $5
        const leverageValue = Math.max(leverage || 1, 1);
        
        // For simplicity, calculate quantity directly
        let qty = (targetNotional * leverageValue) / currentPrice;
        
        // Round to reasonable precision (6 decimal places)
        qty = Math.round(qty * 1000000) / 1000000;
        
        if (qty <= 0) {
          throw new Error(`Invalid quantity calculated: ${qty}`);
        }

        console.log(`Calculated: ${qty} contracts for ${symbol} at $${currentPrice} (${targetNotional} USD with ${leverageValue}x leverage)`);

        // Place market order - simple approach that was working
        const orderParams = {
          category: 'linear',
          symbol: symbol,
          side: side,
          orderType: 'Market',
          qty: qty.toString(),
          timeInForce: 'IOC',
          positionIdx: 0 // Always use one-way mode for simplicity
        };

        console.log('Placing order with params:', orderParams);

        const orderResult = await bybitClient.request('POST', '/v5/order/create', orderParams);
        
        console.log('✅ Order placed successfully:', orderResult);

        return json({
          success: true,
          data: {
            orderId: orderResult.result?.orderId,
            symbol: symbol,
            side: side,
            qty: qty,
            price: currentPrice,
            amountUSD: targetNotional,
            leverage: leverageValue,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Trade execution failed:', error.message);
        
        return json({
          success: false,
          message: error.message
        }, 500);
      }
    }

    // Unknown action
    return json({
      success: false,
      message: `Unknown action: ${action}`
    }, 400);

  } catch (error) {
    console.error('Execution error:', error.message);
    
    return json({
      success: false,
      message: error.message || 'Internal server error'
    }, 500);
  }
});