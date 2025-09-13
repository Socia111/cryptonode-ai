import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

class BybitClient {
  private baseURL: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string, testnet = true) {
    this.baseURL = testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async sign(params: any): Promise<string> {
    const timestamp = Date.now().toString();
    const paramString = JSON.stringify(params);
    const message = timestamp + this.apiKey + '5000' + paramString;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async request(method: string, endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const signature = await this.sign(params);
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers,
      ...(method !== 'GET' && { body: JSON.stringify(params) })
    });

    const data = await response.json();
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    return data;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, symbol, side, amountUSD, leverage = 25 } = requestBody;

    console.log('🚀 Trade executor request:', { action, symbol, side, amountUSD, leverage });

    // Handle status check
    if (action === 'status') {
      return jsonResponse({
        ok: true,
        status: 'operational',
        environment: 'testnet',
        timestamp: new Date().toISOString()
      });
    }

    // Handle trade execution
    if (action === 'place_order' || action === 'signal') {
      if (!symbol || !side || !amountUSD) {
        return jsonResponse({
          success: false,
          error: 'Missing required fields: symbol, side, amountUSD'
        }, 400);
      }

      // Check if paper trading mode
      const isPaperMode = Deno.env.get('PAPER_TRADING') === 'true';
      
      if (isPaperMode) {
        console.log('📝 Paper trading mode - simulating execution');
        
        const mockOrderId = `PAPER_${Date.now()}`;
        const mockPrice = Math.random() * 100 + 50;
        const mockQty = (amountUSD * leverage / mockPrice).toFixed(6);
        
        return jsonResponse({
          success: true,
          data: {
            orderId: mockOrderId,
            symbol,
            side,
            qty: mockQty,
            price: mockPrice,
            amount: amountUSD,
            leverage,
            status: 'FILLED',
            paperMode: true,
            message: 'Paper trade executed - no real money involved'
          }
        });
      }

      // Real trading
      const apiKey = Deno.env.get('BYBIT_API_KEY');
      const apiSecret = Deno.env.get('BYBIT_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        return jsonResponse({
          success: false,
          error: 'Bybit API credentials not configured'
        }, 400);
      }

      const client = new BybitClient(apiKey, apiSecret, true); // Always use testnet for safety

      try {
        // Get current price
        const tickerResponse = await fetch(`https://api-testnet.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
        const tickerData = await tickerResponse.json();
        const currentPrice = parseFloat(tickerData.result?.list?.[0]?.lastPrice || '50000');

        // Calculate quantity
        const targetNotional = amountUSD * leverage;
        const quantity = (targetNotional / currentPrice).toFixed(6);

        console.log('💰 Order calculation:', {
          symbol,
          side,
          currentPrice,
          quantity,
          leverage,
          targetNotional
        });

        // Place market order
        const orderParams = {
          category: 'linear',
          symbol,
          side,
          orderType: 'Market',
          qty: quantity,
          leverage: leverage.toString(),
          positionIdx: 0,
          reduceOnly: false
        };

        const orderResult = await client.request('POST', '/v5/order/create', orderParams);
        
        console.log('✅ Order placed successfully:', orderResult.result);

        return jsonResponse({
          success: true,
          data: {
            orderId: orderResult.result.orderId,
            symbol,
            side,
            qty: quantity,
            price: currentPrice,
            amount: amountUSD,
            leverage,
            status: 'NEW',
            testnet: true
          }
        });

      } catch (error: any) {
        console.error('❌ Trade execution error:', error);
        return jsonResponse({
          success: false,
          error: error.message || 'Trade execution failed'
        }, 500);
      }
    }

    return jsonResponse({
      success: false,
      error: 'Invalid action. Use "status", "place_order", or "signal"'
    }, 400);

  } catch (error: any) {
    console.error('❌ Request processing error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Internal server error'
    }, 500);
  }
});