export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type RankTier = 'มือใหม่' | 'นักพยากรณ์' | 'โหรมือทอง' | 'เซียนฟันธง' | 'เทพทำนาย'
export type QuestionStatus = 'open' | 'closed' | 'resolved' | 'cancelled'

export interface QuestionOption {
  id: string
  label: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          coins: number
          coins_reset_at: string
          reputation: number
          rank: RankTier
          total_predictions: number
          correct_predictions: number
          win_streak: number
          best_streak: number
          followers_count: number
          following_count: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          id: string; username: string; display_name: string
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      questions: {
        Row: {
          id: string
          category_id: number
          created_by: string
          title: string
          description: string | null
          image_url: string | null
          source_url: string | null
          options: QuestionOption[]
          correct_option: string | null
          status: QuestionStatus
          pool: Record<string, number>
          total_pool: number
          closes_at: string
          resolved_at: string | null
          created_at: string
          updated_at: string
          predictions_count: number
          comments_count: number
          views_count: number
        }
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['questions']['Row']>
      }
      predictions: {
        Row: {
          id: string
          question_id: string
          user_id: string
          option_id: string
          coins_wagered: number
          coins_won: number | null
          odds_at_time: number | null
          rep_delta: number | null
          is_correct: boolean | null
          placed_at: string
          resolved_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['predictions']['Row'], 'id' | 'placed_at'>
        Update: Partial<Database['public']['Tables']['predictions']['Row']>
      }
      categories: {
        Row: { id: number; slug: string; name_th: string; emoji: string; sort_order: number }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['categories']['Row']>
      }
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>
        Update: never
      }
      comments: {
        Row: {
          id: string; question_id: string; user_id: string; parent_id: string | null
          body: string; likes_count: number; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'created_at' | 'likes_count'>
        Update: Partial<Database['public']['Tables']['comments']['Row']>
      }
      coin_transactions: {
        Row: {
          id: string; user_id: string; amount: number; balance: number
          reason: string; ref_id: string | null; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['coin_transactions']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Functions: {
      place_prediction: {
        Args: { p_question_id: string; p_user_id: string; p_option_id: string; p_coins: number }
        Returns: Database['public']['Tables']['predictions']['Row']
      }
    }
  }
}
