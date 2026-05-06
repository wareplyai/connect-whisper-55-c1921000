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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          target: string | null
          target_user_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          target?: string | null
          target_user_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          target?: string | null
          target_user_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_rules: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          is_active: boolean
          keywords: string[]
          match_count: number
          match_type: string
          priority: number
          reply_template: string
          rule_name: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          match_count?: number
          match_type?: string
          priority?: number
          reply_template: string
          rule_name: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          match_count?: number
          match_type?: string
          priority?: number
          reply_template?: string
          rule_name?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      headadmin: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string
          password_hash: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
          password_hash?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
          password_hash?: string | null
        }
        Relationships: []
      }
      incoming_messages: {
        Row: {
          from_number: string
          id: string
          is_group: boolean
          matched_rule_id: string | null
          message_text: string | null
          message_type: string
          raw_payload: Json | null
          received_at: string
          reply_sent: boolean
          reply_text: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          from_number: string
          id?: string
          is_group?: boolean
          matched_rule_id?: string | null
          message_text?: string | null
          message_type?: string
          raw_payload?: Json | null
          received_at?: string
          reply_sent?: boolean
          reply_text?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          from_number?: string
          id?: string
          is_group?: boolean
          matched_rule_id?: string | null
          message_text?: string | null
          message_type?: string
          raw_payload?: Json | null
          received_at?: string
          reply_sent?: boolean
          reply_text?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_type: string
          payload: Json | null
          session_id: string
          status: string
          to_number: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          payload?: Json | null
          session_id: string
          status?: string
          to_number?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          payload?: Json | null
          session_id?: string
          status?: string
          to_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          buyer_email: string | null
          buyer_phone: string | null
          confirmed_at: string | null
          created_at: string
          download_url: string | null
          id: string
          order_id: string
          payment_method: string | null
          product_id: string | null
          product_name: string | null
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          buyer_email?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          download_url?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          download_url?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_name: string
          account_number: string
          created_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          method_name: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          method_name: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          method_name?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          id: string
          payment_method: string
          plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          sender_number: string | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          id?: string
          payment_method: string
          plan: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "headadmin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_pricing: {
        Row: {
          cta_label: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean
          max_sessions: number
          plan_name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          cta_label?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean
          max_sessions: number
          plan_name: string
          price_monthly: number
          price_yearly: number
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          cta_label?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean
          max_sessions?: number
          plan_name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          active_sessions: number | null
          id: number
          total_messages: number | null
          total_revenue: number | null
          total_sessions: number | null
          total_users: number | null
          updated_at: string | null
        }
        Insert: {
          active_sessions?: number | null
          id?: number
          total_messages?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Update: {
          active_sessions?: number | null
          id?: number
          total_messages?: number | null
          total_revenue?: number | null
          total_sessions?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          max_sessions: number
          plan: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          max_sessions?: number
          plan?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          max_sessions?: number
          plan?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          plan: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          plan: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          plan?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          always_online: boolean
          api_token: string
          auto_reject_calls: boolean
          created_at: string
          enable_account_protection: boolean
          enable_message_logging: boolean
          enable_webhook: boolean
          id: string
          ignore_broadcasts: boolean
          ignore_channels: boolean
          ignore_groups: boolean
          last_active: string | null
          phone_number: string | null
          proxy_url: string | null
          read_incoming_messages: boolean
          session_name: string
          status: string
          user_id: string
          webhook_events: string[]
          webhook_secret: string
          webhook_url: string | null
          whatsapp_name: string | null
        }
        Insert: {
          always_online?: boolean
          api_token?: string
          auto_reject_calls?: boolean
          created_at?: string
          enable_account_protection?: boolean
          enable_message_logging?: boolean
          enable_webhook?: boolean
          id?: string
          ignore_broadcasts?: boolean
          ignore_channels?: boolean
          ignore_groups?: boolean
          last_active?: string | null
          phone_number?: string | null
          proxy_url?: string | null
          read_incoming_messages?: boolean
          session_name: string
          status?: string
          user_id: string
          webhook_events?: string[]
          webhook_secret?: string
          webhook_url?: string | null
          whatsapp_name?: string | null
        }
        Update: {
          always_online?: boolean
          api_token?: string
          auto_reject_calls?: boolean
          created_at?: string
          enable_account_protection?: boolean
          enable_message_logging?: boolean
          enable_webhook?: boolean
          id?: string
          ignore_broadcasts?: boolean
          ignore_channels?: boolean
          ignore_groups?: boolean
          last_active?: string | null
          phone_number?: string | null
          proxy_url?: string | null
          read_incoming_messages?: boolean
          session_name?: string
          status?: string
          user_id?: string
          webhook_events?: string[]
          webhook_secret?: string
          webhook_url?: string | null
          whatsapp_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_transactions: {
        Row: {
          amount: number | null
          id: string
          is_used: boolean
          message: string
          payment_method: string | null
          received_at: string
          sender: string | null
          transaction_id: string
        }
        Insert: {
          amount?: number | null
          id?: string
          is_used?: boolean
          message: string
          payment_method?: string | null
          received_at?: string
          sender?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number | null
          id?: string
          is_used?: boolean
          message?: string
          payment_method?: string | null
          received_at?: string
          sender?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          max_sessions: number
          plan: string
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_sessions: number
          plan: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_sessions?: number
          plan?: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          delivered: boolean
          event_type: string | null
          id: string
          payload: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          event_type?: string | null
          id?: string
          payload?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string
          delivered?: boolean
          event_type?: string | null
          id?: string
          payload?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_own_trial: { Args: never; Returns: boolean }
      has_active_service: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      start_user_trial: {
        Args: never
        Returns: {
          created_at: string
          id: string
          max_sessions: number
          plan: string
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
