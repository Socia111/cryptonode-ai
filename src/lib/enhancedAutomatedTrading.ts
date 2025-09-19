import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutoTradingConfig {
  enabled: boolean;
  max_concurrent_trades: number;
  max_daily_trades: number;
  risk_per_trade: number;
  min_signal_score: number;
  preferred_timeframes: string[];
  excluded_symbols: string[];
  trading_hours: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface TradingExecution {
  id: string;
  signal_id: string;
  symbol: string;
  side: string;
  amount_usd: number;
  leverage: number;
  status: string;
  executed_at: string;
  error_message?: string;
}

export class EnhancedAutomatedTradingEngine {
  private config: AutoTradingConfig | null = null;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private toast: any;

  constructor(toast: any) {
    this.toast = toast;
  }

  async loadConfig(userId?: string): Promise<AutoTradingConfig | null> {
    try {
      const { data, error } = await supabase
        .from('automated_trading_config')
        .select('*')
        .eq('user_id', userId || 'anonymous')
        .eq('enabled', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create default config
        const defaultConfig: AutoTradingConfig = {
          enabled: false,
          max_concurrent_trades: 3,
          max_daily_trades: 10,
          risk_per_trade: 0.02,
          min_signal_score: 75,
          preferred_timeframes: ['15m', '30m', '1h'],
          excluded_symbols: [],
          trading_hours: {
            start: '00:00',
            end: '23:59',
            timezone: 'UTC'
          }
        };

        if (userId) {
          await supabase
            .from('automated_trading_config')
            .upsert({
              user_id: userId,
              ...defaultConfig
            });
        }

        this.config = defaultConfig;
        return defaultConfig;
      }

      this.config = data;
      return data;
    } catch (error) {
      console.error('Failed to load auto trading config:', error);
      return null;
    }
  }

  async updateConfig(updates: Partial<AutoTradingConfig>, userId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('automated_trading_config')
        .upsert({
          user_id: userId || 'anonymous',
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      this.config = { ...this.config, ...updates } as AutoTradingConfig;
      console.log('⚙️ Auto trading config updated');
      
      return true;
    } catch (error) {
      console.error('Failed to update auto trading config:', error);
      this.toast?.({
        title: "Config Update Failed",
        description: "Failed to save automated trading settings",
        variant: "destructive"
      });
      return false;
    }
  }

  async startEngine(userId?: string): Promise<boolean> {
    if (this.isRunning) {
      console.log('🔄 Auto trading engine already running');
      return true;
    }

    try {
      await this.loadConfig(userId);
      
      if (!this.config?.enabled) {
        console.log('🛑 Auto trading not enabled in config');
        return false;
      }

      this.isRunning = true;
      console.log('🤖 Starting Automated Trading Engine...');

      // Start the main loop
      this.intervalId = setInterval(async () => {
        await this.processSignals(userId);
      }, 30000); // Check every 30 seconds

      this.toast?.({
        title: "🤖 Auto Trading Started",
        description: "Automated trading engine is now active",
      });

      return true;
    } catch (error) {
      console.error('Failed to start auto trading engine:', error);
      this.isRunning = false;
      return false;
    }
  }

  async stopEngine(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Automated Trading Engine...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.toast?.({
      title: "🛑 Auto Trading Stopped",
      description: "Automated trading engine has been disabled",
    });
  }

  private async processSignals(userId?: string): Promise<void> {
    if (!this.isRunning || !this.config?.enabled) return;

    try {
      // Get high-quality signals
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .gte('score', this.config.min_signal_score)
        .in('timeframe', this.config.preferred_timeframes)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!signals || signals.length === 0) {
        console.log('🔍 No qualifying signals found');
        return;
      }

      // Filter out excluded symbols
      const filteredSignals = signals.filter(signal => 
        !this.config!.excluded_symbols.includes(signal.symbol)
      );

      if (filteredSignals.length === 0) {
        console.log('🔍 No signals after symbol filtering');
        return;
      }

      console.log(`🎯 Found ${filteredSignals.length} qualifying signals for auto trading`);

      // Check current positions to avoid over-trading
      const { data: currentExecutions, error: execError } = await supabase
        .from('trading_executions')
        .select('*')
        .eq('user_id', userId || 'anonymous')
        .eq('status', 'completed')
        .gte('executed_at', new Date().toISOString().split('T')[0]) // Today

      if (execError) throw execError;

      const todayExecutions = currentExecutions?.length || 0;
      const activePositions = currentExecutions?.filter(e => 
        ['pending', 'completed'].includes(e.status)
      )?.length || 0;

      // Check limits
      if (todayExecutions >= this.config.max_daily_trades) {
        console.log(`📊 Daily trade limit reached: ${todayExecutions}/${this.config.max_daily_trades}`);
        return;
      }

      if (activePositions >= this.config.max_concurrent_trades) {
        console.log(`📊 Concurrent trade limit reached: ${activePositions}/${this.config.max_concurrent_trades}`);
        return;
      }

      // Execute trades for top signals
      const signalsToExecute = filteredSignals.slice(0, 
        Math.min(
          this.config.max_concurrent_trades - activePositions,
          this.config.max_daily_trades - todayExecutions,
          3 // Max 3 at once for safety
        )
      );

      if (signalsToExecute.length > 0) {
        console.log(`🚀 Executing ${signalsToExecute.length} signals automatically`);
        
        // Call the trading executor
        const { data, error: executeError } = await supabase.functions.invoke(
          'automated-trading-executor',
          {
            body: {
              signals: signalsToExecute,
              user_id: userId || 'anonymous'
            }
          }
        );

        if (executeError) {
          console.error('Auto trading execution error:', executeError);
        } else {
          console.log(`✅ Auto trading results:`, data);
          
          if (data.successful_executions > 0) {
            this.toast?.({
              title: "🎉 Auto Trade Executed",
              description: `Successfully executed ${data.successful_executions} trades`,
            });
          }
        }
      }

    } catch (error) {
      console.error('Error in auto trading signal processing:', error);
    }
  }

  isEngineRunning(): boolean {
    return this.isRunning;
  }

  getConfig(): AutoTradingConfig | null {
    return this.config;
  }

  async getExecutionHistory(userId?: string): Promise<TradingExecution[]> {
    try {
      const { data, error } = await supabase
        .from('trading_executions')
        .select('*')
        .eq('user_id', userId || 'anonymous')
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch execution history:', error);
      return [];
    }
  }
}