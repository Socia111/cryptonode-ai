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
      const useTestnet = Deno.env.get('BYBIT_TESTNET') === 'true';
      // FORCE DISABLE PAPER TRADING
      const isPaperMode = false; // Deno.env.get('PAPER_TRADING') === 'true';
      
      return jsonResponse({
        ok: true,
        status: 'operational',
        environment: useTestnet ? 'testnet' : 'mainnet',
        paper_mode: isPaperMode,
        real_trading: true,
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

      // Get API credentials
      const apiKey = Deno.env.get('BYBIT_API_KEY');
      const apiSecret = Deno.env.get('BYBIT_API_SECRET');
      
      // Check credentials first
      if (!apiKey || !apiSecret) {
        return jsonResponse({
          success: false,
          error: 'Bybit API credentials not configured. Please add BYBIT_API_KEY and BYBIT_API_SECRET in edge function secrets.'
        }, 400);
      }

      // FORCE DISABLE PAPER TRADING - ENABLE REAL TRADING
      const isPaperMode = false; // Deno.env.get('PAPER_TRADING') === 'true';
      
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

      // Real trading - use mainnet unless testnet is explicitly enabled
      const useTestnet = Deno.env.get('BYBIT_TESTNET') === 'true';
      const client = new BybitClient(apiKey, apiSecret, useTestnet);
      const baseURL = useTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';

      try {
        // Get current price from the appropriate environment
        const tickerResponse = await fetch(`${baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`);
        const tickerData = await tickerResponse.json();
        const currentPrice = parseFloat(tickerData.result?.list?.[0]?.lastPrice || '50000');

        // Calculate quantity with proper validation
        const targetNotional = amountUSD * leverage;
        let quantity = targetNotional / currentPrice;
        
        // Get instrument info for proper quantity formatting
        let instrumentInfo;
        try {
          const instrResponse = await fetch(`${baseURL}/v5/market/instruments-info?category=linear&symbol=${symbol}`);
          const instrData = await instrResponse.json();
          instrumentInfo = instrData.result?.list?.[0];
        } catch (e) {
          console.warn('Could not get instrument info, using defaults');
        }
        
        // Apply proper quantity step and minimums
        if (instrumentInfo) {
          const qtyStep = parseFloat(instrumentInfo.lotSizeFilter?.qtyStep || '0.001');
          const minOrderQty = parseFloat(instrumentInfo.lotSizeFilter?.minOrderQty || '0.001');
          
          // Round to step size
          quantity = Math.floor(quantity / qtyStep) * qtyStep;
          
          // Ensure minimum quantity
          quantity = Math.max(quantity, minOrderQty);
          
          // Format to appropriate decimal places
          const stepDecimals = qtyStep.toString().split('.')[1]?.length || 3;
          quantity = parseFloat(quantity.toFixed(stepDecimals));
        } else {
          // Fallback formatting
          quantity = parseFloat(quantity.toFixed(3));
          quantity = Math.max(quantity, 0.001); // Minimum fallback
        }

        console.log('💰 Order calculation:', {
          symbol,
          side,
          currentPrice,
          targetNotional,
          calculatedQty: quantity,
          leverage,
          instrumentInfo: instrumentInfo ? 'found' : 'not found'
        });

        // Place market order with position index for One-Way mode
        const orderParams = {
          category: 'linear',
          symbol,
          side,
          orderType: 'Market',
          qty: quantity.toString(),
          positionIdx: 0, // 0 for One-Way mode (which we just set above)
          reduceOnly: false
        };

        // First, set position mode to One-Way (safer and more reliable)
        try {
          const positionModeParams = {
            category: 'linear',
            coin: symbol.replace('USDT', ''), // Extract base coin (e.g., BTC from BTCUSDT)
            mode: 0 // 0 = One-Way mode, 3 = Hedge mode
          };
          
          console.log('🔧 Setting position mode to One-Way:', positionModeParams);
          await client.request('POST', '/v5/position/switch-mode', positionModeParams);
          console.log('✅ Position mode set to One-Way');
        } catch (modeError: any) {
          // Position mode might already be set correctly
          console.warn('⚠️ Position mode setting failed (may already be correct):', modeError.message);
        }

        // Set leverage (required for position trading)
        try {
          const leverageParams = {
            category: 'linear',
            symbol,
            buyLeverage: leverage.toString(),
            sellLeverage: leverage.toString()
          };
          
          console.log('⚙️ Setting leverage:', leverageParams);
          await client.request('POST', '/v5/position/set-leverage', leverageParams);
          console.log('✅ Leverage set successfully');
        } catch (leverageError: any) {
          // Leverage setting might fail if already set, continue anyway
          console.warn('⚠️ Leverage setting failed (may already be set):', leverageError.message);
        }

        const orderResult = await client.request('POST', '/v5/order/create', orderParams);
        
        console.log('✅ Order placed successfully:', orderResult.result);

        return jsonResponse({
          success: true,
          data: {
            orderId: orderResult.result.orderId,
            symbol,
            side,
            qty: quantity.toString(),
            price: currentPrice,
            amount: amountUSD,
            leverage,
            status: 'NEW',
            environment: useTestnet ? 'testnet' : 'mainnet',
            realTrade: true,
            targetNotional: targetNotional
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