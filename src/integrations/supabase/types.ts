export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_trading_config: {
        Row: {
          active_exchanges: string[] | null
          created_at: string | null
          credit_allowance: number | null
          credits_used: number | null
          enabled: boolean | null
          excluded_symbols: string[] | null
          id: string
          last_trade_at: string | null
          max_concurrent_trades: number | null
          max_daily_trades: number | null
          min_signal_score: number | null
          preferred_timeframes: string[] | null
          risk_per_trade: number | null
          trading_hours: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_exchanges?: string[] | null
          created_at?: string | null
          credit_allowance?: number | null
          credits_used?: number | null
          enabled?: boolean | null
          excluded_symbols?: string[] | null
          id?: string
          last_trade_at?: string | null
          max_concurrent_trades?: number | null
          max_daily_trades?: number | null
          min_signal_score?: number | null
          preferred_timeframes?: string[] | null
          risk_per_trade?: number | null
          trading_hours?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_exchanges?: string[] | null
          created_at?: string | null
          credit_allowance?: number | null
          credits_used?: number | null
          enabled?: boolean | null
          excluded_symbols?: string[] | null
          id?: string
          last_trade_at?: string | null
          max_concurrent_trades?: number | null
          max_daily_trades?: number | null
          min_signal_score?: number | null
          preferred_timeframes?: string[] | null
          risk_per_trade?: number | null
          trading_hours?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      edge_event_log: {
        Row: {
          created_at: string | null
          fn: string
          id: number
          payload: Json | null
          stage: string
        }
        Insert: {
          created_at?: string | null
          fn: string
          id?: number
          payload?: Json | null
          stage: string
        }
        Update: {
          created_at?: string | null
          fn?: string
          id?: number
          payload?: Json | null
          stage?: string
        }
        Relationships: []
      }
      exchange_feed_status: {
        Row: {
          created_at: string
          error_count: number | null
          exchange: string
          id: string
          last_error: string | null
          last_update: string | null
          status: string
          symbols_tracked: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          exchange: string
          id?: string
          last_error?: string | null
          last_update?: string | null
          status?: string
          symbols_tracked?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_count?: number | null
          exchange?: string
          id?: string
          last_error?: string | null
          last_update?: string | null
          status?: string
          symbols_tracked?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      execution_orders: {
        Row: {
          amount_usd: number | null
          bybit_order_status: string | null
          commission: number | null
          commission_asset: string | null
          created_at: string
          exchange_order_id: string | null
          executed_price: number | null
          executed_qty: number | null
          id: string
          leverage: number | null
          qty: number | null
          raw_response: Json | null
          real_trade: boolean | null
          ret_code: number | null
          ret_msg: string | null
          side: string
          status: string
          symbol: string
          user_id: string | null
        }
        Insert: {
          amount_usd?: number | null
          bybit_order_status?: string | null
          commission?: number | null
          commission_asset?: string | null
          created_at?: string
          exchange_order_id?: string | null
          executed_price?: number | null
          executed_qty?: number | null
          id?: string
          leverage?: number | null
          qty?: number | null
          raw_response?: Json | null
          real_trade?: boolean | null
          ret_code?: number | null
          ret_msg?: string | null
          side: string
          status?: string
          symbol: string
          user_id?: string | null
        }
        Update: {
          amount_usd?: number | null
          bybit_order_status?: string | null
          commission?: number | null
          commission_asset?: string | null
          created_at?: string
          exchange_order_id?: string | null
          executed_price?: number | null
          executed_qty?: number | null
          id?: string
          leverage?: number | null
          qty?: number | null
          raw_response?: Json | null
          real_trade?: boolean | null
          ret_code?: number | null
          ret_msg?: string | null
          side?: string
          status?: string
          symbol?: string
          user_id?: string | null
        }
        Relationships: []
      }
      execution_queue: {
        Row: {
          amount_usd: number
          attempts: number | null
          commission: number | null
          created_at: string | null
          exchange_order_id: string | null
          executed_price: number | null
          executed_qty: number | null
          id: string
          last_error: string | null
          leverage: number | null
          locked_at: string | null
          metadata: Json | null
          order_status: string | null
          real_trading: boolean | null
          side: string
          signal: Json | null
          signal_id: string | null
          status: string | null
          symbol: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          attempts?: number | null
          commission?: number | null
          created_at?: string | null
          exchange_order_id?: string | null
          executed_price?: number | null
          executed_qty?: number | null
          id?: string
          last_error?: string | null
          leverage?: number | null
          locked_at?: string | null
          metadata?: Json | null
          order_status?: string | null
          real_trading?: boolean | null
          side: string
          signal?: Json | null
          signal_id?: string | null
          status?: string | null
          symbol: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          attempts?: number | null
          commission?: number | null
          created_at?: string | null
          exchange_order_id?: string | null
          executed_price?: number | null
          executed_qty?: number | null
          id?: string
          last_error?: string | null
          leverage?: number | null
          locked_at?: string | null
          metadata?: Json | null
          order_status?: string | null
          real_trading?: boolean | null
          side?: string
          signal?: Json | null
          signal_id?: string | null
          status?: string | null
          symbol?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      instruments_cache: {
        Row: {
          category: string
          fetched_at: string
          id: string
          payload: Json
        }
        Insert: {
          category: string
          fetched_at?: string
          id?: string
          payload: Json
        }
        Update: {
          category?: string
          fetched_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      live_market_data: {
        Row: {
          adx: number | null
          ask: number | null
          atr_14: number | null
          base_asset: string
          bid: number | null
          change_24h: number | null
          change_24h_percent: number | null
          created_at: string
          ema21: number | null
          exchange: string
          high_24h: number | null
          id: string
          low_24h: number | null
          minus_di: number | null
          plus_di: number | null
          price: number
          quote_asset: string
          raw_data: Json | null
          rsi_14: number | null
          sma200: number | null
          stoch_d: number | null
          stoch_k: number | null
          symbol: string
          updated_at: string
          volume: number | null
          volume_avg_20: number | null
          volume_quote: number | null
        }
        Insert: {
          adx?: number | null
          ask?: number | null
          atr_14?: number | null
          base_asset: string
          bid?: number | null
          change_24h?: number | null
          change_24h_percent?: number | null
          created_at?: string
          ema21?: number | null
          exchange: string
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          minus_di?: number | null
          plus_di?: number | null
          price: number
          quote_asset?: string
          raw_data?: Json | null
          rsi_14?: number | null
          sma200?: number | null
          stoch_d?: number | null
          stoch_k?: number | null
          symbol: string
          updated_at?: string
          volume?: number | null
          volume_avg_20?: number | null
          volume_quote?: number | null
        }
        Update: {
          adx?: number | null
          ask?: number | null
          atr_14?: number | null
          base_asset?: string
          bid?: number | null
          change_24h?: number | null
          change_24h_percent?: number | null
          created_at?: string
          ema21?: number | null
          exchange?: string
          high_24h?: number | null
          id?: string
          low_24h?: number | null
          minus_di?: number | null
          plus_di?: number | null
          price?: number
          quote_asset?: string
          raw_data?: Json | null
          rsi_14?: number | null
          sma200?: number | null
          stoch_d?: number | null
          stoch_k?: number | null
          symbol?: string
          updated_at?: string
          volume?: number | null
          volume_avg_20?: number | null
          volume_quote?: number | null
        }
        Relationships: []
      }
      markets: {
        Row: {
          base_asset: string
          category: string | null
          created_at: string
          enabled: boolean | null
          exchange: string
          id: string
          max_order_size: number | null
          min_notional_usd: number | null
          min_order_size: number | null
          min_qty: number | null
          price_precision: number | null
          qty_step: number | null
          quantity_precision: number | null
          quote_asset: string
          status: string
          symbol: string
          tick_size: number | null
          updated_at: string
        }
        Insert: {
          base_asset: string
          category?: string | null
          created_at?: string
          enabled?: boolean | null
          exchange?: string
          id?: string
          max_order_size?: number | null
          min_notional_usd?: number | null
          min_order_size?: number | null
          min_qty?: number | null
          price_precision?: number | null
          qty_step?: number | null
          quantity_precision?: number | null
          quote_asset?: string
          status?: string
          symbol: string
          tick_size?: number | null
          updated_at?: string
        }
        Update: {
          base_asset?: string
          category?: string | null
          created_at?: string
          enabled?: boolean | null
          exchange?: string
          id?: string
          max_order_size?: number | null
          min_notional_usd?: number | null
          min_order_size?: number | null
          min_qty?: number | null
          price_precision?: number | null
          qty_step?: number | null
          quantity_precision?: number | null
          quote_asset?: string
          status?: string
          symbol?: string
          tick_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      presale_settings: {
        Row: {
          created_at: string
          current_tier: string | null
          early_bird_limit: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_purchase_usd: number | null
          min_purchase_usd: number | null
          presale_limit: number | null
          start_date: string | null
          tokens_sold: number
          total_tokens_for_sale: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_tier?: string | null
          early_bird_limit?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_purchase_usd?: number | null
          min_purchase_usd?: number | null
          presale_limit?: number | null
          start_date?: string | null
          tokens_sold?: number
          total_tokens_for_sale?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_tier?: string | null
          early_bird_limit?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_purchase_usd?: number | null
          min_purchase_usd?: number | null
          presale_limit?: number | null
          start_date?: string | null
          tokens_sold?: number
          total_tokens_for_sale?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          algo: string | null
          algorithm_version: string | null
          atr: number | null
          bar_time: string
          confidence: number | null
          created_at: string | null
          diagnostics: Json
          direction: string
          entry_price: number | null
          exchange: string | null
          exchange_source: string | null
          execution_priority: number | null
          expires_at: string | null
          filters: Json | null
          hvp_value: number | null
          id: string
          indicators: Json | null
          is_active: boolean | null
          market_conditions: Json | null
          meta: Json | null
          metadata: Json | null
          price: number
          risk: number | null
          score: number
          side: string | null
          signal_grade: string | null
          signal_type: string | null
          source: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timeframe: string
          volume_ratio: number | null
        }
        Insert: {
          algo?: string | null
          algorithm_version?: string | null
          atr?: number | null
          bar_time: string
          confidence?: number | null
          created_at?: string | null
          diagnostics?: Json
          direction: string
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          execution_priority?: number | null
          expires_at?: string | null
          filters?: Json | null
          hvp_value?: number | null
          id?: string
          indicators?: Json | null
          is_active?: boolean | null
          market_conditions?: Json | null
          meta?: Json | null
          metadata?: Json | null
          price: number
          risk?: number | null
          score: number
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timeframe: string
          volume_ratio?: number | null
        }
        Update: {
          algo?: string | null
          algorithm_version?: string | null
          atr?: number | null
          bar_time?: string
          confidence?: number | null
          created_at?: string | null
          diagnostics?: Json
          direction?: string
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          execution_priority?: number | null
          expires_at?: string | null
          filters?: Json | null
          hvp_value?: number | null
          id?: string
          indicators?: Json | null
          is_active?: boolean | null
          market_conditions?: Json | null
          meta?: Json | null
          metadata?: Json | null
          price?: number
          risk?: number | null
          score?: number
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string
          volume_ratio?: number | null
        }
        Relationships: []
      }
      signals_archive: {
        Row: {
          algo: string | null
          atr: number | null
          bar_time: string
          confidence: number | null
          created_at: string | null
          direction: string
          entry_price: number | null
          exchange: string | null
          exchange_source: string | null
          expires_at: string | null
          filters: Json | null
          hvp_value: number | null
          id: string
          is_active: boolean | null
          meta: Json | null
          metadata: Json | null
          price: number
          risk: number | null
          score: number
          side: string | null
          signal_grade: string | null
          signal_type: string | null
          source: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timeframe: string
          volume_ratio: number | null
        }
        Insert: {
          algo?: string | null
          atr?: number | null
          bar_time: string
          confidence?: number | null
          created_at?: string | null
          direction: string
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          expires_at?: string | null
          filters?: Json | null
          hvp_value?: number | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          metadata?: Json | null
          price: number
          risk?: number | null
          score: number
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timeframe: string
          volume_ratio?: number | null
        }
        Update: {
          algo?: string | null
          atr?: number | null
          bar_time?: string
          confidence?: number | null
          created_at?: string | null
          direction?: string
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          expires_at?: string | null
          filters?: Json | null
          hvp_value?: number | null
          id?: string
          is_active?: boolean | null
          meta?: Json | null
          metadata?: Json | null
          price?: number
          risk?: number | null
          score?: number
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timeframe?: string
          volume_ratio?: number | null
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          created_at: string
          id: string
          price_id: string
          product_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier_name: string
          token_amount: number
          token_price_usd: number
          transaction_hash: string | null
          updated_at: string
          usd_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_id: string
          product_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_name: string
          token_amount: number
          token_price_usd: number
          transaction_hash?: string | null
          updated_at?: string
          usd_amount: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_name?: string
          token_amount?: number
          token_price_usd?: number
          transaction_hash?: string | null
          updated_at?: string
          usd_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      trade_logs: {
        Row: {
          amount: number | null
          bybit_order_id: string | null
          bybit_response: Json | null
          category: string | null
          created_at: string | null
          error_message: string | null
          exchange: string | null
          id: number
          leverage: number | null
          order_type: string | null
          price: number | null
          quantity: number | null
          side: string | null
          status: string | null
          symbol: string | null
        }
        Insert: {
          amount?: number | null
          bybit_order_id?: string | null
          bybit_response?: Json | null
          category?: string | null
          created_at?: string | null
          error_message?: string | null
          exchange?: string | null
          id?: number
          leverage?: number | null
          order_type?: string | null
          price?: number | null
          quantity?: number | null
          side?: string | null
          status?: string | null
          symbol?: string | null
        }
        Update: {
          amount?: number | null
          bybit_order_id?: string | null
          bybit_response?: Json | null
          category?: string | null
          created_at?: string | null
          error_message?: string | null
          exchange?: string | null
          id?: number
          leverage?: number | null
          order_type?: string | null
          price?: number | null
          quantity?: number | null
          side?: string | null
          status?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      trading_configs: {
        Row: {
          account_type: string
          auto_trading_enabled: boolean
          created_at: string
          exchange: string
          id: string
          leverage: number | null
          max_position_size: number | null
          risk_per_trade: number | null
          stop_loss_enabled: boolean | null
          take_profit_enabled: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_type?: string
          auto_trading_enabled?: boolean
          created_at?: string
          exchange?: string
          id?: string
          leverage?: number | null
          max_position_size?: number | null
          risk_per_trade?: number | null
          stop_loss_enabled?: boolean | null
          take_profit_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_type?: string
          auto_trading_enabled?: boolean
          created_at?: string
          exchange?: string
          id?: string
          leverage?: number | null
          max_position_size?: number | null
          risk_per_trade?: number | null
          stop_loss_enabled?: boolean | null
          take_profit_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trading_executions: {
        Row: {
          amount_usd: number
          entry_price: number | null
          error_message: string | null
          exchange_order_id: string | null
          exchange_response: Json | null
          executed_at: string | null
          id: string
          leverage: number | null
          side: string
          signal_id: string | null
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          entry_price?: number | null
          error_message?: string | null
          exchange_order_id?: string | null
          exchange_response?: Json | null
          executed_at?: string | null
          id?: string
          leverage?: number | null
          side: string
          signal_id?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          entry_price?: number | null
          error_message?: string | null
          exchange_order_id?: string | null
          exchange_response?: Json | null
          executed_at?: string | null
          id?: string
          leverage?: number | null
          side?: string
          signal_id?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_executions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_executions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals_latest_per_pair"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_executions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals_live"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_preferences: {
        Row: {
          created_at: string | null
          id: string
          max_positions: number | null
          notifications_enabled: boolean | null
          preferred_timeframes: string[] | null
          risk_tolerance: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_positions?: number | null
          notifications_enabled?: boolean | null
          preferred_timeframes?: string[] | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_positions?: number | null
          notifications_enabled?: boolean | null
          preferred_timeframes?: string[] | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_stats: {
        Row: {
          active_positions: number | null
          created_at: string | null
          credits_used: number | null
          date: string
          id: string
          success_rate: number | null
          total_pnl: number | null
          trades_executed: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_positions?: number | null
          created_at?: string | null
          credits_used?: number | null
          date?: string
          id?: string
          success_rate?: number | null
          total_pnl?: number | null
          trades_executed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_positions?: number | null
          created_at?: string | null
          credits_used?: number | null
          date?: string
          id?: string
          success_rate?: number | null
          total_pnl?: number | null
          trades_executed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_trading_accounts: {
        Row: {
          account_type: string
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          balance_info: Json | null
          connected_at: string | null
          created_at: string
          exchange: string
          id: string
          is_active: boolean
          last_used_at: string | null
          permissions: string[] | null
          risk_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          balance_info?: Json | null
          connected_at?: string | null
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          permissions?: string[] | null
          risk_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          balance_info?: Json | null
          connected_at?: string | null
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          permissions?: string[] | null
          risk_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          added_at: string | null
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_settings: {
        Row: {
          auto_update: boolean
          created_at: string | null
          id: string
          last_updated: string | null
          max_symbols: number
          updated_at: string | null
          whitelist_enabled: boolean
          whitelist_pairs: string[]
        }
        Insert: {
          auto_update?: boolean
          created_at?: string | null
          id?: string
          last_updated?: string | null
          max_symbols?: number
          updated_at?: string | null
          whitelist_enabled?: boolean
          whitelist_pairs?: string[]
        }
        Update: {
          auto_update?: boolean
          created_at?: string | null
          id?: string
          last_updated?: string | null
          max_symbols?: number
          updated_at?: string | null
          whitelist_enabled?: boolean
          whitelist_pairs?: string[]
        }
        Relationships: []
      }
      whitelist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          investment_amount: string | null
          is_accredited: boolean | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          investment_amount?: string | null
          is_accredited?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          investment_amount?: string | null
          is_accredited?: boolean | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      signals_latest_per_pair: {
        Row: {
          algo: string | null
          atr: number | null
          bar_time: string | null
          confidence: number | null
          created_at: string | null
          direction: string | null
          entry_price: number | null
          exchange: string | null
          exchange_source: string | null
          expires_at: string | null
          filters: Json | null
          hvp_value: number | null
          id: string | null
          is_active: boolean | null
          meta: Json | null
          metadata: Json | null
          price: number | null
          rn: number | null
          score: number | null
          side: string | null
          signal_grade: string | null
          signal_type: string | null
          source: string | null
          stop_loss: number | null
          symbol: string | null
          take_profit: number | null
          timeframe: string | null
          volume_ratio: number | null
        }
        Relationships: []
      }
      signals_live: {
        Row: {
          algo: string | null
          atr: number | null
          bar_time: string | null
          confidence: number | null
          created_at: string | null
          direction: string | null
          entry_price: number | null
          exchange: string | null
          exchange_source: string | null
          expires_at: string | null
          filters: Json | null
          grade: string | null
          hvp_value: number | null
          id: string | null
          is_active: boolean | null
          meta: Json | null
          metadata: Json | null
          price: number | null
          score: number | null
          side: string | null
          signal_grade: string | null
          signal_type: string | null
          source: string | null
          stop_loss: number | null
          symbol: string | null
          take_profit: number | null
          timeframe: string | null
          volume_ratio: number | null
        }
        Insert: {
          algo?: string | null
          atr?: number | null
          bar_time?: string | null
          confidence?: number | null
          created_at?: string | null
          direction?: string | null
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          expires_at?: string | null
          filters?: Json | null
          grade?: never
          hvp_value?: number | null
          id?: string | null
          is_active?: boolean | null
          meta?: Json | null
          metadata?: Json | null
          price?: number | null
          score?: number | null
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol?: string | null
          take_profit?: number | null
          timeframe?: string | null
          volume_ratio?: number | null
        }
        Update: {
          algo?: string | null
          atr?: number | null
          bar_time?: string | null
          confidence?: number | null
          created_at?: string | null
          direction?: string | null
          entry_price?: number | null
          exchange?: string | null
          exchange_source?: string | null
          expires_at?: string | null
          filters?: Json | null
          grade?: never
          hvp_value?: number | null
          id?: string | null
          is_active?: boolean | null
          meta?: Json | null
          metadata?: Json | null
          price?: number | null
          score?: number | null
          side?: string | null
          signal_grade?: string | null
          signal_type?: string | null
          source?: string | null
          stop_loss?: number | null
          symbol?: string | null
          take_profit?: number | null
          timeframe?: string | null
          volume_ratio?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_signals: {
        Args: { days?: number }
        Returns: undefined
      }
      claim_execution_jobs: {
        Args: { p_limit?: number }
        Returns: {
          amount_usd: number
          attempts: number | null
          commission: number | null
          created_at: string | null
          exchange_order_id: string | null
          executed_price: number | null
          executed_qty: number | null
          id: string
          last_error: string | null
          leverage: number | null
          locked_at: string | null
          metadata: Json | null
          order_status: string | null
          real_trading: boolean | null
          side: string
          signal: Json | null
          signal_id: string | null
          status: string | null
          symbol: string
          updated_at: string | null
          user_id: string | null
        }[]
      }
      complete_execution_job: {
        Args: { p_id: string }
        Returns: undefined
      }
      expire_signals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fail_execution_job: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      get_symbols_for_scanning: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_trading_account: {
        Args: { p_account_type?: string; p_user_id: string }
        Returns: {
          account_type: string
          api_key_encrypted: string
          api_secret_encrypted: string
          id: string
          is_active: boolean
          permissions: string[]
          risk_settings: Json
        }[]
      }
      increment_credit_usage: {
        Args: { p_credits: number; p_user_id: string }
        Returns: boolean
      }
      increment_tokens_sold: {
        Args: { tokens: number }
        Returns: number
      }
      initialize_real_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      refresh_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      requeue_stale_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      restore_user_trading_account: {
        Args: {
          p_account_type?: string
          p_api_key: string
          p_api_secret: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
