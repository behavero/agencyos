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
          currency: string | null
          current_level: number | null
          id: string
          name: string
          tax_jurisdiction: 'RO' | 'US' | 'EE' | 'FR' | null
          tax_rate: number | null
          treasury_balance: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_level?: number | null
          id?: string
          name: string
          tax_jurisdiction?: 'RO' | 'US' | 'EE' | 'FR' | null
          tax_rate?: number | null
          treasury_balance?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_level?: number | null
          id?: string
          name?: string
          tax_jurisdiction?: 'RO' | 'US' | 'EE' | 'FR' | null
          tax_rate?: number | null
          treasury_balance?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          agency_id: string | null
          model_id: string | null
          name: string
          description: string | null
          amount: number
          category: 'salaries' | 'software' | 'marketing' | 'equipment' | 'office' | 'travel' | 'other' | null
          frequency: 'monthly' | 'yearly' | 'one-time' | null
          is_recurring: boolean | null
          status: 'active' | 'paid' | 'cancelled' | null
          next_due_date: string | null
          paid_at: string | null
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
          category?: 'salaries' | 'software' | 'marketing' | 'equipment' | 'office' | 'travel' | 'other' | null
          frequency?: 'monthly' | 'yearly' | 'one-time' | null
          is_recurring?: boolean | null
          status?: 'active' | 'paid' | 'cancelled' | null
          next_due_date?: string | null
          paid_at?: string | null
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
          category?: 'salaries' | 'software' | 'marketing' | 'equipment' | 'office' | 'travel' | 'other' | null
          frequency?: 'monthly' | 'yearly' | 'one-time' | null
          is_recurring?: boolean | null
          status?: 'active' | 'paid' | 'cancelled' | null
          next_due_date?: string | null
          paid_at?: string | null
          created_at?: string | null
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
          }
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
          }
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
          }
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
          platform: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook' | 'snapchat' | 'reddit' | 'twitch'
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
          platform: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook' | 'snapchat' | 'reddit' | 'twitch'
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
          platform?: 'instagram' | 'tiktok' | 'x' | 'youtube' | 'facebook' | 'snapchat' | 'reddit' | 'twitch'
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
          }
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
