export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string | null
          current_level: number | null
          id: string
          name: string
          tax_jurisdiction: string | null
          treasury_balance: number | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          name: string
          tax_jurisdiction?: string | null
          treasury_balance?: number | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          name?: string
          tax_jurisdiction?: string | null
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
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          is_daily: boolean | null
          quota_count: number | null
          role_target: string | null
          task_type: string
          title: string | null
          unlock_level: number | null
          xp_reward: number | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_daily?: boolean | null
          quota_count?: number | null
          role_target?: string | null
          task_type: string
          title?: string | null
          unlock_level?: number | null
          xp_reward?: number | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_daily?: boolean | null
          quota_count?: number | null
          role_target?: string | null
          task_type?: string
          title?: string | null
          unlock_level?: number | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
