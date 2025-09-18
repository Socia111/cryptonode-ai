import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty?: number;
  amount_usd?: number;
  leverage?: number;
  paper_mode?: boolean;
  user_id?: string;
  signal_id?: string;
}

interface BybitCredentials {
  api_key: string;
  api_secret: string;
  testnet: boolean;
}

async function getUserCredentials(userId: string): Promise<BybitCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('user_trading_accounts')
      .select('api_key_encrypted, api_secret_encrypted, account_type')
      .eq('user_id', userId)
      .eq('exchange', 'bybit')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('No user credentials found:', error?.message);
      return null;
    }

    return {
      api_key: data.api_key_encrypted,
      api_secret: data.api_secret_encrypted,
      testnet: data.account_type === 'testnet'
    };
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    return null;
  }
}

async function getSystemCredentials(): Promise<BybitCredentials> {
  const isTestnet = Deno.env.get('PAPER_TRADING') === 'true' || Deno.env.get('BYBIT_TESTNET') === 'true';
  
  return {
    api_key: Deno.env.get('BYBIT_API_KEY') || '',
    api_secret: Deno.env.get('BYBIT_API_SECRET') || '',
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

  // Validate symbol first
  const symbolResponse = await fetch(`${supabaseUrl}/functions/v1/symbol-validator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ symbol: trade.symbol })
  });

  const symbolResult = await symbolResponse.json();
  if (!symbolResult.success) {
    throw new Error(`Invalid symbol: ${trade.symbol}`);
  }

  // Calculate quantity if amount_usd is provided
  let qty = trade.qty;
  if (!qty && trade.amount_usd) {
    // Get current price to calculate qty
    const priceResponse = await fetch(`${baseUrl}/v5/market/tickers?category=linear&symbol=${trade.symbol}`);
    const priceData = await priceResponse.json();
    
    if (priceData.retCode === 0 && priceData.result.list.length > 0) {
      const currentPrice = parseFloat(priceData.result.list[0].lastPrice);
      qty = trade.amount_usd / currentPrice;
    } else {
      throw new Error('Could not fetch current price for quantity calculation');
    }
  }

  const orderParams = {
    category: 'linear',
    symbol: trade.symbol,
    side: trade.side,
    orderType: 'Market',
    qty: qty?.toFixed(6),
    timeInForce: 'IOC'
  };

  const paramsString = Object.entries(orderParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = await createBybitSignature(paramsString, credentials.api_secret, timestamp);

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

  return await response.json();
}

async function executePaperTrade(trade: TradeRequest) {
  // Simulate paper trade execution
  const mockOrderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    retCode: 0,
    retMsg: 'Paper trade executed successfully',
    result: {
      orderId: mockOrderId,
      orderLinkId: `paper_link_${mockOrderId}`,
      symbol: trade.symbol,
      side: trade.side,
      qty: trade.qty?.toString() || '0',
      price: '0', // Market order
      orderStatus: 'Filled'
    },
    paper_mode: true
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case 'execute_trade': {
        const trade: TradeRequest = payload;
        
        console.log('🎯 Executing trade:', trade);

        // Determine if this is paper trading
        const isPaperMode = trade.paper_mode ?? (Deno.env.get('PAPER_TRADING') === 'true');
        
        let result;
        let credentials = null;

        if (isPaperMode) {
          result = await executePaperTrade(trade);
        } else {
          // Get credentials (user first, then system fallback)
          if (trade.user_id) {
            credentials = await getUserCredentials(trade.user_id);
          }
          
          if (!credentials) {
            credentials = await getSystemCredentials();
          }

          if (!credentials.api_key || !credentials.api_secret) {
            throw new Error('No valid trading credentials found');
          }

          result = await executeBybitTrade(trade, credentials);
        }

        // Log the trade execution
        const { error: logError } = await supabase
          .from('execution_orders')
          .insert({
            user_id: trade.user_id || '00000000-0000-0000-0000-000000000000',
            symbol: trade.symbol,
            side: trade.side,
            qty: trade.qty,
            amount_usd: trade.amount_usd,
            leverage: trade.leverage || 1,
            paper_mode: isPaperMode,
            status: result.retCode === 0 ? 'executed' : 'failed',
            exchange_order_id: result.result?.orderId || null,
            ret_code: result.retCode,
            ret_msg: result.retMsg,
            raw_response: result
          });

        if (logError) {
          console.error('Failed to log trade execution:', logError);
        }

        return new Response(JSON.stringify({
          success: result.retCode === 0,
          trade_id: result.result?.orderId || result.result?.orderLinkId,
          paper_mode: isPaperMode,
          result: result,
          message: result.retMsg || 'Trade executed successfully'
        }), {
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