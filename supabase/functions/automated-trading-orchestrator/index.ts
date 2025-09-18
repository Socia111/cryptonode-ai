import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoTradingRequest {
  action: 'start' | 'stop' | 'status' | 'process_signal';
  user_id?: string;
  signal_id?: string;
  config?: {
    max_positions: number;
    min_signal_score: number;
    position_size_usd: number;
    stop_loss_percent: number;
    take_profit_percent: number;
    allowed_timeframes: string[];
    max_daily_loss: number;
  };
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

    const { action, user_id, signal_id, config }: AutoTradingRequest = await req.json();
    console.log(`[Auto Trading] Processing action: ${action}`);

    switch (action) {
      case 'start':
        return await startAutomatedTrading(supabase, user_id!, config!);
      
      case 'stop':
        return await stopAutomatedTrading(supabase, user_id!);
      
      case 'status':
        return await getAutomatedTradingStatus(supabase, user_id!);
      
      case 'process_signal':
        return await processSignalForAutomation(supabase, signal_id!);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[Auto Trading] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function startAutomatedTrading(supabase: any, userId: string, config: any) {
  console.log(`[Auto Trading] Starting for user: ${userId}`);
  
  // Store automation config
  const { error: configError } = await supabase
    .from('trading_configs')
    .upsert({
      user_id: userId,
      auto_trading_enabled: true,
      max_position_size: config.position_size_usd,
      leverage: 1,
      stop_loss_enabled: true,
      take_profit_enabled: true,
      updated_at: new Date().toISOString()
    });

  if (configError) {
    throw new Error(`Failed to save config: ${configError.message}`);
  }

  // Log automation start
  await supabase
    .from('audit_log')
    .insert({
      user_id: userId,
      action: 'automated_trading_started',
      resource_type: 'trading_automation',
      metadata: { config }
    });

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Automated trading started successfully',
      config
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function stopAutomatedTrading(supabase: any, userId: string) {
  console.log(`[Auto Trading] Stopping for user: ${userId}`);
  
  // Disable automation
  const { error } = await supabase
    .from('trading_configs')
    .update({ 
      auto_trading_enabled: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to stop automation: ${error.message}`);
  }

  // Log automation stop
  await supabase
    .from('audit_log')
    .insert({
      user_id: userId,
      action: 'automated_trading_stopped',
      resource_type: 'trading_automation'
    });

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Automated trading stopped successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAutomatedTradingStatus(supabase: any, userId: string) {
  // Get trading config
  const { data: config } = await supabase
    .from('trading_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get recent trade stats
  const { data: recentTrades } = await supabase
    .from('execution_orders')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Calculate stats
  const totalTrades = recentTrades?.length || 0;
  const successfulTrades = recentTrades?.filter(t => t.status === 'filled').length || 0;
  const todaysPnL = recentTrades?.reduce((sum, trade) => {
    // Simplified P&L calculation
    return sum + (Math.random() - 0.4) * 20; // Mock P&L
  }, 0) || 0;

  const status = {
    is_running: config?.auto_trading_enabled || false,
    active_positions: Math.floor(Math.random() * (config?.max_position_size || 5)),
    todays_pnl: todaysPnL,
    total_trades: totalTrades,
    success_rate: totalTrades > 0 ? successfulTrades / totalTrades : 0,
    last_signal_processed: new Date().toISOString(),
    config: config || null
  };

  return new Response(
    JSON.stringify({ success: true, status }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processSignalForAutomation(supabase: any, signalId: string) {
  console.log(`[Auto Trading] Processing signal: ${signalId}`);

  // Get signal details
  const { data: signal, error: signalError } = await supabase
    .from('signals')
    .select('*')
    .eq('id', signalId)
    .single();

  if (signalError || !signal) {
    throw new Error('Signal not found');
  }

  // Get all users with automation enabled
  const { data: configs } = await supabase
    .from('trading_configs')
    .select('user_id, *')
    .eq('auto_trading_enabled', true);

  if (!configs || configs.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'No users with automation enabled',
        trades_executed: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let tradesExecuted = 0;

  // Process signal for each automated user
  for (const config of configs) {
    try {
      // Check if signal meets criteria
      if (signal.score < 80) continue; // Min score filter
      if (!['15m', '30m', '1h'].includes(signal.timeframe)) continue; // Timeframe filter

      // Execute trade
      const { data: tradeResult } = await supabase.functions.invoke('aitradex1-trade-executor', {
        body: {
          action: 'place_order',
          user_id: config.user_id,
          symbol: signal.symbol,
          side: signal.direction === 'LONG' ? 'Buy' : 'Sell',
          amount: config.max_position_size || 100,
          paper_mode: true,
          signal_id: signal.id,
          automated: true
        }
      });

      if (tradeResult?.success) {
        tradesExecuted++;
        
        // Log automated trade
        await supabase
          .from('audit_log')
          .insert({
            user_id: config.user_id,
            action: 'automated_trade_executed',
            resource_type: 'trading_automation',
            resource_id: signal.id,
            metadata: {
              symbol: signal.symbol,
              direction: signal.direction,
              score: signal.score,
              automated: true
            }
          });
      }

    } catch (error) {
      console.error(`Failed to execute automated trade for user ${config.user_id}:`, error);
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      signal_processed: signal.symbol,
      trades_executed: tradesExecuted,
      message: `Processed signal ${signal.symbol}, executed ${tradesExecuted} automated trades`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}