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
      badges: {
        Row: {
          category: string
          created_at: string
          description_th: string | null
          emoji: string
          id: string
          is_active: boolean
          name_th: string
        }
        Insert: {
          category?: string
          created_at?: string
          description_th?: string | null
          emoji: string
          id: string
          is_active?: boolean
          name_th: string
        }
        Update: {
          category?: string
          created_at?: string
          description_th?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name_th?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          emoji: string
          id: number
          name_th: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          emoji: string
          id?: number
          name_th: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          emoji?: string
          id?: number
          name_th?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      category_visibility: {
        Row: {
          hidden: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          hidden?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          hidden?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          coins_won: number | null
          comment_id: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          message: string | null
          question_id: string | null
          read: boolean | null
          rep_delta: number | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          coins_won?: number | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          message?: string | null
          question_id?: string | null
          read?: boolean | null
          rep_delta?: number | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          coins_won?: number | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          message?: string | null
          question_id?: string | null
          read?: boolean | null
          rep_delta?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          anon_id: string
          id: string
          path: string
          session_id: string
          viewed_at: string
        }
        Insert: {
          anon_id: string
          id?: string
          path: string
          session_id: string
          viewed_at?: string
        }
        Update: {
          anon_id?: string
          id?: string
          path?: string
          session_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_snapshots: {
        Row: {
          id: number
          pool: Record<string, number>
          question_id: string
          recorded_at: string
        }
        Insert: {
          id?: number
          pool: Record<string, number>
          question_id: string
          recorded_at?: string
        }
        Update: {
          id?: number
          pool?: Json
          question_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_snapshots_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          coins_wagered: number
          coins_won: number | null
          id: string
          is_correct: boolean | null
          odds_at_time: number | null
          option_id: string
          placed_at: string
          question_id: string
          referred_by: string | null
          rep_delta: number | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          coins_wagered: number
          coins_won?: number | null
          id?: string
          is_correct?: boolean | null
          odds_at_time?: number | null
          option_id: string
          placed_at?: string
          question_id: string
          referred_by?: string | null
          rep_delta?: number | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          coins_wagered?: number
          coins_won?: number | null
          id?: string
          is_correct?: boolean | null
          odds_at_time?: number | null
          option_id?: string
          placed_at?: string
          question_id?: string
          referred_by?: string | null
          rep_delta?: number | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_shares: {
        Row: {
          id: string
          question_id: string
          shared_at: string
          user_id: string
        }
        Insert: {
          id?: string
          question_id: string
          shared_at?: string
          user_id: string
        }
        Update: {
          id?: string
          question_id?: string
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_shares_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          card_style: string
          category_id: number
          closes_at: string
          comments_count: number
          correct_option: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_daily_hero: boolean
          is_pinned_trending: boolean
          options: Json
          pool: Record<string, number>
          predictions_count: number
          resolved_at: string | null
          sort_order: number | null
          source_url: string | null
          status: Database["public"]["Enums"]["question_status"]
          title: string
          total_pool: number
          trending_sort_order: number | null
          updated_at: string
          views_count: number
        }
        Insert: {
          card_style?: string
          category_id: number
          closes_at: string
          comments_count?: number
          correct_option?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_daily_hero?: boolean
          is_pinned_trending?: boolean
          options?: Json
          pool?: Json
          predictions_count?: number
          resolved_at?: string | null
          sort_order?: number | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          title: string
          total_pool?: number
          trending_sort_order?: number | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          card_style?: string
          category_id?: number
          closes_at?: string
          comments_count?: number
          correct_option?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_daily_hero?: boolean
          is_pinned_trending?: boolean
          options?: Json
          pool?: Json
          predictions_count?: number
          resolved_at?: string | null
          sort_order?: number | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          title?: string
          total_pool?: number
          trending_sort_order?: number | null
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_questions: {
        Row: {
          created_at: string
          id: number
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          best_streak: number
          bio: string | null
          coins: number
          coins_reset_at: string
          correct_predictions: number
          created_at: string
          display_name: string
          followers_count: number
          following_count: number
          id: string
          last_login_bonus_at: string | null
          rank: Database["public"]["Enums"]["rank_tier"]
          reputation: number
          total_predictions: number
          updated_at: string
          username: string
          win_streak: number
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          bio?: string | null
          coins?: number
          coins_reset_at?: string
          correct_predictions?: number
          created_at?: string
          display_name: string
          followers_count?: number
          following_count?: number
          id: string
          last_login_bonus_at?: string | null
          rank?: Database["public"]["Enums"]["rank_tier"]
          reputation?: number
          total_predictions?: number
          updated_at?: string
          username: string
          win_streak?: number
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          bio?: string | null
          coins?: number
          coins_reset_at?: string
          correct_predictions?: number
          created_at?: string
          display_name?: string
          followers_count?: number
          following_count?: number
          id?: string
          last_login_bonus_at?: string | null
          rank?: Database["public"]["Enums"]["rank_tier"]
          reputation?: number
          total_predictions?: number
          updated_at?: string
          username?: string
          win_streak?: number
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          anon_id: string
          device_type: string | null
          first_seen: string
          id: string
          last_seen: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anon_id: string
          device_type?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string
          device_type?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_question: {
        Args: { p_question_id: string }
        Returns: undefined
      }
      award_badge: {
        Args: { p_badge_id: string; p_user_id: string }
        Returns: undefined
      }
      check_and_award_badges: {
        Args: { p_question_id?: string; p_user_id: string }
        Returns: undefined
      }
      daily_login_bonus: { Args: { p_user_id: string }; Returns: number }
      place_prediction: {
        Args: {
          p_coins: number
          p_option_id: string
          p_question_id: string
          p_referred_by?: string
          p_user_id: string
        }
        Returns: {
          coins_wagered: number
          coins_won: number | null
          id: string
          is_correct: boolean | null
          odds_at_time: number | null
          option_id: string
          placed_at: string
          question_id: string
          referred_by: string | null
          rep_delta: number | null
          resolved_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "predictions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_question: {
        Args: { p_correct_option: string; p_question_id: string }
        Returns: undefined
      }
      share_question_reward: {
        Args: { p_question_id: string; p_user_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      question_status: "open" | "closed" | "resolved" | "cancelled" | "pending"
      rank_tier:
        | "ผู้มาใหม่"
        | "ผู้ตื่นรู้"
        | "นักพยากรณ์"
        | "โหรมือทอง"
        | "เซียนทำนาย"
        | "เทพทำนาย"
        | "จักรวาลเลือก"
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
      question_status: ["open", "closed", "resolved", "cancelled", "pending"],
      rank_tier: [
        "ผู้มาใหม่",
        "ผู้ตื่นรู้",
        "นักพยากรณ์",
        "โหรมือทอง",
        "เซียนทำนาย",
        "เทพทำนาย",
        "จักรวาลเลือก",
      ],
    },
  },
} as const

export type QuestionOption = { id: string; label: string; icon_url?: string | null }
export type RankTier = "ผู้มาใหม่" | "ผู้ตื่นรู้" | "นักพยากรณ์" | "โหรมือทอง" | "เซียนทำนาย" | "เทพทำนาย" | "จักรวาลเลือก"
export type Pool = Record<string, number>
