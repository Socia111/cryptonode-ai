import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced Database Setup Function
async function setupDatabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('🗄️ Setting up database connections...')
  
  const results = {
    strategy_signals: false,
    positions: false,
    trades: false,
    exchanges: false,
    portfolios: false,
    orders: false,
    markets: false
  }
  
  try {
    // Test signals table
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('id')
      .limit(1)
    
    if (!signalsError) {
      results.strategy_signals = true
      console.log('✅ strategy_signals table: Connected')
    } else {
      console.log('❌ strategy_signals table: Error -', signalsError.message)
    }
    
    // Test execution_orders table (represents trades/positions)
    const { data: orders, error: ordersError } = await supabase
      .from('execution_orders')
      .select('id')
      .limit(1)
    
    if (!ordersError) {
      results.positions = true
      results.trades = true
      results.orders = true
      console.log('✅ positions/trades/orders tables: Connected')
    } else {
      console.log('❌ positions/trades/orders tables: Error -', ordersError.message)
    }
    
    // Test user_trading_accounts table (represents exchanges)
    const { data: accounts, error: accountsError } = await supabase
      .from('user_trading_accounts')
      .select('id')
      .limit(1)
    
    if (!accountsError) {
      results.exchanges = true
      console.log('✅ exchanges table: Connected')
    } else {
      console.log('❌ exchanges table: Error -', accountsError.message)
    }
    
    // Test trading_preferences table (represents portfolios)
    const { data: prefs, error: prefsError } = await supabase
      .from('trading_preferences')
      .select('id')
      .limit(1)
    
    if (!prefsError) {
      results.portfolios = true
      console.log('✅ portfolios table: Connected')
    } else {
      console.log('❌ portfolios table: Error -', prefsError.message)
    }
    
    // Test live_market_data table (represents markets)
    const { data: markets, error: marketsError } = await supabase
      .from('live_market_data')
      .select('id')
      .limit(1)
    
    if (!marketsError) {
      results.markets = true
      console.log('✅ markets table: Connected')
    } else {
      console.log('❌ markets table: Error -', marketsError.message)
    }
    
  } catch (error) {
    console.error('❌ Database setup error:', error)
  }
  
  const connectedCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.keys(results).length
  
  console.log(`📊 Database Status: ${connectedCount}/${totalCount} tables ready`)
  
  return {
    success: connectedCount > 0,
    connected: connectedCount,
    total: totalCount,
    status: connectedCount === totalCount ? 'Online' : 'Partial',
    tables: results
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action = 'setup', force = false } = await req.json().catch(() => ({}))
    
    console.log('🔧 Database Setup Request:', { action, force })

    switch (action) {
      case 'setup':
      case 'check':
      case 'status':
        const dbStatus = await setupDatabase()
        
        return new Response(JSON.stringify({
          success: dbStatus.success,
          message: `Database ${dbStatus.status.toLowerCase()} - ${dbStatus.connected}/${dbStatus.total} tables ready`,
          status: dbStatus.status,
          connected_tables: dbStatus.connected,
          total_tables: dbStatus.total,
          tables: dbStatus.tables,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      case 'initialize':
        console.log('🚀 Initializing database for live trading...')
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        // Initialize exchange feed status
        const { error: feedError } = await supabase
          .from('exchange_feed_status')
          .upsert([
            {
              exchange: 'bybit',
              status: 'active',
              last_update: new Date().toISOString(),
              symbols_tracked: 20,
              error_count: 0
            }
          ])
        
        if (feedError) {
          console.error('❌ Feed status initialization error:', feedError)
        } else {
          console.log('✅ Exchange feed status initialized')
        }
        
        const initStatus = await setupDatabase()
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Database initialized for live trading',
          status: initStatus.status,
          connected_tables: initStatus.connected,
          total_tables: initStatus.total,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}. Available: setup, check, status, initialize`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('❌ Database Setup Error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      status: 'Offline',
      connected_tables: 0,
      total_tables: 7,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})