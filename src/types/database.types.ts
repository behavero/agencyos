export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string | null
          treasury_balance: number
          tax_jurisdiction: 'RO' | 'US' | 'EE' | 'FR' | null
          current_level: number
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          treasury_balance?: number
          tax_jurisdiction?: 'RO' | 'US' | 'EE' | 'FR' | null
          current_level?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          treasury_balance?: number
          tax_jurisdiction?: 'RO' | 'US' | 'EE' | 'FR' | null
          current_level?: number
          created_at?: string
        }
      }
      models: {
        Row: {
          id: string
          agency_id: string
          name: string | null
          avatar_url: string | null
          fanvue_api_key: string | null
          status: string
        }
        Insert: {
          id?: string
          agency_id: string
          name?: string | null
          avatar_url?: string | null
          fanvue_api_key?: string | null
          status?: string
        }
        Update: {
          id?: string
          agency_id?: string
          name?: string | null
          avatar_url?: string | null
          fanvue_api_key?: string | null
          status?: string
        }
      }
      profiles: {
        Row: {
          id: string
          agency_id: string | null
          username: string | null
          role: 'grandmaster' | 'paladin' | 'alchemist' | 'ranger' | 'rogue' | null
          xp_count: number
          current_streak: number
          league_rank: string
        }
        Insert: {
          id: string
          agency_id?: string | null
          username?: string | null
          role?: 'grandmaster' | 'paladin' | 'alchemist' | 'ranger' | 'rogue' | null
          xp_count?: number
          current_streak?: number
          league_rank?: string
        }
        Update: {
          id?: string
          agency_id?: string | null
          username?: string | null
          role?: 'grandmaster' | 'paladin' | 'alchemist' | 'ranger' | 'rogue' | null
          xp_count?: number
          current_streak?: number
          league_rank?: string
        }
      }
    }
  }
}
