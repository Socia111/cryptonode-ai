/**
 * Live CCXT Feed Controller - Client-side interface
 * Controls server-side CCXT data collection via edge functions
 */

import { supabase } from '@/lib/supabaseClient';

export interface CCXTFeedStatus {
  isRunning: boolean;
  exchanges: string[];
  timeframes: string[];
  marketDataPoints: number;
  signalsGenerated: number;
  lastUpdate: string;
}

export class LiveCCXTFeed {
  private isRunning = false;
  private feedInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds

  async start() {
    if (this.isRunning) {
      console.log('⚠️ [CCXT Feed] Already running');
      return;
    }

    console.log('🟢 [CCXT Feed] Starting live data feed...');
    this.isRunning = true;

    // Start continuous data collection via edge function
    this.feedInterval = setInterval(async () => {
      await this.triggerDataCollection();
    }, this.UPDATE_INTERVAL);

    // Initial data collection
    await this.triggerDataCollection();
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('🔴 [CCXT Feed] Stopping live data feed...');
    this.isRunning = false;

    if (this.feedInterval) {
      clearInterval(this.feedInterval);
      this.feedInterval = null;
    }
  }

  private async triggerDataCollection() {
    try {
      console.log('📊 [CCXT Feed] Triggering data collection...');

      const { data, error } = await supabase.functions.invoke('ccxt-live-feed', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      console.log('✅ [CCXT Feed] Data collection completed:', data);
      return data;

    } catch (error) {
      console.error('❌ [CCXT Feed] Error in data collection:', error);
      throw error;
    }
  }

  async getStatus(): Promise<CCXTFeedStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('ccxt-live-feed', {
        body: { action: 'status' }
      });

      if (error) throw error;

      return {
        isRunning: this.isRunning,
        exchanges: data.exchanges || [],
        timeframes: data.timeframes || [],
        marketDataPoints: data.market_data_points || 0,
        signalsGenerated: data.signals_generated || 0,
        lastUpdate: data.last_update || new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [CCXT Feed] Error getting status:', error);
      return {
        isRunning: false,
        exchanges: [],
        timeframes: [],
        marketDataPoints: 0,
        signalsGenerated: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  async triggerManualScan() {
    try {
      console.log('🔍 [CCXT Feed] Triggering manual scan...');
      return await this.triggerDataCollection();
    } catch (error) {
      console.error('❌ [CCXT Feed] Manual scan failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const liveCCXTFeed = new LiveCCXTFeed();