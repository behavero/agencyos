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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string | null
          currency: string | null
          current_level: number | null
          id: string
          name: string
          tax_jurisdiction: string | null
          tax_rate: number | null
          treasury_balance: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_level?: number | null
          id?: string
          name: string
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          treasury_balance?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_level?: number | null
          id?: string
          name?: string
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          treasury_balance?: number | null
        }
        Relationships: []
      }
      asset_unlocks: {
        Row: {
          category: string | null
          cost: number
          created_at: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          unlock_level_req: number
        }
        Insert: {
          category?: string | null
          cost: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          unlock_level_req?: number
        }
        Update: {
          category?: string | null
          cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          unlock_level_req?: number
        }
        Relationships: []
      }
      chat_notes: {
        Row: {
          created_at: string | null
          fanvue_user_id: string
          id: string
          model_id: string | null
          note_content: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fanvue_user_id: string
          id?: string
          model_id?: string | null
          note_content?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fanvue_user_id?: string
          id?: string
          model_id?: string | null
          note_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_notes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_scripts: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          model_id: string | null
          price: number | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          price?: number | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string | null
          price?: number | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_scripts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      content_analysis: {
        Row: {
          ai_tags: Json | null
          analyzed_at: string | null
          conversion_rate: number | null
          id: string
          model_id: string | null
          performance_score: number | null
          platform: string | null
          post_url: string
          views: number | null
        }
        Insert: {
          ai_tags?: Json | null
          analyzed_at?: string | null
          conversion_rate?: number | null
          id?: string
          model_id?: string | null
          performance_score?: number | null
          platform?: string | null
          post_url: string
          views?: number | null
        }
        Update: {
          ai_tags?: Json | null
          analyzed_at?: string | null
          conversion_rate?: number | null
          id?: string
          model_id?: string | null
          performance_score?: number | null
          platform?: string | null
          post_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analysis_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          agency_id: string | null
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string
          is_recurring: boolean | null
          model_id: string | null
          name: string
          next_due_date: string | null
          paid_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_recurring?: boolean | null
          model_id?: string | null
          name: string
          next_due_date?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_recurring?: boolean | null
          model_id?: string | null
          name?: string
          next_due_date?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          agency_id: string | null
          audio_count: number | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          fanvue_access_token: string | null
          fanvue_api_key: string | null
          fanvue_refresh_token: string | null
          fanvue_token_expires_at: string | null
          fanvue_user_id: string | null
          fanvue_user_uuid: string | null
          fanvue_username: string | null
          followers_count: number | null
          id: string
          image_count: number | null
          instagram_access_token: string | null
          likes_count: number | null
          name: string
          posts_count: number | null
          revenue_total: number | null
          stats_updated_at: string | null
          status: string | null
          subscribers_count: number | null
          tracking_links_count: number | null
          unread_messages: number | null
          updated_at: string | null
          video_count: number | null
        }
        Insert: {
          agency_id?: string | null
          audio_count?: number | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          fanvue_access_token?: string | null
          fanvue_api_key?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expires_at?: string | null
          fanvue_user_id?: string | null
          fanvue_user_uuid?: string | null
          fanvue_username?: string | null
          followers_count?: number | null
          id?: string
          image_count?: number | null
          instagram_access_token?: string | null
          likes_count?: number | null
          name: string
          posts_count?: number | null
          revenue_total?: number | null
          stats_updated_at?: string | null
          status?: string | null
          subscribers_count?: number | null
          tracking_links_count?: number | null
          unread_messages?: number | null
          updated_at?: string | null
          video_count?: number | null
        }
        Update: {
          agency_id?: string | null
          audio_count?: number | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          fanvue_access_token?: string | null
          fanvue_api_key?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expires_at?: string | null
          fanvue_user_id?: string | null
          fanvue_user_uuid?: string | null
          fanvue_username?: string | null
          followers_count?: number | null
          id?: string
          image_count?: number | null
          instagram_access_token?: string | null
          likes_count?: number | null
          name?: string
          posts_count?: number | null
          revenue_total?: number | null
          stats_updated_at?: string | null
          status?: string | null
          subscribers_count?: number | null
          tracking_links_count?: number | null
          unread_messages?: number | null
          updated_at?: string | null
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "models_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          created_at: string | null
          current_streak: number | null
          id: string
          league_rank: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          xp_count: number | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          current_streak?: number | null
          id: string
          league_rank?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          xp_count?: number | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          league_rank?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          xp_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          agency_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          description: string | null
          id: string
          is_daily: boolean | null
          last_synced_at: string | null
          model_id: string | null
          quota_count: number | null
          role_target: string | null
          target_count: number | null
          task_type: string
          title: string | null
          unlock_level: number | null
          verification_type: string | null
          xp_reward: number | null
        }
        Insert: {
          agency_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          description?: string | null
          id?: string
          is_daily?: boolean | null
          last_synced_at?: string | null
          model_id?: string | null
          quota_count?: number | null
          role_target?: string | null
          target_count?: number | null
          task_type: string
          title?: string | null
          unlock_level?: number | null
          verification_type?: string | null
          xp_reward?: number | null
        }
        Update: {
          agency_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          description?: string | null
          id?: string
          is_daily?: boolean | null
          last_synced_at?: string | null
          model_id?: string | null
          quota_count?: number | null
          role_target?: string | null
          target_count?: number | null
          task_type?: string
          title?: string | null
          unlock_level?: number | null
          verification_type?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          account_handle: string
          account_type: string | null
          created_at: string | null
          engagement_rate: number | null
          follower_count: number | null
          health_tier: string | null
          id: string
          is_active: boolean | null
          last_post_at: string | null
          max_posts_per_day: number | null
          model_id: string | null
          platform: string
          posts_this_week: number | null
          posts_today: number | null
          shadowban_risk_score: number | null
          updated_at: string | null
        }
        Insert: {
          account_handle: string
          account_type?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          health_tier?: string | null
          id?: string
          is_active?: boolean | null
          last_post_at?: string | null
          max_posts_per_day?: number | null
          model_id?: string | null
          platform: string
          posts_this_week?: number | null
          posts_today?: number | null
          shadowban_risk_score?: number | null
          updated_at?: string | null
        }
        Update: {
          account_handle?: string
          account_type?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          follower_count?: number | null
          health_tier?: string | null
          id?: string
          is_active?: boolean | null
          last_post_at?: string | null
          max_posts_per_day?: number | null
          model_id?: string | null
          platform?: string
          posts_this_week?: number | null
          posts_today?: number | null
          shadowban_risk_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          metadata: Json | null
          model_id: string
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          model_id: string
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          metadata?: Json | null
          model_id?: string
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stats: {
        Row: {
          comments: number | null
          created_at: string | null
          date: string
          followers: number | null
          id: string
          likes: number | null
          model_id: string
          platform: string
          shares: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string | null
          date?: string
          followers?: number | null
          id?: string
          likes?: number | null
          model_id: string
          platform: string
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string | null
          date?: string
          followers?: number | null
          id?: string
          likes?: number | null
          model_id?: string
          platform?: string
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_stats_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          agency_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          id: string
          source: string | null
          type: string | null
        }
        Insert: {
          agency_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          source?: string | null
          type?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          source?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_treasury: {
        Args: { increment_amount: number }
        Returns: undefined
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
