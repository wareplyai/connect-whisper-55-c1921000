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
      abandoned_connections: {
        Row: {
          country_code: string
          created_at: string
          default_session_id: string | null
          id: string
          is_active: boolean
          total_completed: number
          total_incomplete: number
          total_received: number
          total_sent: number
          updated_at: string
          user_id: string
          webhook_secret: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          default_session_id?: string | null
          id?: string
          is_active?: boolean
          total_completed?: number
          total_incomplete?: number
          total_received?: number
          total_sent?: number
          updated_at?: string
          user_id: string
          webhook_secret?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          default_session_id?: string | null
          id?: string
          is_active?: boolean
          total_completed?: number
          total_incomplete?: number
          total_received?: number
          total_sent?: number
          updated_at?: string
          user_id?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_connections_default_session_id_fkey"
            columns: ["default_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      abandoned_orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_phone_full: string | null
          id: string
          order_date: string | null
          product_link: string | null
          product_name: string | null
          raw: Json | null
          session_id: string | null
          site_name: string | null
          site_url: string | null
          sms_error: string | null
          sms_sent: boolean
          sms_sent_at: string | null
          status: string
          user_id: string
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_full?: string | null
          id?: string
          order_date?: string | null
          product_link?: string | null
          product_name?: string | null
          raw?: Json | null
          session_id?: string | null
          site_name?: string | null
          site_url?: string | null
          sms_error?: string | null
          sms_sent?: boolean
          sms_sent_at?: string | null
          status: string
          user_id: string
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_phone_full?: string | null
          id?: string
          order_date?: string | null
          product_link?: string | null
          product_name?: string | null
          raw?: Json | null
          session_id?: string | null
          site_name?: string | null
          site_url?: string | null
          sms_error?: string | null
          sms_sent?: boolean
          sms_sent_at?: string | null
          status?: string
          user_id?: string
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          is_active: boolean
          key_last4: string
          model: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_active?: boolean
          key_last4: string
          model: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_active?: boolean
          key_last4?: string
          model?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_reply_rules: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
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
          category?: string | null
          created_at?: string
          description?: string | null
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
          category?: string | null
          created_at?: string
          description?: string | null
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
      behavior_settings: {
        Row: {
          auto_pause_threshold: number
          created_at: string
          fifo_enabled: boolean
          id: string
          is_active: boolean
          max_replies_per_hour: number
          max_replies_per_minute: number
          online_presence: boolean
          random_variation: boolean
          read_delay_max_ms: number
          read_delay_min_ms: number
          reply_delay_max_ms: number
          reply_delay_min_ms: number
          reply_only_first_in_burst: boolean
          session_id: string | null
          timezone: string
          typing_max_ms: number
          typing_min_ms: number
          typing_simulation: boolean
          updated_at: string
          user_id: string
          working_hours_enabled: boolean
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          auto_pause_threshold?: number
          created_at?: string
          fifo_enabled?: boolean
          id?: string
          is_active?: boolean
          max_replies_per_hour?: number
          max_replies_per_minute?: number
          online_presence?: boolean
          random_variation?: boolean
          read_delay_max_ms?: number
          read_delay_min_ms?: number
          reply_delay_max_ms?: number
          reply_delay_min_ms?: number
          reply_only_first_in_burst?: boolean
          session_id?: string | null
          timezone?: string
          typing_max_ms?: number
          typing_min_ms?: number
          typing_simulation?: boolean
          updated_at?: string
          user_id: string
          working_hours_enabled?: boolean
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          auto_pause_threshold?: number
          created_at?: string
          fifo_enabled?: boolean
          id?: string
          is_active?: boolean
          max_replies_per_hour?: number
          max_replies_per_minute?: number
          online_presence?: boolean
          random_variation?: boolean
          read_delay_max_ms?: number
          read_delay_min_ms?: number
          reply_delay_max_ms?: number
          reply_delay_min_ms?: number
          reply_only_first_in_burst?: boolean
          session_id?: string | null
          timezone?: string
          typing_max_ms?: number
          typing_min_ms?: number
          typing_simulation?: boolean
          updated_at?: string
          user_id?: string
          working_hours_enabled?: boolean
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      blocked_customers: {
        Row: {
          blocked_at: string
          id: string
          phone_number: string
          session_id: string
          user_id: string
        }
        Insert: {
          blocked_at?: string
          id?: string
          phone_number: string
          session_id: string
          user_id: string
        }
        Update: {
          blocked_at?: string
          id?: string
          phone_number?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          active_reply_mode: string
          ai_auto_replies_enabled: boolean
          ai_enabled: boolean
          ai_read_receipts: boolean
          ai_show_typing: boolean
          business_type: string | null
          connected_session_ids: string[]
          contact: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string | null
          system_prompt: string | null
          updated_at: string
          user_id: string
          website: string | null
          working_hours: string | null
        }
        Insert: {
          active_reply_mode?: string
          ai_auto_replies_enabled?: boolean
          ai_enabled?: boolean
          ai_read_receipts?: boolean
          ai_show_typing?: boolean
          business_type?: string | null
          connected_session_ids?: string[]
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string | null
          system_prompt?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          working_hours?: string | null
        }
        Update: {
          active_reply_mode?: string
          ai_auto_replies_enabled?: boolean
          ai_enabled?: boolean
          ai_read_receipts?: boolean
          ai_show_typing?: boolean
          business_type?: string | null
          connected_session_ids?: string[]
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string | null
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      customer_reply_settings: {
        Row: {
          ai_paused: boolean
          created_at: string
          id: string
          mode: string
          paused_at: string | null
          phone_number: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_paused?: boolean
          created_at?: string
          id?: string
          mode?: string
          paused_at?: string | null
          phone_number: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_paused?: boolean
          created_at?: string
          id?: string
          mode?: string
          paused_at?: string | null
          phone_number?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reply_settings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_qa: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          match_type: string
          reply: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          match_type?: string
          reply: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          match_type?: string
          reply?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_feature_settings: {
        Row: {
          feature: string
          show_to_users: boolean
          updated_at: string
        }
        Insert: {
          feature: string
          show_to_users?: boolean
          updated_at?: string
        }
        Update: {
          feature?: string
          show_to_users?: boolean
          updated_at?: string
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
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
        }
        Relationships: []
      }
      incoming_messages: {
        Row: {
          delivery_status: string
          extracted_order_number: string | null
          extracted_product_name: string | null
          from_number: string
          id: string
          image_analysis: Json | null
          image_analyzed_at: string | null
          image_caption: string | null
          image_url: string | null
          is_group: boolean
          match_log: Json | null
          matched_rule_id: string | null
          message_text: string | null
          message_type: string
          mimetype: string | null
          processed_at: string | null
          raw_payload: Json | null
          received_at: string
          reply_attempted_at: string | null
          reply_error: string | null
          reply_sent: boolean
          reply_sent_at: string | null
          reply_text: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          delivery_status?: string
          extracted_order_number?: string | null
          extracted_product_name?: string | null
          from_number: string
          id?: string
          image_analysis?: Json | null
          image_analyzed_at?: string | null
          image_caption?: string | null
          image_url?: string | null
          is_group?: boolean
          match_log?: Json | null
          matched_rule_id?: string | null
          message_text?: string | null
          message_type?: string
          mimetype?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          received_at?: string
          reply_attempted_at?: string | null
          reply_error?: string | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          reply_text?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          delivery_status?: string
          extracted_order_number?: string | null
          extracted_product_name?: string | null
          from_number?: string
          id?: string
          image_analysis?: Json | null
          image_analyzed_at?: string | null
          image_caption?: string | null
          image_url?: string | null
          is_group?: boolean
          match_log?: Json | null
          matched_rule_id?: string | null
          message_text?: string | null
          message_type?: string
          mimetype?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          received_at?: string
          reply_attempted_at?: string | null
          reply_error?: string | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          reply_text?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          source_name: string | null
          source_type: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_name?: string | null
          source_type: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_order_number: string | null
          extracted_product_name: string | null
          id: string
          image_analysis: Json | null
          image_caption: string | null
          image_url: string | null
          incoming_message_id: string | null
          message_type: string
          mimetype: string | null
          payload: Json | null
          session_id: string
          status: string
          to_number: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_order_number?: string | null
          extracted_product_name?: string | null
          id?: string
          image_analysis?: Json | null
          image_caption?: string | null
          image_url?: string | null
          incoming_message_id?: string | null
          message_type?: string
          mimetype?: string | null
          payload?: Json | null
          session_id: string
          status?: string
          to_number?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_order_number?: string | null
          extracted_product_name?: string | null
          id?: string
          image_analysis?: Json | null
          image_caption?: string | null
          image_url?: string | null
          incoming_message_id?: string | null
          message_type?: string
          mimetype?: string | null
          payload?: Json | null
          session_id?: string
          status?: string
          to_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_incoming_message_id_fkey"
            columns: ["incoming_message_id"]
            isOneToOne: false
            referencedRelation: "incoming_messages"
            referencedColumns: ["id"]
          },
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
      products: {
        Row: {
          ai_tags: string | null
          ai_tags_status: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          source: string
          stock: number
          updated_at: string
          user_id: string
          woo_product_id: number | null
        }
        Insert: {
          ai_tags?: string | null
          ai_tags_status?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          source?: string
          stock?: number
          updated_at?: string
          user_id: string
          woo_product_id?: number | null
        }
        Update: {
          ai_tags?: string | null
          ai_tags_status?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          source?: string
          stock?: number
          updated_at?: string
          user_id?: string
          woo_product_id?: number | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_pairs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
          user_id?: string
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
          auto_replies_enabled: boolean
          created_at: string
          enable_account_protection: boolean
          enable_message_logging: boolean
          enable_webhook: boolean
          forward_webhook_url: string | null
          id: string
          ignore_broadcasts: boolean
          ignore_channels: boolean
          ignore_groups: boolean
          last_active: string | null
          phone_number: string | null
          proxy_url: string | null
          read_incoming_messages: boolean
          session_name: string
          show_typing_indicator: boolean
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
          auto_replies_enabled?: boolean
          created_at?: string
          enable_account_protection?: boolean
          enable_message_logging?: boolean
          enable_webhook?: boolean
          forward_webhook_url?: string | null
          id?: string
          ignore_broadcasts?: boolean
          ignore_channels?: boolean
          ignore_groups?: boolean
          last_active?: string | null
          phone_number?: string | null
          proxy_url?: string | null
          read_incoming_messages?: boolean
          session_name: string
          show_typing_indicator?: boolean
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
          auto_replies_enabled?: boolean
          created_at?: string
          enable_account_protection?: boolean
          enable_message_logging?: boolean
          enable_webhook?: boolean
          forward_webhook_url?: string | null
          id?: string
          ignore_broadcasts?: boolean
          ignore_channels?: boolean
          ignore_groups?: boolean
          last_active?: string | null
          phone_number?: string | null
          proxy_url?: string | null
          read_incoming_messages?: boolean
          session_name?: string
          show_typing_indicator?: boolean
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
      unmatched_image_queries: {
        Row: {
          best_match_score: number | null
          created_at: string
          from_number: string
          id: string
          image_description: string | null
          image_url: string | null
          notified: boolean
          resolved: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          best_match_score?: number | null
          created_at?: string
          from_number: string
          id?: string
          image_description?: string | null
          image_url?: string | null
          notified?: boolean
          resolved?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          best_match_score?: number | null
          created_at?: string
          from_number?: string
          id?: string
          image_description?: string | null
          image_url?: string | null
          notified?: boolean
          resolved?: boolean
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feature_access: {
        Row: {
          enabled: boolean
          feature: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          feature: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          feature?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      woo_connections: {
        Row: {
          consumer_key: string
          consumer_secret: string
          created_at: string
          default_session_id: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          store_url: string
          total_synced: number
          updated_at: string
          user_id: string
          webhook_secret: string
        }
        Insert: {
          consumer_key: string
          consumer_secret: string
          created_at?: string
          default_session_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          store_url: string
          total_synced?: number
          updated_at?: string
          user_id: string
          webhook_secret?: string
        }
        Update: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          default_session_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          store_url?: string
          total_synced?: number
          updated_at?: string
          user_id?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      woo_orders: {
        Row: {
          confirmation_error: string | null
          confirmation_sent: boolean
          confirmation_sent_at: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          line_items: Json | null
          order_number: string | null
          raw: Json | null
          status: string | null
          total: number | null
          user_id: string
          woo_order_id: number
        }
        Insert: {
          confirmation_error?: string | null
          confirmation_sent?: boolean
          confirmation_sent_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          line_items?: Json | null
          order_number?: string | null
          raw?: Json | null
          status?: string | null
          total?: number | null
          user_id: string
          woo_order_id: number
        }
        Update: {
          confirmation_error?: string | null
          confirmation_sent?: boolean
          confirmation_sent_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          line_items?: Json | null
          order_number?: string | null
          raw?: Json | null
          status?: string | null
          total?: number | null
          user_id?: string
          woo_order_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      expire_own_trial: { Args: never; Returns: boolean }
      extract_real_customer_number_from_payload: {
        Args: { _payload: Json }
        Returns: string
      }
      has_active_service: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_headadmin: { Args: { _uid: string }; Returns: boolean }
      is_internal_ai_reply_url: { Args: { _url: string }; Returns: boolean }
      is_session_phone_available: {
        Args: { _exclude_session_id?: string; _phone: string }
        Returns: boolean
      }
      latest_session_for_user: { Args: { _user_id: string }; Returns: string }
      log_incoming_message_with_match: {
        Args: {
          p_from_number: string
          p_is_group?: boolean
          p_message_text: string
          p_message_type?: string
          p_raw_payload?: Json
          p_session_id: string
        }
        Returns: {
          match_log: Json
          matched_rule_id: string
          message_id: string
          reply_text: string
        }[]
      }
      mark_auto_reply_delivery: {
        Args: { p_error?: string; p_message_id: string; p_sent: boolean }
        Returns: {
          delivery_status: string
          extracted_order_number: string | null
          extracted_product_name: string | null
          from_number: string
          id: string
          image_analysis: Json | null
          image_analyzed_at: string | null
          image_caption: string | null
          image_url: string | null
          is_group: boolean
          match_log: Json | null
          matched_rule_id: string | null
          message_text: string | null
          message_type: string
          mimetype: string | null
          processed_at: string | null
          raw_payload: Json | null
          received_at: string
          reply_attempted_at: string | null
          reply_error: string | null
          reply_sent: boolean
          reply_sent_at: string | null
          reply_text: string | null
          session_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "incoming_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      match_auto_reply_for_message: {
        Args: {
          p_message_text: string
          p_session_id: string
          p_user_id: string
        }
        Returns: {
          match_log: Json
          reply_template: string
          rule_id: string
        }[]
      }
      normalize_auto_reply_keywords: {
        Args: { _keywords: string[] }
        Returns: string[]
      }
      normalize_whatsapp_phone: { Args: { _phone: string }; Returns: string }
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
