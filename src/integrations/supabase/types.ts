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
          is_admin_override: boolean
          is_global: boolean
          key_last4: string
          model: string
          platform: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_active?: boolean
          is_admin_override?: boolean
          is_global?: boolean
          key_last4: string
          model: string
          platform: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_active?: boolean
          is_admin_override?: boolean
          is_global?: boolean
          key_last4?: string
          model?: string
          platform?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_model_pricing: {
        Row: {
          created_at: string
          id: string
          input_price_per_1m_usd: number
          is_active: boolean
          model: string
          notes: string | null
          output_price_per_1m_usd: number
          platform: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_price_per_1m_usd?: number
          is_active?: boolean
          model: string
          notes?: string | null
          output_price_per_1m_usd?: number
          platform: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_price_per_1m_usd?: number
          is_active?: boolean
          model?: string
          notes?: string | null
          output_price_per_1m_usd?: number
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_task_limits: {
        Row: {
          id: boolean
          image_describe_max_tokens: number
          image_extract_max_tokens: number
          text_reply_max_tokens: number
          updated_at: string
          vision_detail: string
          vision_match_max_candidates: number
          vision_match_max_tokens: number
          voice_transcribe_max_seconds: number
        }
        Insert: {
          id?: boolean
          image_describe_max_tokens?: number
          image_extract_max_tokens?: number
          text_reply_max_tokens?: number
          updated_at?: string
          vision_detail?: string
          vision_match_max_candidates?: number
          vision_match_max_tokens?: number
          voice_transcribe_max_seconds?: number
        }
        Update: {
          id?: boolean
          image_describe_max_tokens?: number
          image_extract_max_tokens?: number
          text_reply_max_tokens?: number
          updated_at?: string
          vision_detail?: string
          vision_match_max_candidates?: number
          vision_match_max_tokens?: number
          voice_transcribe_max_seconds?: number
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          from_number: string | null
          id: string
          incoming_message_id: string | null
          input_cost_usd: number
          input_price_per_1m_usd: number
          key_scope: string | null
          model: string
          output_cost_usd: number
          output_price_per_1m_usd: number
          platform: string
          prompt_tokens: number
          session_id: string | null
          task_type: string
          total_cost_usd: number
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          from_number?: string | null
          id?: string
          incoming_message_id?: string | null
          input_cost_usd?: number
          input_price_per_1m_usd?: number
          key_scope?: string | null
          model: string
          output_cost_usd?: number
          output_price_per_1m_usd?: number
          platform: string
          prompt_tokens?: number
          session_id?: string | null
          task_type?: string
          total_cost_usd?: number
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          from_number?: string | null
          id?: string
          incoming_message_id?: string | null
          input_cost_usd?: number
          input_price_per_1m_usd?: number
          key_scope?: string | null
          model?: string
          output_cost_usd?: number
          output_price_per_1m_usd?: number
          platform?: string
          prompt_tokens?: number
          session_id?: string | null
          task_type?: string
          total_cost_usd?: number
          total_tokens?: number
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          batch_wait_seconds: number
          business_type: string | null
          connected_session_ids: string[]
          contact: string | null
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          location: string | null
          max_tokens: number
          memory_message_limit: number
          message_batching_enabled: boolean
          name: string | null
          system_prompt: string | null
          temperature: number
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
          batch_wait_seconds?: number
          business_type?: string | null
          connected_session_ids?: string[]
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          max_tokens?: number
          memory_message_limit?: number
          message_batching_enabled?: boolean
          name?: string | null
          system_prompt?: string | null
          temperature?: number
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
          batch_wait_seconds?: number
          business_type?: string | null
          connected_session_ids?: string[]
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          location?: string | null
          max_tokens?: number
          memory_message_limit?: number
          message_batching_enabled?: boolean
          name?: string | null
          system_prompt?: string | null
          temperature?: number
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
          assigned_agent: string | null
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
          assigned_agent?: string | null
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
          assigned_agent?: string | null
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
      dashboard_ads: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
          caption: string | null
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
          media_filename: string | null
          media_url: string | null
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
          transcribed_text: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
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
          media_filename?: string | null
          media_url?: string | null
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
          transcribed_text?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
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
          media_filename?: string | null
          media_url?: string | null
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
          transcribed_text?: string | null
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
      message_batches: {
        Row: {
          created_at: string
          first_message_at: string
          from_number: string
          id: string
          last_message_at: string
          messages: Json
          processed: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_message_at?: string
          from_number: string
          id?: string
          last_message_at?: string
          messages?: Json
          processed?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_message_at?: string
          from_number?: string
          id?: string
          last_message_at?: string
          messages?: Json
          processed?: boolean
          session_id?: string
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
          message_id: string | null
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
          message_id?: string | null
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
          message_id?: string | null
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
          currency: string
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
          currency?: string
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
          currency?: string
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
          default_max_tokens: number
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean
          max_sessions: number
          plan_name: string
          price_monthly: number
          price_monthly_bdt: number
          price_yearly: number
          price_yearly_bdt: number
          reply_quota: number
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          cta_label?: string | null
          default_max_tokens?: number
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean
          max_sessions: number
          plan_name: string
          price_monthly: number
          price_monthly_bdt?: number
          price_yearly: number
          price_yearly_bdt?: number
          reply_quota?: number
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          cta_label?: string | null
          default_max_tokens?: number
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean
          max_sessions?: number
          plan_name?: string
          price_monthly?: number
          price_monthly_bdt?: number
          price_yearly?: number
          price_yearly_bdt?: number
          reply_quota?: number
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
      product_images: {
        Row: {
          created_at: string
          id: string
          image_hash: string | null
          product_description: string | null
          product_image_url: string
          product_name: string
          product_price: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_hash?: string | null
          product_description?: string | null
          product_image_url: string
          product_name: string
          product_price?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_hash?: string | null
          product_description?: string | null
          product_image_url?: string
          product_name?: string
          product_price?: string | null
          updated_at?: string
          user_id?: string
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
          match_image_paths: string[]
          match_image_urls: string[]
          name: string
          price: number
          real_image_paths: string[]
          real_image_urls: string[]
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
          match_image_paths?: string[]
          match_image_urls?: string[]
          name: string
          price?: number
          real_image_paths?: string[]
          real_image_urls?: string[]
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
          match_image_paths?: string[]
          match_image_urls?: string[]
          name?: string
          price?: number
          real_image_paths?: string[]
          real_image_urls?: string[]
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
          max_products: number
          max_sessions: number
          plan: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          max_products?: number
          max_sessions?: number
          plan?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          max_products?: number
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
          max_tokens: number | null
          plan: string
          quota_period_end: string | null
          quota_period_start: string | null
          replies_used: number
          reply_quota: number | null
          status: string
          tokens_used: number
          trial_ends_at: string | null
          trial_started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_sessions: number
          max_tokens?: number | null
          plan: string
          quota_period_end?: string | null
          quota_period_start?: string | null
          replies_used?: number
          reply_quota?: number | null
          status?: string
          tokens_used?: number
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_sessions?: number
          max_tokens?: number | null
          plan?: string
          quota_period_end?: string | null
          quota_period_start?: string | null
          replies_used?: number
          reply_quota?: number | null
          status?: string
          tokens_used?: number
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
      user_ai_limits: {
        Row: {
          created_at: string
          disabled_tasks: string[]
          monthly_cost_cap_usd: number
          monthly_token_cap: number
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_tasks?: string[]
          monthly_cost_cap_usd?: number
          monthly_token_cap?: number
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_tasks?: string[]
          monthly_cost_cap_usd?: number
          monthly_token_cap?: number
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          event_type?: string | null
          id?: string
          payload?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered?: boolean
          event_type?: string | null
          id?: string
          payload?: Json | null
          session_id?: string
          user_id?: string
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
      can_access_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      check_user_ai_limit: {
        Args: { _task_type: string; _user_id: string }
        Returns: {
          allowed: boolean
          cost_cap: number
          cost_used: number
          reason: string
          task_disabled: boolean
          token_cap: number
          tokens_used: number
        }[]
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      consume_reply_quota: {
        Args: { _user_id: string }
        Returns: {
          allowed: boolean
          remaining: number
          replies_used: number
          reply_quota: number
        }[]
      }
      consume_tokens: {
        Args: { _tokens: number; _user_id: string }
        Returns: undefined
      }
      expire_own_trial: { Args: never; Returns: boolean }
      extract_real_customer_number_from_payload: {
        Args: { _payload: Json }
        Returns: string
      }
      get_ai_task_limits: {
        Args: never
        Returns: {
          id: boolean
          image_describe_max_tokens: number
          image_extract_max_tokens: number
          text_reply_max_tokens: number
          updated_at: string
          vision_detail: string
          vision_match_max_candidates: number
          vision_match_max_tokens: number
          voice_transcribe_max_seconds: number
        }
        SetofOptions: {
          from: "*"
          to: "ai_task_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_max_tokens: { Args: { _user_id: string }; Returns: number }
      get_user_quota_status: {
        Args: { _user_id: string }
        Returns: {
          max_tokens: number
          period_end: string
          period_start: string
          plan: string
          remaining: number
          replies_used: number
          reply_quota: number
        }[]
      }
      has_active_service: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      headadmin_ai_spend_summary: {
        Args: never
        Returns: {
          active_users_this_month: number
          last_month_cost: number
          this_month_cost: number
          this_month_tokens: number
          top_users: Json
        }[]
      }
      headadmin_list_user_usage: {
        Args: never
        Returns: {
          completion_tokens_total: number
          email: string
          full_name: string
          global_task_breakdown: Json
          last_used_at: string
          max_tokens: number
          plan: string
          prompt_tokens_total: number
          quota_period_end: string
          quota_period_start: string
          remaining: number
          replies_used: number
          reply_count: number
          reply_quota: number
          task_breakdown: Json
          tokens_used: number
          total_cost_usd: number
          user_id: string
        }[]
      }
      headadmin_purge_user_usage: {
        Args: { _user_id: string }
        Returns: undefined
      }
      headadmin_update_ai_task_limits: {
        Args: {
          _image_describe_max_tokens: number
          _image_extract_max_tokens: number
          _text_reply_max_tokens: number
          _vision_detail: string
          _vision_match_max_candidates: number
          _vision_match_max_tokens: number
          _voice_transcribe_max_seconds: number
        }
        Returns: {
          id: boolean
          image_describe_max_tokens: number
          image_extract_max_tokens: number
          text_reply_max_tokens: number
          updated_at: string
          vision_detail: string
          vision_match_max_candidates: number
          vision_match_max_tokens: number
          voice_transcribe_max_seconds: number
        }
        SetofOptions: {
          from: "*"
          to: "ai_task_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      headadmin_usage_totals: {
        Args: never
        Returns: {
          active_model: string
          active_platform: string
          active_scope: string
          active_users: number
          total_cost_usd: number
          total_replies: number
          total_tokens: number
        }[]
      }
      headadmin_user_usage_detail: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          completion_tokens: number
          created_at: string
          from_number: string
          id: string
          key_scope: string
          model: string
          platform: string
          prompt_tokens: number
          session_id: string
          session_phone: string
          task_type: string
          total_cost_usd: number
          total_tokens: number
        }[]
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
          caption: string | null
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
          media_filename: string | null
          media_url: string | null
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
          transcribed_text: string | null
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
      resolve_ai_api_key: {
        Args: { _platform?: string; _user_id: string }
        Returns: {
          encrypted_key: string
          id: string
          model: string
          platform: string
          scope: string
        }[]
      }
      start_user_trial: {
        Args: never
        Returns: {
          created_at: string
          id: string
          max_sessions: number
          max_tokens: number | null
          plan: string
          quota_period_end: string | null
          quota_period_start: string | null
          replies_used: number
          reply_quota: number | null
          status: string
          tokens_used: number
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
