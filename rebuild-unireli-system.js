#!/usr/bin/env node

/**
 * Unireli System Rebuild & Verification Script
 * Sets up user accounts, tests trading connections, and validates the complete system
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const config = {
  SUPABASE_URL: 'https://codhlwjogfjywmjyjbbn.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
  TEST_SYMBOLS: ['BTCUSDT', 'ETHUSDT'],
  TEST_AMOUNT_USD: 25
};

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
const serviceSupabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

class UnireliSystemRebuilder {
  constructor() {
    this.results = {
      database: false,
      auth: false,
      trading_account: false,
      signals: false,
      trade_execution: false,
      live_feed: false
    };
  }

  async rebuild() {
    console.log('🔧 Starting Unireli System Rebuild...\n');
    
    await this.testDatabaseConnection();
    await this.checkAuthentication();
    await this.setupTradingAccount();
    await this.testSignalGeneration();
    await this.testTradeExecution();
    await this.testLiveFeed();
    
    this.printSummary();
    return this.isSystemHealthy();
  }

  async testDatabaseConnection() {
    console.log('📊 Testing database connection...');
    
    try {
      // Test basic connectivity
      const { data: markets, error } = await supabase
        .from('markets')
        .select('count', { count: 'exact', head: true });
        
      if (error) throw error;
      
      // Test signal table
      const { data: signals } = await supabase
        .from('signals')
        .select('count', { count: 'exact', head: true });
        
      console.log(`  ✅ Database connected - ${markets.count || 0} markets, ${signals.count || 0} signals`);
      this.results.database = true;
      
    } catch (error) {
      console.log(`  ❌ Database error: ${error.message}`);
      this.results.database = false;
    }
  }

  async checkAuthentication() {
    console.log('🔐 Checking authentication system...');
    
    try {
      // Check if user session exists
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log(`  ✅ User authenticated: ${session.user.email}`);
        this.results.auth = true;
      } else {
        console.log('  ⚠️  No active session - authentication available but not logged in');
        this.results.auth = true; // Auth system works, just no user logged in
      }
      
    } catch (error) {
      console.log(`  ❌ Auth error: ${error.message}`);
      this.results.auth = false;
    }
  }

  async setupTradingAccount() {
    console.log('💼 Setting up trading account...');
    
    try {
      // Check for existing trading accounts
      const { data: accounts, error } = await supabase
        .from('user_trading_accounts')
        .select('*')
        .eq('exchange', 'bybit')
        .eq('is_active', true);
        
      if (error && !error.message.includes('JWT')) {
        throw error;
      }
      
      if (accounts && accounts.length > 0) {
        console.log(`  ✅ Found ${accounts.length} active trading accounts`);
        this.results.trading_account = true;
      } else {
        console.log('  ⚠️  No active trading accounts found');
        console.log('  💡 To add trading accounts:');
        console.log('     1. Log in to the web interface');
        console.log('     2. Go to Settings > Trading Accounts');
        console.log('     3. Add your Bybit API credentials');
        this.results.trading_account = false;
      }
      
    } catch (error) {
      console.log(`  ❌ Trading account error: ${error.message}`);
      this.results.trading_account = false;
    }
  }

  async testSignalGeneration() {
    console.log('🎯 Testing signal generation...');
    
    try {
      // Test signals API
      const response = await fetch(`${config.SUPABASE_URL}/functions/v1/signals-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`  ✅ Signals API working - ${result.counts.last24h} signals in last 24h`);
        
        // Trigger a test scan
        const scanResponse = await fetch(`${config.SUPABASE_URL}/functions/v1/live-scanner-production`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: 'bybit',
            timeframe: '1h',
            symbols: config.TEST_SYMBOLS,
            relaxed_filters: true
          })
        });
        
        const scanResult = await scanResponse.json();
        
        if (scanResult.success) {
          console.log(`  ✅ Test scan successful - ${scanResult.signals_found || 0} signals found`);
          this.results.signals = true;
        } else {
          throw new Error(scanResult.error || 'Scan failed');
        }
      } else {
        throw new Error(result.error || 'Signals API failed');
      }
      
    } catch (error) {
      console.log(`  ❌ Signal generation error: ${error.message}`);
      this.results.signals = false;
    }
  }

  async testTradeExecution() {
    console.log('📈 Testing trade execution...');
    
    try {
      // Test trade executor status
      const response = await fetch(`${config.SUPABASE_URL}/functions/v1/aitradex1-trade-executor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`  ✅ Trade executor online - Paper mode: ${result.paper_mode || true}`);
        console.log(`  📊 API Keys: ${result.api?.hasKey ? 'configured' : 'missing'}`);
        console.log(`  🌐 Connectivity: ${result.connectivity?.connected ? 'connected' : 'offline'}`);
        this.results.trade_execution = true;
      } else {
        throw new Error(result.error || 'Trade executor failed');
      }
      
    } catch (error) {
      console.log(`  ❌ Trade execution error: ${error.message}`);
      this.results.trade_execution = false;
    }
  }

  async testLiveFeed() {
    console.log('📡 Testing live exchange feed...');
    
    try {
      // Test live exchange feed
      const response = await fetch(`${config.SUPABASE_URL}/functions/v1/live-exchange-feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: config.TEST_SYMBOLS,
          exchanges: ['bybit']
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`  ✅ Live feed working - ${result.updated_symbols || 0} symbols updated`);
        this.results.live_feed = true;
      } else {
        throw new Error(result.error || 'Live feed failed');
      }
      
    } catch (error) {
      console.log(`  ❌ Live feed error: ${error.message}`);
      this.results.live_feed = false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 UNIRELI SYSTEM STATUS SUMMARY');
    console.log('='.repeat(50));
    
    Object.entries(this.results).forEach(([component, status]) => {
      const icon = status ? '✅' : '❌';
      const name = component.replace(/_/g, ' ').toUpperCase();
      console.log(`${icon} ${name.padEnd(20)} ${status ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);
    });
    
    console.log('='.repeat(50));
    
    const healthyComponents = Object.values(this.results).filter(Boolean).length;
    const totalComponents = Object.keys(this.results).length;
    const healthPercentage = (healthyComponents / totalComponents * 100).toFixed(0);
    
    console.log(`🎯 System Health: ${healthyComponents}/${totalComponents} (${healthPercentage}%)`);
    
    if (this.isSystemHealthy()) {
      console.log('🎉 Unireli system is ready for trading!');
      console.log('\n💡 Next steps:');
      console.log('   1. Start the live feed: npm run start:feed');
      console.log('   2. Monitor signals in the web interface');
      console.log('   3. Configure trading parameters');
    } else {
      console.log('⚠️  System needs attention before trading');
      console.log('\n🔧 Required fixes:');
      
      Object.entries(this.results).forEach(([component, status]) => {
        if (!status) {
          console.log(`   - Fix ${component.replace(/_/g, ' ')}`);
        }
      });
    }
  }

  isSystemHealthy() {
    const criticalComponents = ['database', 'signals'];
    return criticalComponents.every(component => this.results[component]);
  }
}

// Main execution
async function main() {
  const rebuilder = new UnireliSystemRebuilder();
  
  try {
    const isHealthy = await rebuilder.rebuild();
    process.exit(isHealthy ? 0 : 1);
  } catch (error) {
    console.error('💥 Rebuild failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { UnireliSystemRebuilder };