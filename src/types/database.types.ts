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
      models: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string | null
          fanvue_access_token: string | null
          fanvue_api_key: string | null
          fanvue_refresh_token: string | null
          fanvue_token_expires_at: string | null
          fanvue_user_id: string | null
          fanvue_user_uuid: string | null
          fanvue_username: string | null
          id: string
          instagram_access_token: string | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          fanvue_access_token?: string | null
          fanvue_api_key?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expires_at?: string | null
          fanvue_user_id?: string | null
          fanvue_user_uuid?: string | null
          fanvue_username?: string | null
          id?: string
          instagram_access_token?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          fanvue_access_token?: string | null
          fanvue_api_key?: string | null
          fanvue_refresh_token?: string | null
          fanvue_token_expires_at?: string | null
          fanvue_user_id?: string | null
          fanvue_user_uuid?: string | null
          fanvue_username?: string | null
          id?: string
          instagram_access_token?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
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
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
