#!/usr/bin/env node

/**
 * Unireli Live Feed Worker - Advanced CCXT Integration
 * Fetches live market data, calculates technical indicators, and generates signals
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Configuration
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://codhlwjogfjywmjyjbbn.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SCAN_INTERVAL: 60000, // 1 minute
  SYMBOLS: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'BNBUSDT', 'XRPUSDT', 'LINKUSDT'],
  TIMEFRAMES: ['5m', '15m', '1h'],
  MIN_SCORE_THRESHOLD: 75
};

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

class UnireliSignalEngine {
  constructor() {
    this.isRunning = false;
    this.scanCount = 0;
    this.signalsGenerated = 0;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Unireli feed already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Unireli Live Signal Engine...');
    console.log(`📊 Monitoring ${config.SYMBOLS.length} symbols across ${config.TIMEFRAMES.length} timeframes`);
    
    // Initial scan
    await this.performScan();
    
    // Set up recurring scans
    this.intervalId = setInterval(() => {
      this.performScan().catch(error => {
        console.error('❌ Scan error:', error.message);
      });
    }, config.SCAN_INTERVAL);

    console.log(`⏰ Scanning every ${config.SCAN_INTERVAL / 1000} seconds`);
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    console.log('🛑 Unireli feed stopped');
    console.log(`📈 Session stats: ${this.scanCount} scans, ${this.signalsGenerated} signals generated`);
  }

  async performScan() {
    this.scanCount++;
    const startTime = Date.now();
    
    console.log(`\n🔍 Scan #${this.scanCount} - ${new Date().toISOString()}`);
    
    try {
      // Trigger live exchange feed to get fresh market data
      await this.updateExchangeData();
      
      // Run signal generation for each timeframe
      const scanPromises = config.TIMEFRAMES.map(timeframe => 
        this.generateSignalsForTimeframe(timeframe)
      );
      
      const results = await Promise.allSettled(scanPromises);
      
      let totalSignals = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          totalSignals += result.value || 0;
          console.log(`  ✅ ${config.TIMEFRAMES[index]}: ${result.value || 0} signals`);
        } else {
          console.log(`  ❌ ${config.TIMEFRAMES[index]}: ${result.reason?.message || 'Failed'}`);
        }
      });
      
      this.signalsGenerated += totalSignals;
      const duration = Date.now() - startTime;
      
      console.log(`📊 Scan complete: ${totalSignals} signals in ${duration}ms`);
      
      // Update app settings with scan status
      await this.updateScanStatus(totalSignals, duration);
      
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
    }
  }

  async updateExchangeData() {
    try {
      const response = await fetch(`${config.SUPABASE_URL}/functions/v1/live-exchange-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({
          symbols: config.SYMBOLS,
          exchanges: ['bybit'],
          updateIndicators: true
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        console.warn('⚠️  Exchange feed update failed:', result.error);
      }
    } catch (error) {
      console.warn('⚠️  Exchange feed error:', error.message);
    }
  }

  async generateSignalsForTimeframe(timeframe) {
    try {
      const response = await fetch(`${config.SUPABASE_URL}/functions/v1/live-scanner-production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({
          exchange: 'bybit',
          timeframe: timeframe,
          symbols: config.SYMBOLS,
          relaxed_filters: timeframe === '5m', // More relaxed for shorter timeframes
          min_score: config.MIN_SCORE_THRESHOLD,
          scan_all_coins: false // Focus on our symbol list
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.signals_found || 0;
      } else {
        throw new Error(result.error || 'Scanner failed');
      }
    } catch (error) {
      console.error(`❌ ${timeframe} scan error:`, error.message);
      return 0;
    }
  }

  async updateScanStatus(signalsGenerated, duration) {
    try {
      const status = {
        last_scan_at: new Date().toISOString(),
        signals_generated: signalsGenerated,
        scan_duration_ms: duration,
        scan_count: this.scanCount,
        total_signals: this.signalsGenerated,
        status: 'active'
      };
      
      await supabase
        .from('app_settings')
        .upsert({
          key: 'unireli_feed_status',
          value: status,
          updated_at: new Date().toISOString()
        });
        
    } catch (error) {
      console.warn('⚠️  Status update failed:', error.message);
    }
  }

  async getStatus() {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'unireli_feed_status')
      .single();
      
    return data?.value || { status: 'inactive' };
  }
}

// Main execution
async function main() {
  const engine = new UnireliSignalEngine();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await engine.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await engine.stop();
    process.exit(0);
  });
  
  // Check if already running
  const status = await engine.getStatus();
  if (status.status === 'active') {
    const lastScan = new Date(status.last_scan_at);
    const timeSinceLastScan = Date.now() - lastScan.getTime();
    
    if (timeSinceLastScan < 300000) { // 5 minutes
      console.log('⚠️  Another instance may be running (last scan was recent)');
      console.log('   Use --force to override');
      
      if (!process.argv.includes('--force')) {
        process.exit(1);
      }
    }
  }
  
  // Start the engine
  await engine.start();
  
  // Keep the process alive
  console.log('✅ Unireli Signal Engine is running. Press Ctrl+C to stop.');
}

// Export for programmatic use
export { UnireliSignalEngine };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
