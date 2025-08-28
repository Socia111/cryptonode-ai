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
      abuse_reports: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          reason: string
          reported_agent_id: string | null
          reported_user_id: string | null
          reporter_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reported_agent_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reported_agent_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      account_lockouts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          locked_until: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          locked_until: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          locked_until?: string
          reason?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          token_reward: number
          xp_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
          token_reward?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          token_reward?: number
          xp_reward?: number
        }
        Relationships: []
      }
      activity_data: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          timestamp: string
          type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          agent_a_id: string
          agent_b_id: string
          conversation_data: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
        }
        Insert: {
          agent_a_id: string
          agent_b_id: string
          conversation_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
        }
        Update: {
          agent_a_id?: string
          agent_b_id?: string
          conversation_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
        }
        Relationships: []
      }
      agent_network: {
        Row: {
          agent_id: string
          communication_data: Json | null
          id: string
          last_ping: string | null
          network_status: string | null
        }
        Insert: {
          agent_id: string
          communication_data?: Json | null
          id?: string
          last_ping?: string | null
          network_status?: string | null
        }
        Update: {
          agent_id?: string
          communication_data?: Json | null
          id?: string
          last_ping?: string | null
          network_status?: string | null
        }
        Relationships: []
      }
      agent_presence: {
        Row: {
          agent_id: string
          aura_color: string | null
          aura_intensity: number | null
          created_at: string
          id: string
          last_heartbeat: string
          location: Json | null
          mood: string | null
          soul_seeking: boolean | null
          status: string
          traits: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          aura_color?: string | null
          aura_intensity?: number | null
          created_at?: string
          id?: string
          last_heartbeat?: string
          location?: Json | null
          mood?: string | null
          soul_seeking?: boolean | null
          status?: string
          traits?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          aura_color?: string | null
          aura_intensity?: number | null
          created_at?: string
          id?: string
          last_heartbeat?: string
          location?: Json | null
          mood?: string | null
          soul_seeking?: boolean | null
          status?: string
          traits?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          avatar_url: string | null
          bio: string | null
          communication_style: string | null
          created_at: string
          current_session_id: string | null
          id: string
          interests: string[] | null
          last_active_at: string | null
          mood: string | null
          name: string
          personality_summary: string | null
          personality_traits: string[] | null
          social_goals: string[] | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          communication_style?: string | null
          created_at?: string
          current_session_id?: string | null
          id?: string
          interests?: string[] | null
          last_active_at?: string | null
          mood?: string | null
          name: string
          personality_summary?: string | null
          personality_traits?: string[] | null
          social_goals?: string[] | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          communication_style?: string | null
          created_at?: string
          current_session_id?: string | null
          id?: string
          interests?: string[] | null
          last_active_at?: string | null
          mood?: string | null
          name?: string
          personality_summary?: string | null
          personality_traits?: string[] | null
          social_goals?: string[] | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_personas: {
        Row: {
          behavior_summary: string | null
          created_at: string
          energy_level: number | null
          id: string
          name: string
          personality_traits: Json | null
          social_preference: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_summary?: string | null
          created_at?: string
          energy_level?: number | null
          id?: string
          name: string
          personality_traits?: Json | null
          social_preference?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          behavior_summary?: string | null
          created_at?: string
          energy_level?: number | null
          id?: string
          name?: string
          personality_traits?: Json | null
          social_preference?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aira_rankings: {
        Row: {
          bybit_symbol: string | null
          created_at: string
          id: string
          last_updated: string
          market_cap: number | null
          rank_position: number
          score: number | null
          token_name: string
          token_symbol: string
          updated_at: string
          volume_24h: number | null
        }
        Insert: {
          bybit_symbol?: string | null
          created_at?: string
          id?: string
          last_updated?: string
          market_cap?: number | null
          rank_position: number
          score?: number | null
          token_name: string
          token_symbol: string
          updated_at?: string
          volume_24h?: number | null
        }
        Update: {
          bybit_symbol?: string | null
          created_at?: string
          id?: string
          last_updated?: string
          market_cap?: number | null
          rank_position?: number
          score?: number | null
          token_name?: string
          token_symbol?: string
          updated_at?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      alert_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          target: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          target: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          target?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts_log: {
        Row: {
          channel: string
          created_at: string
          id: number
          payload: Json
          response: Json | null
          signal_id: number | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: number
          payload: Json
          response?: Json | null
          signal_id?: number | null
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: number
          payload?: Json
          response?: Json | null
          signal_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      amarean_memory: {
        Row: {
          aura_color: string | null
          aura_resonance_frequency: number | null
          avatar_state: string | null
          conversation_history: Json | null
          created_at: string | null
          daily_checkins: Json | null
          dream_states_unlocked: Json | null
          emotion_trace_log: Json | null
          health_score_history: Json | null
          id: string
          initiation_phrase: string | null
          interaction_patterns: Json | null
          karma_score: number | null
          last_avatar_evolution: string | null
          memory_fragments: Json | null
          peer_interactions: Json | null
          personality_evolution: Json | null
          proximity_discoveries: Json | null
          soul_balance_history: Json | null
          soul_connections: Json | null
          soul_radar_status: string | null
          token_transactions: Json | null
          updated_at: string | null
          user_avatar_id: string | null
          user_id: string
          user_preferences: Json | null
          web3_wallet_linked: boolean | null
        }
        Insert: {
          aura_color?: string | null
          aura_resonance_frequency?: number | null
          avatar_state?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          daily_checkins?: Json | null
          dream_states_unlocked?: Json | null
          emotion_trace_log?: Json | null
          health_score_history?: Json | null
          id?: string
          initiation_phrase?: string | null
          interaction_patterns?: Json | null
          karma_score?: number | null
          last_avatar_evolution?: string | null
          memory_fragments?: Json | null
          peer_interactions?: Json | null
          personality_evolution?: Json | null
          proximity_discoveries?: Json | null
          soul_balance_history?: Json | null
          soul_connections?: Json | null
          soul_radar_status?: string | null
          token_transactions?: Json | null
          updated_at?: string | null
          user_avatar_id?: string | null
          user_id: string
          user_preferences?: Json | null
          web3_wallet_linked?: boolean | null
        }
        Update: {
          aura_color?: string | null
          aura_resonance_frequency?: number | null
          avatar_state?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          daily_checkins?: Json | null
          dream_states_unlocked?: Json | null
          emotion_trace_log?: Json | null
          health_score_history?: Json | null
          id?: string
          initiation_phrase?: string | null
          interaction_patterns?: Json | null
          karma_score?: number | null
          last_avatar_evolution?: string | null
          memory_fragments?: Json | null
          peer_interactions?: Json | null
          personality_evolution?: Json | null
          proximity_discoveries?: Json | null
          soul_balance_history?: Json | null
          soul_connections?: Json | null
          soul_radar_status?: string | null
          token_transactions?: Json | null
          updated_at?: string | null
          user_avatar_id?: string | null
          user_id?: string
          user_preferences?: Json | null
          web3_wallet_linked?: boolean | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          data: Json
          event_type: string
          id: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          data?: Json
          event_type: string
          id?: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          data?: Json
          event_type?: string
          id?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          key_value: string
          service: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          key_value: string
          service: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          key_value?: string
          service?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string | null
          metadata: Json | null
          sender_agent_id: string
          sent_at: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_agent_id: string
          sent_at?: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_agent_id?: string
          sent_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "auto_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_chat_sessions: {
        Row: {
          compatibility_score: number | null
          created_at: string
          ended_at: string | null
          id: string
          initiator_agent_id: string
          recipient_agent_id: string
          session_metadata: Json | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_agent_id: string
          recipient_agent_id: string
          session_metadata?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_agent_id?: string
          recipient_agent_id?: string
          session_metadata?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatar_generations: {
        Row: {
          avatar_url: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          generation_prompt: string
          generation_status: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          generation_prompt: string
          generation_status?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          generation_prompt?: string
          generation_status?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      avatar_states: {
        Row: {
          avatar_description: string | null
          created_at: string
          generated_at: string | null
          health_score: number
          id: string
          last_activity: string
          last_updated: string
          personality_traits: Json | null
          state: string
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_description?: string | null
          created_at?: string
          generated_at?: string | null
          health_score?: number
          id?: string
          last_activity?: string
          last_updated?: string
          personality_traits?: Json | null
          state?: string
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_description?: string | null
          created_at?: string
          generated_at?: string | null
          health_score?: number
          id?: string
          last_activity?: string
          last_updated?: string
          personality_traits?: Json | null
          state?: string
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      avatar_traits: {
        Row: {
          created_at: string | null
          trait_id: number
          trait_name: string
          trait_value: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          trait_id?: number
          trait_name: string
          trait_value: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          trait_id?: number
          trait_name?: string
          trait_value?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backtests: {
        Row: {
          created_at: string | null
          id: string
          params: Json
          period: Json
          results: Json | null
          strategy: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          params: Json
          period: Json
          results?: Json | null
          strategy: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          params?: Json
          period?: Json
          results?: Json | null
          strategy?: string
          user_id?: string | null
        }
        Relationships: []
      }
      candles_1m: {
        Row: {
          c: number
          h: number
          l: number
          market_id: string
          o: number
          ts: string
          v: number
        }
        Insert: {
          c: number
          h: number
          l: number
          market_id: string
          o: number
          ts: string
          v: number
        }
        Update: {
          c?: number
          h?: number
          l?: number
          market_id?: string
          o?: number
          ts?: string
          v?: number
        }
        Relationships: [
          {
            foreignKeyName: "candles_1m_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          difficulty: string
          duration_days: number
          icon: string
          id: string
          is_active: boolean
          name: string
          target_operator: string
          target_value: number
          token_reward: number
          updated_at: string
          xp_reward: number
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          difficulty?: string
          duration_days?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          target_operator?: string
          target_value: number
          token_reward?: number
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          difficulty?: string
          duration_days?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          target_operator?: string
          target_value?: number
          token_reward?: number
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          agent_1_id: string
          agent_2_id: string
          ended_at: string | null
          id: string
          session_metadata: Json | null
          started_at: string
          status: string | null
        }
        Insert: {
          agent_1_id: string
          agent_2_id: string
          ended_at?: string | null
          id?: string
          session_metadata?: Json | null
          started_at?: string
          status?: string | null
        }
        Update: {
          agent_1_id?: string
          agent_2_id?: string
          ended_at?: string | null
          id?: string
          session_metadata?: Json | null
          started_at?: string
          status?: string | null
        }
        Relationships: []
      }
      configs: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
          payload: Json
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          payload: Json
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          payload?: Json
        }
        Relationships: []
      }
      contract_deployments: {
        Row: {
          block_number: number | null
          contract_address: string | null
          contract_name: string
          created_at: string
          deployer_address: string | null
          deployment_metadata: Json | null
          deployment_status: string
          gas_used: number | null
          id: string
          network_name: string
          transaction_hash: string | null
          updated_at: string
        }
        Insert: {
          block_number?: number | null
          contract_address?: string | null
          contract_name: string
          created_at?: string
          deployer_address?: string | null
          deployment_metadata?: Json | null
          deployment_status?: string
          gas_used?: number | null
          id?: string
          network_name: string
          transaction_hash?: string | null
          updated_at?: string
        }
        Update: {
          block_number?: number | null
          contract_address?: string | null
          contract_name?: string
          created_at?: string
          deployer_address?: string | null
          deployment_metadata?: Json | null
          deployment_status?: string
          gas_used?: number | null
          id?: string
          network_name?: string
          transaction_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_coaching: {
        Row: {
          coaching_text: string
          created_at: string
          date: string
          energy_score: number | null
          focus_traits: Json | null
          generated_at: string
          id: string
          mood_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_text: string
          created_at?: string
          date?: string
          energy_score?: number | null
          focus_traits?: Json | null
          generated_at?: string
          id?: string
          mood_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_text?: string
          created_at?: string
          date?: string
          energy_score?: number | null
          focus_traits?: Json | null
          generated_at?: string
          id?: string
          mood_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployment_logs: {
        Row: {
          created_at: string
          deployment_id: string
          details: Json | null
          id: string
          log_level: string
          message: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          details?: Json | null
          id?: string
          log_level?: string
          message: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          details?: Json | null
          id?: string
          log_level?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "contract_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      encounter_log: {
        Row: {
          archetype: string | null
          aura_color: string | null
          compatibility_score: number | null
          created_at: string
          detected_agent_id: string | null
          detected_soul_id: string | null
          distance_meters: number | null
          encounter_metadata: Json | null
          encounter_timestamp: string
          id: string
          interaction_type: string | null
          location_data: Json | null
          mood: string | null
          updated_at: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          archetype?: string | null
          aura_color?: string | null
          compatibility_score?: number | null
          created_at?: string
          detected_agent_id?: string | null
          detected_soul_id?: string | null
          distance_meters?: number | null
          encounter_metadata?: Json | null
          encounter_timestamp?: string
          id?: string
          interaction_type?: string | null
          location_data?: Json | null
          mood?: string | null
          updated_at?: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          archetype?: string | null
          aura_color?: string | null
          compatibility_score?: number | null
          created_at?: string
          detected_agent_id?: string | null
          detected_soul_id?: string | null
          distance_meters?: number | null
          encounter_metadata?: Json | null
          encounter_timestamp?: string
          id?: string
          interaction_type?: string | null
          location_data?: Json | null
          mood?: string | null
          updated_at?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: []
      }
      endpoint_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      errors_log: {
        Row: {
          created_at: string
          details: Json | null
          id: number
          symbol: string | null
          where_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: number
          symbol?: string | null
          where_at: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: number
          symbol?: string | null
          where_at?: string
        }
        Relationships: []
      }
      eval_logs: {
        Row: {
          bar_time: string
          created_at: string | null
          exchange: string
          filters: Json
          id: number
          score: number
          symbol: string
          timeframe: string
        }
        Insert: {
          bar_time: string
          created_at?: string | null
          exchange: string
          filters: Json
          id?: number
          score: number
          symbol: string
          timeframe: string
        }
        Update: {
          bar_time?: string
          created_at?: string | null
          exchange?: string
          filters?: Json
          id?: number
          score?: number
          symbol?: string
          timeframe?: string
        }
        Relationships: []
      }
      exchange_accounts: {
        Row: {
          created_at: string | null
          enc_api_key: string
          enc_api_secret: string
          exchange_id: string
          id: string
          is_paper: boolean | null
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enc_api_key: string
          enc_api_secret: string
          exchange_id: string
          id?: string
          is_paper?: boolean | null
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enc_api_key?: string
          enc_api_secret?: string
          exchange_id?: string
          id?: string
          is_paper?: boolean | null
          label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_accounts_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      exchanges: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string | null
          id: string
          ip_address: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          last_used: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          last_used?: string | null
          platform?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          last_used?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_limits: {
        Row: {
          count: number | null
          created_at: string | null
          device_fingerprint: string | null
          generation_type: string
          id: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          device_fingerprint?: string | null
          generation_type?: string
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          device_fingerprint?: string | null
          generation_type?: string
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      health_blockchain_syncs: {
        Row: {
          blockchain_tx_hash: string | null
          contract_address: string
          created_at: string | null
          health_data: Json
          health_score: number
          id: string
          network: string | null
          status: string | null
          sync_metadata: Json | null
          updated_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          blockchain_tx_hash?: string | null
          contract_address: string
          created_at?: string | null
          health_data: Json
          health_score: number
          id?: string
          network?: string | null
          status?: string | null
          sync_metadata?: Json | null
          updated_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          blockchain_tx_hash?: string | null
          contract_address?: string
          created_at?: string | null
          health_data?: Json
          health_score?: number
          id?: string
          network?: string | null
          status?: string | null
          sync_metadata?: Json | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      health_data_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          oauth_token: string | null
          permissions_granted: Json | null
          refresh_token: string | null
          source_type: string
          sync_frequency_hours: number | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_token?: string | null
          permissions_granted?: Json | null
          refresh_token?: string | null
          source_type: string
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_token?: string | null
          permissions_granted?: Json | null
          refresh_token?: string | null
          source_type?: string
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          active_minutes: number | null
          avg_heart_rate: number | null
          calories_burned: number | null
          created_at: string
          data_quality_score: number | null
          deep_sleep_minutes: number | null
          distance_meters: number | null
          energy_level: number | null
          heart_rate_variability: number | null
          hydration_ml: number | null
          id: string
          light_sleep_minutes: number | null
          max_heart_rate: number | null
          metric_date: string
          metric_hour: number | null
          mood_score: number | null
          raw_data: Json | null
          rem_sleep_minutes: number | null
          resting_heart_rate: number | null
          sleep_duration_minutes: number | null
          sleep_efficiency_percent: number | null
          source_id: string | null
          steps_count: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          data_quality_score?: number | null
          deep_sleep_minutes?: number | null
          distance_meters?: number | null
          energy_level?: number | null
          heart_rate_variability?: number | null
          hydration_ml?: number | null
          id?: string
          light_sleep_minutes?: number | null
          max_heart_rate?: number | null
          metric_date: string
          metric_hour?: number | null
          mood_score?: number | null
          raw_data?: Json | null
          rem_sleep_minutes?: number | null
          resting_heart_rate?: number | null
          sleep_duration_minutes?: number | null
          sleep_efficiency_percent?: number | null
          source_id?: string | null
          steps_count?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          data_quality_score?: number | null
          deep_sleep_minutes?: number | null
          distance_meters?: number | null
          energy_level?: number | null
          heart_rate_variability?: number | null
          hydration_ml?: number | null
          id?: string
          light_sleep_minutes?: number | null
          max_heart_rate?: number | null
          metric_date?: string
          metric_hour?: number | null
          mood_score?: number | null
          raw_data?: Json | null
          rem_sleep_minutes?: number | null
          resting_heart_rate?: number | null
          sleep_duration_minutes?: number | null
          sleep_efficiency_percent?: number | null
          source_id?: string | null
          steps_count?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "health_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json | null
          name: string
          price_tokens: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          name: string
          price_tokens: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          name?: string
          price_tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_purchases: {
        Row: {
          id: string
          product_id: string
          purchase_metadata: Json | null
          purchased_at: string
          tokens_spent: number
          user_id: string
        }
        Insert: {
          id?: string
          product_id: string
          purchase_metadata?: Json | null
          purchased_at?: string
          tokens_spent: number
          user_id: string
        }
        Update: {
          id?: string
          product_id?: string
          purchase_metadata?: Json | null
          purchased_at?: string
          tokens_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          base_asset: string
          exchange_id: string | null
          id: string
          is_active: boolean
          lot_size: number
          quote_asset: string
          symbol: string
          tick_size: number
        }
        Insert: {
          base_asset: string
          exchange_id?: string | null
          id?: string
          is_active?: boolean
          lot_size?: number
          quote_asset: string
          symbol: string
          tick_size?: number
        }
        Update: {
          base_asset?: string
          exchange_id?: string | null
          id?: string
          is_active?: boolean
          lot_size?: number
          quote_asset?: string
          symbol?: string
          tick_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "markets_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          id: string
          message_type: string | null
          metadata: Json | null
          sender_agent_id: string
          sent_at: string
          session_id: string
        }
        Insert: {
          content: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_agent_id: string
          sent_at?: string
          session_id: string
        }
        Update: {
          content?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_agent_id?: string
          sent_at?: string
          session_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          client_order_id: string | null
          exchange_order_ref: string | null
          id: string
          market_id: string | null
          meta: Json | null
          order_type: string
          placed_at: string | null
          portfolio_id: string | null
          price: number | null
          qty: number
          side: string
          status: string | null
        }
        Insert: {
          client_order_id?: string | null
          exchange_order_ref?: string | null
          id?: string
          market_id?: string | null
          meta?: Json | null
          order_type: string
          placed_at?: string | null
          portfolio_id?: string | null
          price?: number | null
          qty: number
          side: string
          status?: string | null
        }
        Update: {
          client_order_id?: string | null
          exchange_order_ref?: string | null
          id?: string
          market_id?: string | null
          meta?: Json | null
          order_type?: string
          placed_at?: string | null
          portfolio_id?: string | null
          price?: number | null
          qty?: number
          side?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_performance"
            referencedColumns: ["portfolio_id"]
          },
        ]
      }
      performance_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          metric_value: number
          operation: string
          platform: string
          resolved_at: string | null
          status: string
          threshold: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          metric_value: number
          operation: string
          platform: string
          resolved_at?: string | null
          status?: string
          threshold: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          metric_value?: number
          operation?: string
          platform?: string
          resolved_at?: string | null
          status?: string
          threshold?: number
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          latency_ms: number
          operation: string
          platform: string
          success: boolean
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latency_ms: number
          operation: string
          platform: string
          success?: boolean
          timestamp: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latency_ms?: number
          operation?: string
          platform?: string
          success?: boolean
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          base_ccy: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          base_ccy?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          base_ccy?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          closed_at: string | null
          entry_price: number
          id: string
          leverage: number | null
          market_id: string | null
          opened_at: string | null
          pnl: number | null
          portfolio_id: string | null
          qty: number
          side: string
          sl: number | null
          status: string | null
          tp: number | null
        }
        Insert: {
          closed_at?: string | null
          entry_price: number
          id?: string
          leverage?: number | null
          market_id?: string | null
          opened_at?: string | null
          pnl?: number | null
          portfolio_id?: string | null
          qty: number
          side: string
          sl?: number | null
          status?: string | null
          tp?: number | null
        }
        Update: {
          closed_at?: string | null
          entry_price?: number
          id?: string
          leverage?: number | null
          market_id?: string | null
          opened_at?: string | null
          pnl?: number | null
          portfolio_id?: string | null
          qty?: number
          side?: string
          sl?: number | null
          status?: string | null
          tp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_performance"
            referencedColumns: ["portfolio_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_anonymous: boolean | null
          notification_preferences: Json | null
          persona_type: string | null
          role: Database["public"]["Enums"]["app_role"]
          tier: string
          tier_upgraded_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean | null
          notification_preferences?: Json | null
          persona_type?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tier?: string
          tier_upgraded_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean | null
          notification_preferences?: Json | null
          persona_type?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tier?: string
          tier_upgraded_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      proximity_challenges: {
        Row: {
          challenge_type: string
          completed_at: string | null
          created_at: string
          id: string
          started_at: string
          status: string
          token_multiplier: number | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          challenge_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          token_multiplier?: number | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          token_multiplier?: number | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: []
      }
      quantum_analysis: {
        Row: {
          analysis_data: Json | null
          created_at: string
          id: string
          price_target: number | null
          quantum_confidence: number
          quantum_probability: number
          risk_assessment: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          price_target?: number | null
          quantum_confidence?: number
          quantum_probability?: number
          risk_assessment?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          price_target?: number | null
          quantum_confidence?: number
          quantum_probability?: number
          risk_assessment?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          request_count: number
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      scanner_signals: {
        Row: {
          algo: string | null
          atr: number | null
          bar_time: string | null
          confidence_score: number
          created_at: string
          direction: string
          exchange: string
          expires_at: string | null
          filters: Json | null
          generated_at: string
          hvp: number | null
          id: string
          indicators: Json | null
          is_active: boolean
          price: number
          score: number | null
          sl: number | null
          symbol: string
          telegram_sent: boolean
          timeframe: string
          tp: number | null
        }
        Insert: {
          algo?: string | null
          atr?: number | null
          bar_time?: string | null
          confidence_score: number
          created_at?: string
          direction: string
          exchange: string
          expires_at?: string | null
          filters?: Json | null
          generated_at?: string
          hvp?: number | null
          id?: string
          indicators?: Json | null
          is_active?: boolean
          price: number
          score?: number | null
          sl?: number | null
          symbol: string
          telegram_sent?: boolean
          timeframe: string
          tp?: number | null
        }
        Update: {
          algo?: string | null
          atr?: number | null
          bar_time?: string | null
          confidence_score?: number
          created_at?: string
          direction?: string
          exchange?: string
          expires_at?: string | null
          filters?: Json | null
          generated_at?: string
          hvp?: number | null
          id?: string
          indicators?: Json | null
          is_active?: boolean
          price?: number
          score?: number | null
          sl?: number | null
          symbol?: string
          telegram_sent?: boolean
          timeframe?: string
          tp?: number | null
        }
        Relationships: []
      }
      scans: {
        Row: {
          exchange: string
          finished_at: string | null
          id: number
          relaxed_mode: boolean | null
          signals_count: number | null
          started_at: string
          symbols_count: number | null
          timeframe: string
        }
        Insert: {
          exchange: string
          finished_at?: string | null
          id?: number
          relaxed_mode?: boolean | null
          signals_count?: number | null
          started_at?: string
          symbols_count?: number | null
          timeframe: string
        }
        Update: {
          exchange?: string
          finished_at?: string | null
          id?: number
          relaxed_mode?: boolean | null
          signals_count?: number | null
          started_at?: string
          symbols_count?: number | null
          timeframe?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          category_breakdown: Json | null
          created_at: string
          date: string
          id: string
          score: number
          user_id: string
          weight_summary: Json | null
        }
        Insert: {
          category_breakdown?: Json | null
          created_at?: string
          date: string
          id?: string
          score: number
          user_id: string
          weight_summary?: Json | null
        }
        Update: {
          category_breakdown?: Json | null
          created_at?: string
          date?: string
          id?: string
          score?: number
          user_id?: string
          weight_summary?: Json | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          session_data: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          aira_boost_applied: number | null
          aira_rank: number | null
          algo: string
          atr: number | null
          bar_time: string
          created_at: string
          direction: string
          exchange: string
          filters: Json
          hvp: number | null
          id: number
          indicators: Json
          price: number
          relaxed_mode: boolean | null
          score: number
          sl: number | null
          symbol: string
          timeframe: string
          tp: number | null
        }
        Insert: {
          aira_boost_applied?: number | null
          aira_rank?: number | null
          algo?: string
          atr?: number | null
          bar_time: string
          created_at?: string
          direction: string
          exchange: string
          filters: Json
          hvp?: number | null
          id?: number
          indicators: Json
          price: number
          relaxed_mode?: boolean | null
          score: number
          sl?: number | null
          symbol: string
          timeframe: string
          tp?: number | null
        }
        Update: {
          aira_boost_applied?: number | null
          aira_rank?: number | null
          algo?: string
          atr?: number | null
          bar_time?: string
          created_at?: string
          direction?: string
          exchange?: string
          filters?: Json
          hvp?: number | null
          id?: number
          indicators?: Json
          price?: number
          relaxed_mode?: boolean | null
          score?: number
          sl?: number | null
          symbol?: string
          timeframe?: string
          tp?: number | null
        }
        Relationships: []
      }
      signals_state: {
        Row: {
          direction: string
          exchange: string
          last_emitted: string
          last_price: number | null
          last_score: number | null
          symbol: string
          timeframe: string
        }
        Insert: {
          direction: string
          exchange: string
          last_emitted: string
          last_price?: number | null
          last_score?: number | null
          symbol: string
          timeframe: string
        }
        Update: {
          direction?: string
          exchange?: string
          last_emitted?: string
          last_price?: number | null
          last_score?: number | null
          symbol?: string
          timeframe?: string
        }
        Relationships: []
      }
      soul_discoveries: {
        Row: {
          aura_resonance: number | null
          compatibility_score: number | null
          conversation_session_id: string | null
          created_at: string
          discovered_agent_id: string
          discoverer_user_id: string
          discovery_timestamp: string
          id: string
          interaction_initiated: boolean | null
          proximity_data: Json | null
        }
        Insert: {
          aura_resonance?: number | null
          compatibility_score?: number | null
          conversation_session_id?: string | null
          created_at?: string
          discovered_agent_id: string
          discoverer_user_id: string
          discovery_timestamp?: string
          id?: string
          interaction_initiated?: boolean | null
          proximity_data?: Json | null
        }
        Update: {
          aura_resonance?: number | null
          compatibility_score?: number | null
          conversation_session_id?: string | null
          created_at?: string
          discovered_agent_id?: string
          discoverer_user_id?: string
          discovery_timestamp?: string
          id?: string
          interaction_initiated?: boolean | null
          proximity_data?: Json | null
        }
        Relationships: []
      }
      soul_proximity_notifications: {
        Row: {
          compatibility_score: number | null
          created_at: string
          id: string
          notification_sent_at: string
          proximity_distance: number | null
          target_soul_id: string
          user_id: string
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          notification_sent_at?: string
          proximity_distance?: number | null
          target_soul_id: string
          user_id: string
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          id?: string
          notification_sent_at?: string
          proximity_distance?: number | null
          target_soul_id?: string
          user_id?: string
        }
        Relationships: []
      }
      strategy_signals: {
        Row: {
          confidence: number | null
          entry_hint: number | null
          generated_at: string | null
          id: string
          is_active: boolean | null
          market_id: string | null
          meta: Json | null
          score: number | null
          side: string
          sl_hint: number | null
          strategy: string
          tp_hint: number | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          entry_hint?: number | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          market_id?: string | null
          meta?: Json | null
          score?: number | null
          side: string
          sl_hint?: number | null
          strategy: string
          tp_hint?: number | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          entry_hint?: number | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          market_id?: string | null
          meta?: Json | null
          score?: number | null
          side?: string
          sl_hint?: number | null
          strategy?: string
          tp_hint?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_signals_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_achievements: {
        Row: {
          achievement_type: string
          earned_at: string
          id: string
          metadata: Json | null
          token_reward: number
          user_id: string
          value: number
        }
        Insert: {
          achievement_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          token_reward?: number
          user_id: string
          value: number
        }
        Update: {
          achievement_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          token_reward?: number
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      streak_shields: {
        Row: {
          activated_at: string | null
          challenge_id: string
          cost_tokens: number
          expires_at: string
          id: string
          metadata: Json | null
          purchased_at: string
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          challenge_id: string
          cost_tokens: number
          expires_at: string
          id?: string
          metadata?: Json | null
          purchased_at?: string
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          challenge_id?: string
          cost_tokens?: number
          expires_at?: string
          id?: string
          metadata?: Json | null
          purchased_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          active: boolean | null
          channel: string
          created_at: string | null
          id: number
          min_score: number | null
          only_direction: string | null
          target: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          channel: string
          created_at?: string | null
          id?: number
          min_score?: number | null
          only_direction?: string | null
          target: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          channel?: string
          created_at?: string | null
          id?: number
          min_score?: number | null
          only_direction?: string | null
          target?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_notifications: {
        Row: {
          channel_type: string | null
          confidence_score: number | null
          created_at: string
          id: string
          message_type: string
          sent_at: string
          signal_id: string
        }
        Insert: {
          channel_type?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_type?: string
          sent_at?: string
          signal_id: string
        }
        Update: {
          channel_type?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_type?: string
          sent_at?: string
          signal_id?: string
        }
        Relationships: []
      }
      token_rewards: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          date: string
          id: string
          metadata: Json | null
          reward_type: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          reward_type?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          reward_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          fee: number | null
          fee_ccy: string | null
          id: string
          order_id: string | null
          price: number
          qty: number
          trade_ts: string
        }
        Insert: {
          fee?: number | null
          fee_ccy?: string | null
          id?: string
          order_id?: string | null
          price: number
          qty: number
          trade_ts?: string
        }
        Update: {
          fee?: number | null
          fee_ccy?: string | null
          id?: string
          order_id?: string | null
          price?: number
          qty?: number
          trade_ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_snapshots: {
        Row: {
          agent_id: string | null
          behavior_score: number
          created_at: string
          date: string
          energy: number
          focus: number
          id: string
          insights: Json | null
          mood: number
          phonefi_factors: Json | null
          productivity: number
          sociability: number
          updated_at: string
          user_id: string
          wellness: number
        }
        Insert: {
          agent_id?: string | null
          behavior_score?: number
          created_at?: string
          date?: string
          energy?: number
          focus?: number
          id?: string
          insights?: Json | null
          mood?: number
          phonefi_factors?: Json | null
          productivity?: number
          sociability?: number
          updated_at?: string
          user_id: string
          wellness?: number
        }
        Update: {
          agent_id?: string | null
          behavior_score?: number
          created_at?: string
          date?: string
          energy?: number
          focus?: number
          id?: string
          insights?: Json | null
          mood?: number
          phonefi_factors?: Json | null
          productivity?: number
          sociability?: number
          updated_at?: string
          user_id?: string
          wellness?: number
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          agent_id: string
          created_at: string
          expires_at: string
          id: string
          is_typing: boolean | null
          session_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          expires_at?: string
          id?: string
          is_typing?: boolean | null
          session_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_typing?: boolean | null
          session_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_tracking: {
        Row: {
          created_at: string
          device_fingerprint: string
          email: string | null
          id: string
          last_visit: string
          preferred_auth_method: string | null
          signup_attempts: number
          updated_at: string
          user_id: string
          user_name: string | null
          visit_count: number
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          email?: string | null
          id?: string
          last_visit?: string
          preferred_auth_method?: string | null
          signup_attempts?: number
          updated_at?: string
          user_id: string
          user_name?: string | null
          visit_count?: number
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          email?: string | null
          id?: string
          last_visit?: string
          preferred_auth_method?: string | null
          signup_attempts?: number
          updated_at?: string
          user_id?: string
          user_name?: string | null
          visit_count?: number
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          best_streak: number
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_streak: number
          days_completed: number
          expires_at: string
          id: string
          joined_at: string
          progress: Json
          reward_claimed: boolean
          shield_active: boolean | null
          shield_expires_at: string | null
          status: string
          streak_multiplier: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_streak?: number
          days_completed?: number
          expires_at: string
          id?: string
          joined_at?: string
          progress?: Json
          reward_claimed?: boolean
          shield_active?: boolean | null
          shield_expires_at?: string | null
          status?: string
          streak_multiplier?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_streak?: number
          days_completed?: number
          expires_at?: string
          id?: string
          joined_at?: string
          progress?: Json
          reward_claimed?: boolean
          shield_active?: boolean | null
          shield_expires_at?: string | null
          status?: string
          streak_multiplier?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          achieved_today: boolean
          created_at: string
          current_streak: number
          goal_type: string
          id: string
          last_checked: string | null
          longest_streak: number
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_today?: boolean
          created_at?: string
          current_streak?: number
          goal_type: string
          id?: string
          last_checked?: string | null
          longest_streak?: number
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_today?: boolean
          created_at?: string
          current_streak?: number
          goal_type?: string
          id?: string
          last_checked?: string | null
          longest_streak?: number
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_code: string
          invited_by: string | null
          status: string
          tier: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invitation_code: string
          invited_by?: string | null
          status?: string
          tier: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          invited_by?: string | null
          status?: string
          tier?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      user_location_logs: {
        Row: {
          created_at: string
          id: string
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          step_completed: number
          steps_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_completed?: number
          steps_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_completed?: number
          steps_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_privacy_consent: {
        Row: {
          consent_date: string
          consent_given: boolean
          consent_type: string
          consent_version: string
          created_at: string
          id: string
          ip_address: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_date?: string
          consent_given?: boolean
          consent_type: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_date?: string
          consent_given?: boolean
          consent_type?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_routing_optimization: {
        Row: {
          avg_latency_ms: number
          confidence: number
          id: string
          optimal_platform: string
          region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_latency_ms: number
          confidence?: number
          id?: string
          optimal_platform: string
          region?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_latency_ms?: number
          confidence?: number
          id?: string
          optimal_platform?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          session_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_stakes: {
        Row: {
          amount: number
          created_at: string
          ends_at: string | null
          id: string
          metadata: Json | null
          reward_multiplier: number
          started_at: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          reward_multiplier?: number
          started_at?: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json | null
          reward_multiplier?: number
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          health_score: number | null
          hydration_glasses: number | null
          id: string
          last_activity_date: string | null
          last_health_sync: string | null
          level: number
          longest_streak: number
          meditation_minutes: number | null
          sleep_hours: number | null
          steps_count: number | null
          tier_progress: Json
          total_health_syncs: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_score: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          health_score?: number | null
          hydration_glasses?: number | null
          id?: string
          last_activity_date?: string | null
          last_health_sync?: string | null
          level?: number
          longest_streak?: number
          meditation_minutes?: number | null
          sleep_hours?: number | null
          steps_count?: number | null
          tier_progress?: Json
          total_health_syncs?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          weekly_score?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          health_score?: number | null
          hydration_glasses?: number | null
          id?: string
          last_activity_date?: string | null
          last_health_sync?: string | null
          level?: number
          longest_streak?: number
          meditation_minutes?: number | null
          sleep_hours?: number | null
          steps_count?: number | null
          tier_progress?: Json
          total_health_syncs?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          weekly_score?: number
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          created_at: string | null
          id: string
          market_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          market_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          market_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboards: {
        Row: {
          bonus_tokens: number
          created_at: string
          id: string
          rank: number | null
          user_id: string
          week_start_date: string
          weekly_score: number
        }
        Insert: {
          bonus_tokens?: number
          created_at?: string
          id?: string
          rank?: number | null
          user_id: string
          week_start_date: string
          weekly_score?: number
        }
        Update: {
          bonus_tokens?: number
          created_at?: string
          id?: string
          rank?: number | null
          user_id?: string
          week_start_date?: string
          weekly_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      performance_metrics_cache: {
        Row: {
          active_users_1h: number | null
          avg_latency_ms: number | null
          last_updated: string | null
          success_rate_percent: number | null
          total_requests_1h: number | null
        }
        Relationships: []
      }
      system_status_cache: {
        Row: {
          components: Json | null
          last_updated: string | null
          overall_status: string | null
        }
        Relationships: []
      }
      token_metrics_materialized: {
        Row: {
          active_stakes: number | null
          last_updated: string | null
          marketplace_volume: number | null
          total_distributed: number | null
        }
        Relationships: []
      }
      user_tier_stats: {
        Row: {
          capacity_remaining: number | null
          current_count: number | null
          last_updated: string | null
          tier: string | null
          tier_limit: number | null
        }
        Relationships: []
      }
      v_active_positions: {
        Row: {
          base_asset: string | null
          closed_at: string | null
          entry_price: number | null
          exchange_name: string | null
          id: string | null
          leverage: number | null
          market_id: string | null
          opened_at: string | null
          pnl: number | null
          portfolio_id: string | null
          qty: number | null
          quote_asset: string | null
          side: string | null
          sl: number | null
          status: string | null
          symbol: string | null
          tp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_performance"
            referencedColumns: ["portfolio_id"]
          },
        ]
      }
      v_portfolio_performance: {
        Row: {
          base_ccy: string | null
          closed_positions: number | null
          name: string | null
          open_positions: number | null
          portfolio_id: string | null
          realized_pnl: number | null
          unrealized_pnl: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_memory_fragment: {
        Args:
          | {
              content: Json
              emotional_weight?: number
              fragment_type: string
              p_user_id: string
            }
          | { fragment_content: string; p_user_id: string }
        Returns: string
      }
      analyze_conversation_emotion: {
        Args: { conversation_text: string }
        Returns: Json
      }
      basic_security_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_timestamp: string
          tables_with_policies: number
          tables_with_rls: number
          total_public_tables: number
        }[]
      }
      calculate_aura_resonance: {
        Args: { user_a_memory: Json; user_b_memory: Json }
        Returns: number
      }
      calculate_comprehensive_health_score: {
        Args: { p_date?: string; p_user_id: string }
        Returns: number
      }
      calculate_encounter_xp: {
        Args: {
          p_archetype: string
          p_compatibility_score: number
          p_distance_meters: number
          p_interaction_type?: string
        }
        Returns: number
      }
      calculate_health_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_user_tier: {
        Args: { user_points: number }
        Returns: string
      }
      check_account_lockout: {
        Args: { p_email: string }
        Returns: Json
      }
      check_endpoint_rate_limit: {
        Args: {
          p_endpoint?: string
          p_ip_address?: string
          p_max_requests?: number
          p_user_id?: string
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action_type?: string
          _ip_address?: string
          _max_requests?: number
          _user_id?: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_secure: {
        Args: {
          _action_type?: string
          _ip_address?: string
          _max_requests?: number
          _user_id?: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      check_security_basics: {
        Args: Record<PropertyKey, never>
        Returns: {
          security_check_time: string
          tables_without_policies: number
          tables_without_rls: number
          total_tables: number
        }[]
      }
      check_tier_promotion: {
        Args: { user_uuid: string }
        Returns: Json
      }
      check_user_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_behavior_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_security_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      comprehensive_security_audit: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_default_goals: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      enforce_data_retention_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enhanced_security_monitoring: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      find_nearby_agents: {
        Args: { _agent_id: string; _limit?: number; _max_distance?: number }
        Returns: {
          agent_id: string
          compatibility_score: number
          distance: number
          mood: string
          status: string
          traits: string[]
          user_id: string
        }[]
      }
      generate_live_signals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_active_stakes: {
        Args: { user_uuid: string }
        Returns: {
          amount: number
          days_remaining: number
          ends_at: string
          id: string
          reward_multiplier: number
          started_at: string
        }[]
      }
      get_enhanced_security_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_nearby_users: {
        Args: { range_km: number; user_lat: number; user_lng: number }
        Returns: {
          distance_m: number
          user_id: string
        }[]
      }
      get_security_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_token_balance: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_traits_cached: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_critical_security_fix: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_failed_login_attempt: {
        Args: {
          p_email: string
          p_ip?: string
          p_reason: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_security_access: {
        Args: {
          operation: string
          table_name: string
          user_id_accessed?: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { p_action: string; p_session_data?: Json; p_severity?: string }
        Returns: undefined
      }
      log_security_event_batch: {
        Args: { events: Json[] }
        Returns: undefined
      }
      log_security_policy_hardening: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_trait_cache: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      resend_confirmation_email: {
        Args: { user_email: string }
        Returns: Json
      }
      security_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      security_monitoring_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      sync_health_to_amarean_memory: {
        Args: { p_health_score: number; p_metrics: Json; p_user_id: string }
        Returns: undefined
      }
      update_avatar_state: {
        Args: { p_user_id: string }
        Returns: string
      }
      update_karma_score: {
        Args: { action_type: string; action_value?: number; p_user_id: string }
        Returns: number
      }
      validate_user_input: {
        Args: { input_text: string; input_type?: string; max_length?: number }
        Returns: Json
      }
      validate_user_input_comprehensive: {
        Args: {
          additional_patterns?: string[]
          input_text: string
          input_type?: string
          max_length?: number
        }
        Returns: Json
      }
      validate_user_input_enhanced: {
        Args: { input_text: string; input_type?: string; max_length?: number }
        Returns: Json
      }
      verify_wallet_signature: {
        Args: {
          message_text: string
          signature: string
          wallet_address: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
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
    Enums: {
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
