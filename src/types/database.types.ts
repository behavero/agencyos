export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string | null
          registration_number: string | null
          treasury_balance: number | null
          tax_jurisdiction: string | null
          tax_rate: number | null
          currency: string | null
          current_level: number | null
          monthly_expenses: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          registration_number?: string | null
          treasury_balance?: number | null
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          currency?: string | null
          current_level?: number | null
          monthly_expenses?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          registration_number?: string | null
          treasury_balance?: number | null
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          currency?: string | null
          current_level?: number | null
          monthly_expenses?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      models: {
        Row: {
          id: string
          agency_id: string | null
          name: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          fanvue_access_token: string | null
          fanvue_refresh_token: string | null
          fanvue_token_expiry: string | null
          fanvue_user_id: string | null
          fanvue_username: string | null
          instagram_access_token: string | null
          instagram_token_expiry: string | null
          instagram_business_account_id: string | null
          instagram_handle: string | null
          twitter_handle: string | null
          tiktok_handle: string | null
          agency_split_percentage: number | null
          status: string | null
          followers_count: number | null
          subscribers_count: number | null
          revenue_total: number | null
          revenue_30d: number | null
          posts_count: number | null
          unread_messages: number | null
          likes_count: number | null
          tracking_links_count: number | null
          image_count: number | null
          video_count: number | null
          audio_count: number | null
          stats_updated_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id?: string | null
          name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          fanvue_access_token?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expiry?: string | null
          fanvue_user_id?: string | null
          fanvue_username?: string | null
          instagram_access_token?: string | null
          instagram_token_expiry?: string | null
          instagram_business_account_id?: string | null
          instagram_handle?: string | null
          twitter_handle?: string | null
          tiktok_handle?: string | null
          agency_split_percentage?: number | null
          status?: string | null
          followers_count?: number | null
          subscribers_count?: number | null
          revenue_total?: number | null
          revenue_30d?: number | null
          posts_count?: number | null
          unread_messages?: number | null
          likes_count?: number | null
          tracking_links_count?: number | null
          image_count?: number | null
          video_count?: number | null
          audio_count?: number | null
          stats_updated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string | null
          name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          fanvue_access_token?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expiry?: string | null
          fanvue_user_id?: string | null
          fanvue_username?: string | null
          instagram_access_token?: string | null
          instagram_token_expiry?: string | null
          instagram_business_account_id?: string | null
          instagram_handle?: string | null
          twitter_handle?: string | null
          tiktok_handle?: string | null
          agency_split_percentage?: number | null
          status?: string | null
          followers_count?: number | null
          subscribers_count?: number | null
          revenue_total?: number | null
          revenue_30d?: number | null
          posts_count?: number | null
          unread_messages?: number | null
          likes_count?: number | null
          tracking_links_count?: number | null
          image_count?: number | null
          video_count?: number | null
          audio_count?: number | null
          stats_updated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          agency_id: string | null
          username: string | null
          role: string | null
          xp_count: number | null
          total_xp: number | null
          current_streak: number | null
          last_login_date: string | null
          league_rank: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          agency_id?: string | null
          username?: string | null
          role?: string | null
          xp_count?: number | null
          total_xp?: number | null
          current_streak?: number | null
          last_login_date?: string | null
          league_rank?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string | null
          username?: string | null
          role?: string | null
          xp_count?: number | null
          total_xp?: number | null
          current_streak?: number | null
          last_login_date?: string | null
          league_rank?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      social_accounts: {
        Row: {
          id: string
          model_id: string | null
          platform: string | null
          account_handle: string | null
          account_type: string | null
          health_tier: string | null
          last_post_at: string | null
          posts_today: number | null
          posts_this_week: number | null
          follower_count: number | null
          engagement_rate: number | null
          shadowban_risk_score: number | null
          max_posts_per_day: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          model_id?: string | null
          platform?: string | null
          account_handle?: string | null
          account_type?: string | null
          health_tier?: string | null
          last_post_at?: string | null
          posts_today?: number | null
          posts_this_week?: number | null
          follower_count?: number | null
          engagement_rate?: number | null
          shadowban_risk_score?: number | null
          max_posts_per_day?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          model_id?: string | null
          platform?: string | null
          account_handle?: string | null
          account_type?: string | null
          health_tier?: string | null
          last_post_at?: string | null
          posts_today?: number | null
          posts_this_week?: number | null
          follower_count?: number | null
          engagement_rate?: number | null
          shadowban_risk_score?: number | null
          max_posts_per_day?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          agency_id: string | null
          model_id: string | null
          name: string
          description: string | null
          amount: number
          category: string
          frequency: string
          status: string | null
          is_recurring: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id?: string | null
          model_id?: string | null
          name: string
          description?: string | null
          amount: number
          category: string
          frequency: string
          status?: string | null
          is_recurring?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string | null
          model_id?: string | null
          name?: string
          description?: string | null
          amount?: number
          category?: string
          frequency?: string
          status?: string | null
          is_recurring?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
      }
      content_assets: {
        Row: {
          id: string
          agency_id: string | null
          model_id: string | null
          file_name: string | null
          file_url: string | null
          thumbnail_url: string | null
          media_type: string | null
          content_type: string | null
          title: string | null
          description: string | null
          tags: string[] | null
          usage_count: number | null
          price: number | null
          fanvue_media_uuid: string | null
          fanvue_folder: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id?: string | null
          model_id?: string | null
          file_name?: string | null
          file_url?: string | null
          thumbnail_url?: string | null
          media_type?: string | null
          content_type?: string | null
          title?: string | null
          description?: string | null
          tags?: string[] | null
          usage_count?: number | null
          price?: number | null
          fanvue_media_uuid?: string | null
          fanvue_folder?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string | null
          model_id?: string | null
          file_name?: string | null
          file_url?: string | null
          thumbnail_url?: string | null
          media_type?: string | null
          content_type?: string | null
          title?: string | null
          description?: string | null
          tags?: string[] | null
          usage_count?: number | null
          price?: number | null
          fanvue_media_uuid?: string | null
          fanvue_folder?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
