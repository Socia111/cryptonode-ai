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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, config, credentials } = body;
    
    console.log(`[Bybit Trading] Action: ${action}`);

    // Helper function to make authenticated Bybit API calls
    const makeBybitRequest = async (endpoint: string, params: any = {}, method = 'GET') => {
      const apiKey = credentials?.apiKey || Deno.env.get('BYBIT_API_KEY');
      const apiSecret = credentials?.apiSecret || Deno.env.get('BYBIT_API_SECRET');
      
      if (!apiKey || !apiSecret) {
        throw new Error('Bybit API credentials not configured');
      }

      const timestamp = Date.now().toString();
      const baseUrl = 'https://api.bybit.com';
      
      let queryString = '';
      if (method === 'GET' && Object.keys(params).length > 0) {
        queryString = new URLSearchParams(params).toString();
      }
      
      const signString = timestamp + apiKey + '5000' + (method === 'POST' ? JSON.stringify(params) : queryString);
      
      // Create HMAC signature using Web Crypto API
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(apiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signString));
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const headers = {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signatureHex,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json'
      };

      const url = queryString ? `${baseUrl}${endpoint}?${queryString}` : `${baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(params) : undefined
      });

      const result = await response.json();
      console.log(`[Bybit API] ${method} ${endpoint}:`, result);
      return result;
    };

    switch (action) {
      case 'connect':
        // Test connection with provided credentials
        try {
          const accountInfo = await makeBybitRequest('/v5/account/info');
          
          if (accountInfo.retCode === 0) {
            // Get wallet balance
            const walletBalance = await makeBybitRequest('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
            const balance = walletBalance.result?.list?.[0]?.totalWalletBalance || '0';
            
            return new Response(
              JSON.stringify({
                success: true,
                connected: true,
                account: {
                  accountType: accountInfo.result?.unifiedMarginStatus || 'UNIFIED',
                  walletBalance: parseFloat(balance).toFixed(2)
                },
                message: 'Successfully connected to Bybit'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            throw new Error(accountInfo.retMsg || 'Failed to connect to Bybit');
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Connection failed: ${error.message}`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'test_connection':
        // Test Bybit API connection
        try {
          const accountInfo = await makeBybitRequest('/v5/account/info');
          const walletBalance = await makeBybitRequest('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
          
          if (accountInfo.retCode === 0) {
            return new Response(
              JSON.stringify({
                success: true,
                connected: true,
                balance: walletBalance,
                message: 'Successfully connected to Bybit API'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            throw new Error(accountInfo.retMsg || 'Failed to connect to Bybit');
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Connection test failed: ${error.message}`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'disconnect':
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Disconnected from Bybit'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'status':
        // Check status using the new bybit-order-execution endpoint
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          
          // Test connection via bybit-order-execution
          const testResponse = await fetch(`${supabaseUrl}/functions/v1/bybit-order-execution/test`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            }
          });
          
          const testResult = await testResponse.json();
          
          if (testResult.ok) {
            // Get account balance
            const balanceResponse = await fetch(`${supabaseUrl}/functions/v1/bybit-order-execution/balance?accountType=UNIFIED`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              }
            });
            
            const balanceResult = await balanceResponse.json();
            const balance = balanceResult.ok ? 
              balanceResult.result?.result?.list?.[0]?.totalWalletBalance || '0' : '0';
            
            // Get positions
            const positionsResponse = await fetch(`${supabaseUrl}/functions/v1/bybit-order-execution/positions?category=linear`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              }
            });
            
            const positionsResult = await positionsResponse.json();
            const activePositions = positionsResult.ok ? 
              positionsResult.result?.result?.list?.filter((pos: any) => parseFloat(pos.size) > 0).length || 0 : 0;
            
            return new Response(
              JSON.stringify({
                success: true,
                connected: true,
                stats: {
                  activePositions,
                  todayPnL: 0, // Will be calculated from actual trades
                  totalVolume: 0,
                  winRate: 0
                },
                account: {
                  accountType: 'UNIFIED',
                  walletBalance: parseFloat(balance).toFixed(2)
                },
                api_status: 'Connected via bybit-order-execution'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            throw new Error(testResult.error || 'Connection test failed');
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              connected: false,
              error: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'start':
        console.log('[Bybit Trading] Starting automation with config:', config);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Automated trading started',
            config
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'stop':
        console.log('[Bybit Trading] Stopping automation');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Automated trading stopped'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'execute_all':
        console.log('[Bybit Trading] Executing all signals with config:', config);
        
        // Fetch recent high-confidence signals from database  
        const { data: signals, error: signalsError } = await supabase
          .from('signals')
          .select('*')
          .gte('confidence_score', config?.min_confidence_score || 80)
          .eq('status', 'active')
          .in('timeframe', ['15m', '30m']) // AItradeX1 criteria
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
          .order('confidence_score', { ascending: false })
          .limit(config?.max_open_positions || 3);

        if (signalsError) {
          throw new Error(`Failed to fetch signals: ${signalsError.message}`);
        }

        let executedCount = 0;
        const results = [];
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        for (const signal of signals || []) {
          try {
            // Skip blacklisted symbols
            if (config.symbols_blacklist?.includes(signal.symbol)) {
              console.log(`[Bybit Trading] Skipping blacklisted symbol: ${signal.symbol}`);
              continue;
            }

            // Calculate order size based on risk per trade
            const orderSizeUSDT = config.risk_per_trade || 10;
            
            // Prepare order payload for bybit-order-execution endpoint
            const orderPayload = {
              category: config.use_leverage ? 'linear' : 'spot',
              symbol: signal.symbol.replace('/', ''),
              side: signal.direction === 'BUY' ? 'Buy' : 'Sell',
              orderType: 'Market',
              qty: config.use_leverage ? 
                (orderSizeUSDT / signal.entry_price * config.leverage_amount).toFixed(4) :
                (orderSizeUSDT / signal.entry_price).toFixed(4),
              timeInForce: 'IOC',
              orderLinkId: `auto_${signal.id}_${Date.now()}`,
              positionIdx: config.use_leverage ? 0 : undefined // One-way mode for futures
            };

            // Add stop loss and take profit from signal
            if (signal.stop_loss) {
              orderPayload.stopLoss = signal.stop_loss.toString();
              orderPayload.slTriggerBy = 'LastPrice';
              orderPayload.slOrderType = 'Market';
            }
            
            if (signal.take_profit) {
              orderPayload.takeProfit = signal.take_profit.toString();
              orderPayload.tpTriggerBy = 'LastPrice';
              orderPayload.tpOrderType = 'Market';
            }

            console.log(`[Bybit Trading] Placing order for ${signal.symbol}:`, orderPayload);

            // Call the new bybit-order-execution endpoint
            const orderResponse = await fetch(`${supabaseUrl}/functions/v1/bybit-order-execution/order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify(orderPayload)
            });

            const orderResult = await orderResponse.json();
            
            if (orderResult.ok && orderResult.result?.retCode === 0) {
              executedCount++;
              
              // Log successful trade to database
              await supabase.from('trades').insert({
                user_id: null, // System trades
                signal_id: signal.id,
                exchange: 'bybit',
                symbol: signal.symbol,
                side: signal.direction,
                quantity: parseFloat(orderPayload.qty),
                entry_price: signal.entry_price,
                leverage: config.use_leverage ? config.leverage_amount : 1,
                status: 'open',
                external_order_id: orderResult.result.result.orderId,
                fees: 0, // Will be updated when filled
                opened_at: new Date().toISOString()
              });

              results.push({ 
                symbol: signal.symbol, 
                success: true, 
                orderId: orderResult.result.result.orderId,
                orderLinkId: orderResult.result.result.orderLinkId
              });
              
              console.log(`[Bybit Trading] ✅ Successfully placed order for ${signal.symbol}`);
            } else {
              const errorMsg = orderResult.data?.retMsg || orderResult.error || 'Unknown error';
              results.push({ symbol: signal.symbol, success: false, error: errorMsg });
              console.error(`[Bybit Trading] ❌ Failed to place order for ${signal.symbol}:`, errorMsg);
            }
          } catch (orderError) {
            results.push({ symbol: signal.symbol, success: false, error: orderError.message });
            console.error(`[Bybit Trading] ❌ Error placing order for ${signal.symbol}:`, orderError);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            executed_count: executedCount,
            total_signals: signals?.length || 0,
            results,
            message: `🚀 Successfully executed ${executedCount} out of ${signals?.length || 0} high-confidence signals`,
            config_used: config
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[Bybit Trading] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});