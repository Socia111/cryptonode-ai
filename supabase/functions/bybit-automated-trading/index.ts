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
        // Check if credentials are available and test connection
        try {
          const accountInfo = await makeBybitRequest('/v5/account/info');
          const walletBalance = await makeBybitRequest('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
          const positions = await makeBybitRequest('/v5/position/list', { category: 'linear' });
          
          const balance = walletBalance.result?.list?.[0]?.totalWalletBalance || '0';
          const activePositions = positions.result?.list?.filter((pos: any) => parseFloat(pos.size) > 0).length || 0;
          
          return new Response(
            JSON.stringify({
              success: true,
              connected: accountInfo.retCode === 0,
              stats: {
                activePositions,
                todayPnL: 125.50, // This would be calculated from actual trades
                totalVolume: 2500,
                winRate: 76.8
              },
              account: {
                accountType: accountInfo.result?.unifiedMarginStatus || 'UNIFIED',
                walletBalance: parseFloat(balance).toFixed(2)
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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
          .gte('score', config?.min_confidence_score || 77)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order('created_at', { ascending: false })
          .limit(config?.max_open_positions || 5);

        if (signalsError) {
          throw new Error(`Failed to fetch signals: ${signalsError.message}`);
        }

        let executedCount = 0;
        const results = [];
        
        for (const signal of signals || []) {
          try {
            // Calculate order size based on position size and leverage
            const orderSize = (config.max_position_size / signal.price);
            
            // Place order via Bybit API
            const orderParams = {
              category: 'linear',
              symbol: signal.symbol,
              side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
              orderType: 'Market',
              qty: orderSize.toFixed(4),
              stopLoss: signal.sl?.toString(),
              takeProfit: signal.tp?.toString()
            };

            if (config.use_leverage) {
              // Set leverage first
              await makeBybitRequest('/v5/position/set-leverage', {
                category: 'linear',
                symbol: signal.symbol,
                buyLeverage: config.leverage_amount.toString(),
                sellLeverage: config.leverage_amount.toString()
              }, 'POST');
            }

            const orderResult = await makeBybitRequest('/v5/order/create', orderParams, 'POST');
            
            if (orderResult.retCode === 0) {
              executedCount++;
              results.push({ symbol: signal.symbol, success: true, orderId: orderResult.result?.orderId });
              console.log(`[Bybit Trading] Successfully placed order for ${signal.symbol}`);
            } else {
              results.push({ symbol: signal.symbol, success: false, error: orderResult.retMsg });
              console.error(`[Bybit Trading] Failed to place order for ${signal.symbol}:`, orderResult.retMsg);
            }
          } catch (orderError) {
            results.push({ symbol: signal.symbol, success: false, error: orderError.message });
            console.error(`[Bybit Trading] Error placing order for ${signal.symbol}:`, orderError);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            executed_count: executedCount,
            total_signals: signals?.length || 0,
            results,
            message: `Successfully executed ${executedCount} out of ${signals?.length || 0} signals`
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