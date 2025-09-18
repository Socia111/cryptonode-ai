import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Diagnostics] Starting comprehensive system diagnostic...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const diagnostic = {
      timestamp: new Date().toISOString(),
      status: 'running',
      tests: {},
      errors: [],
      recommendations: []
    };

    // Test 1: Database Connectivity
    console.log('[Diagnostics] Testing database connectivity...');
    try {
      const { data: dbTest, error: dbError } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1);
      
      diagnostic.tests.database = {
        status: dbError ? 'FAILED' : 'PASSED',
        message: dbError ? dbError.message : 'Database connected successfully',
        data: dbTest
      };
    } catch (error) {
      diagnostic.tests.database = {
        status: 'FAILED',
        message: error.message,
        error: error
      };
    }

    // Test 2: Trading Accounts Access
    console.log('[Diagnostics] Testing trading accounts access...');
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .limit(5);
      
      diagnostic.tests.trading_accounts = {
        status: accountsError ? 'FAILED' : 'PASSED',
        message: accountsError ? accountsError.message : `Found ${accounts?.length || 0} trading accounts`,
        count: accounts?.length || 0,
        data: accounts
      };
    } catch (error) {
      diagnostic.tests.trading_accounts = {
        status: 'FAILED',
        message: error.message,
        error: error
      };
    }

    // Test 3: Live Market Data
    console.log('[Diagnostics] Testing live market data...');
    try {
      const { data: marketData, error: marketError } = await supabase
        .from('live_market_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      diagnostic.tests.live_market_data = {
        status: marketError ? 'FAILED' : 'PASSED',
        message: marketError ? marketError.message : `Latest ${marketData?.length || 0} market data entries`,
        count: marketData?.length || 0,
        latest: marketData?.[0]
      };
    } catch (error) {
      diagnostic.tests.live_market_data = {
        status: 'FAILED',
        message: error.message,
        error: error
      };
    }

    // Test 4: Signals Generation
    console.log('[Diagnostics] Testing signals generation...');
    try {
      const { data: signals, error: signalsError } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      diagnostic.tests.signals = {
        status: signalsError ? 'FAILED' : 'PASSED',
        message: signalsError ? signalsError.message : `Found ${signals?.length || 0} recent signals`,
        count: signals?.length || 0,
        latest: signals?.[0]
      };
    } catch (error) {
      diagnostic.tests.signals = {
        status: 'FAILED',
        message: error.message,
        error: error
      };
    }

    // Test 5: Exchange Feed Status
    console.log('[Diagnostics] Testing exchange feed status...');
    try {
      const { data: exchanges, error: exchangeError } = await supabase
        .from('exchange_feed_status')
        .select('*');
      
      diagnostic.tests.exchange_feeds = {
        status: exchangeError ? 'FAILED' : 'PASSED',
        message: exchangeError ? exchangeError.message : `${exchanges?.length || 0} exchanges configured`,
        count: exchanges?.length || 0,
        data: exchanges
      };
    } catch (error) {
      diagnostic.tests.exchange_feeds = {
        status: 'FAILED',
        message: error.message,
        error: error
      };
    }

    // Calculate overall status
    const testResults = Object.values(diagnostic.tests);
    const passedTests = testResults.filter(test => test.status === 'PASSED').length;
    const failedTests = testResults.filter(test => test.status === 'FAILED').length;
    
    diagnostic.status = failedTests === 0 ? 'HEALTHY' : failedTests < passedTests ? 'WARNING' : 'CRITICAL';
    diagnostic.summary = {
      total_tests: testResults.length,
      passed: passedTests,
      failed: failedTests,
      health_score: Math.round((passedTests / testResults.length) * 100)
    };

    // Add recommendations
    if (failedTests > 0) {
      diagnostic.recommendations.push('Review failed tests and check edge function logs');
      diagnostic.recommendations.push('Verify API credentials are correctly configured');
      diagnostic.recommendations.push('Check database permissions and RLS policies');
    }

    if (diagnostic.summary.health_score >= 80) {
      diagnostic.recommendations.push('System ready for live automation trading');
    }

    console.log(`[Diagnostics] Completed with ${passedTests}/${testResults.length} tests passed`);

    return new Response(JSON.stringify(diagnostic), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Diagnostics] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});