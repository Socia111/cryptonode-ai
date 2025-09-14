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
      exchanges: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          supported_features: Json | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          supported_features?: Json | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          supported_features?: Json | null
        }
        Relationships: []
      }
      markets: {
        Row: {
          base_asset: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          quote_asset: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          base_asset: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          quote_asset: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          base_asset?: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          quote_asset?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          order_link_id: string | null
          order_type: string
          price: number | null
          qty: number
          side: string
          status: string | null
          symbol: string
          trade_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          order_link_id?: string | null
          order_type?: string
          price?: number | null
          qty: number
          side: string
          status?: string | null
          symbol: string
          trade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          order_link_id?: string | null
          order_type?: string
          price?: number | null
          qty?: number
          side?: string
          status?: string | null
          symbol?: string
          trade_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          current_price: number | null
          entry_price: number
          id: string
          portfolio_id: string | null
          side: string
          size: number
          symbol: string
          unrealized_pnl: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_price?: number | null
          entry_price: number
          id?: string
          portfolio_id?: string | null
          side: string
          size: number
          symbol: string
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_price?: number | null
          entry_price?: number
          id?: string
          portfolio_id?: string | null
          side?: string
          size?: number
          symbol?: string
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          bar_time: string
          created_at: string | null
          direction: string
          entry_price: number | null
          exchange: string
          expires_at: string | null
          filters: Json | null
          id: string
          indicators: Json | null
          price: number | null
          score: number | null
          sl: number | null
          symbol: string
          timeframe: string
          tp: number | null
          updated_at: string | null
        }
        Insert: {
          bar_time: string
          created_at?: string | null
          direction: string
          entry_price?: number | null
          exchange?: string
          expires_at?: string | null
          filters?: Json | null
          id?: string
          indicators?: Json | null
          price?: number | null
          score?: number | null
          sl?: number | null
          symbol: string
          timeframe?: string
          tp?: number | null
          updated_at?: string | null
        }
        Update: {
          bar_time?: string
          created_at?: string | null
          direction?: string
          entry_price?: number | null
          exchange?: string
          expires_at?: string | null
          filters?: Json | null
          id?: string
          indicators?: Json | null
          price?: number | null
          score?: number | null
          sl?: number | null
          symbol?: string
          timeframe?: string
          tp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_signals: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          queued_at: string | null
          sent_at: string | null
          side: string
          sl_price: number | null
          status: string | null
          symbol: string
          timeframe: string
          tp_price: number | null
          updated_at: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string | null
          id?: string
          queued_at?: string | null
          sent_at?: string | null
          side: string
          sl_price?: number | null
          status?: string | null
          symbol: string
          timeframe?: string
          tp_price?: number | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          queued_at?: string | null
          sent_at?: string | null
          side?: string
          sl_price?: number | null
          status?: string | null
          symbol?: string
          timeframe?: string
          tp_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string | null
          id: string
          order_link_id: string | null
          qty: number
          side: string
          sl_price: number | null
          status: string | null
          strategy_signal_id: string | null
          symbol: string
          tp_price: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_link_id?: string | null
          qty: number
          side: string
          sl_price?: number | null
          status?: string | null
          strategy_signal_id?: string | null
          symbol: string
          tp_price?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_link_id?: string | null
          qty?: number
          side?: string
          sl_price?: number | null
          status?: string | null
          strategy_signal_id?: string | null
          symbol?: string
          tp_price?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_strategy_signal_id_fkey"
            columns: ["strategy_signal_id"]
            isOneToOne: false
            referencedRelation: "strategy_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_portfolio_performance: {
        Row: {
          created_at: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
