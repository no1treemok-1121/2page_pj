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
      banned_words: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          word: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          word: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          word?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      comment_daily_usage: {
        Row: {
          id: string
          used_count: number | null
          used_date: string
          user_id: string
        }
        Insert: {
          id?: string
          used_count?: number | null
          used_date?: string
          user_id: string
        }
        Update: {
          id?: string
          used_count?: number | null
          used_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_daily_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_blind: boolean | null
          post_id: string
          report_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_blind?: boolean | null
          post_id: string
          report_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_blind?: boolean | null
          post_id?: string
          report_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          is_active: boolean | null
          owner_id: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          is_active?: boolean | null
          owner_id?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          is_active?: boolean | null
          owner_id?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          doc_type: string
          effective_date: string
          id: number
          is_current: boolean | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          doc_type: string
          effective_date: string
          id?: number
          is_current?: boolean | null
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          doc_type?: string
          effective_date?: string
          id?: number
          is_current?: boolean | null
          version?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
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
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          blinded_at: string | null
          category_id: number | null
          comment_count: number | null
          content: string
          created_at: string | null
          duration_hours: number | null
          expires_at: string
          id: string
          image_urls: string[] | null
          is_blind: boolean | null
          is_locked: boolean | null
          like_count: number | null
          locked_at: string | null
          report_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blinded_at?: string | null
          category_id?: number | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          duration_hours?: number | null
          expires_at: string
          id?: string
          image_urls?: string[] | null
          is_blind?: boolean | null
          is_locked?: boolean | null
          like_count?: number | null
          locked_at?: string | null
          report_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blinded_at?: string | null
          category_id?: number | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          duration_hours?: number | null
          expires_at?: string
          id?: string
          image_urls?: string[] | null
          is_blind?: boolean | null
          is_locked?: boolean | null
          like_count?: number | null
          locked_at?: string | null
          report_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string | null
          invite_used: number | null
          invited_by: string | null
          is_subscribed: boolean | null
          nickname: string
          nickname_changed_at: string | null
          sub_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          invite_code?: string | null
          invite_used?: number | null
          invited_by?: string | null
          is_subscribed?: boolean | null
          nickname: string
          nickname_changed_at?: string | null
          sub_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string | null
          invite_used?: number | null
          invited_by?: string | null
          is_subscribed?: boolean | null
          nickname?: string
          nickname_changed_at?: string | null
          sub_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          reporter_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reporter_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
