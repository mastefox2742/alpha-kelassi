// Auto-generated Supabase types stub
// Run `pnpm db:generate-types` to regenerate from Supabase schema

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
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'student' | 'admin'
          plan: 'free' | 'premium'
          xp: number
          streak: number
          onboarding_completed: boolean
          study_level_pref: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d' | null
          subject_ids_pref: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          phone?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'admin'
          plan?: 'free' | 'premium'
          xp?: number
          streak?: number
          onboarding_completed?: boolean
          study_level_pref?: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d' | null
          subject_ids_pref?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'admin'
          plan?: 'free' | 'premium'
          xp?: number
          streak?: number
          onboarding_completed?: boolean
          study_level_pref?: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d' | null
          subject_ids_pref?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          name: string
          level: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          country_code: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          level: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          country_code?: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          level?: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          country_code?: string
          icon?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          subject_id: string | null
          type: 'cours' | 'examen'
          title: string
          level: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          year: number | null
          session: 'normale' | 'rattrapage' | null
          country_code: string
          pdf_url: string | null
          corrige_url: string | null
          text_content: string | null
          is_premium: boolean
          embed_status: 'pending' | 'processing' | 'done' | 'error' | null
          indexed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id?: string | null
          type: 'cours' | 'examen'
          title: string
          level: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          year?: number | null
          session?: 'normale' | 'rattrapage' | null
          country_code?: string
          pdf_url?: string | null
          corrige_url?: string | null
          text_content?: string | null
          is_premium?: boolean
          embed_status?: 'pending' | 'processing' | 'done' | 'error' | null
          indexed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string | null
          type?: 'cours' | 'examen'
          title?: string
          level?: 'bepc' | 'bac_a' | 'bac_c' | 'bac_d'
          year?: number | null
          session?: 'normale' | 'rattrapage' | null
          country_code?: string
          pdf_url?: string | null
          corrige_url?: string | null
          text_content?: string | null
          is_premium?: boolean
          embed_status?: 'pending' | 'processing' | 'done' | 'error' | null
          indexed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documents_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          }
        ]
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          page_number: number | null
          embedding: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          content: string
          chunk_index: number
          page_number?: number | null
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          content?: string
          chunk_index?: number
          page_number?: number | null
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'document_chunks_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'documents'
            referencedColumns: ['id']
          }
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          title?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'chat_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          front: string
          back: string
          next_review: string
          ease_factor: number
          interval: number
          reps: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          front: string
          back: string
          next_review?: string
          ease_factor?: number
          interval?: number
          reps?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          front?: string
          back?: string
          next_review?: string
          ease_factor?: number
          interval?: number
          reps?: number
          created_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_code: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_code: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_code?: string
          earned_at?: string
        }
        Relationships: []
      }
      document_views: {
        Row: {
          id: string
          user_id: string
          document_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_sub_id: string | null
          cinetpay_ref: string | null
          plan: 'free' | 'premium'
          status: 'active' | 'canceled' | 'past_due' | 'trialing'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_sub_id?: string | null
          cinetpay_ref?: string | null
          plan?: 'free' | 'premium'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_sub_id?: string | null
          cinetpay_ref?: string | null
          plan?: 'free' | 'premium'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string
          created_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          score_avg: number | null
          streak_days: number
          last_active: string | null
          flashcards_reviewed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string
          score_avg?: number | null
          streak_days?: number
          last_active?: string | null
          flashcards_reviewed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string
          score_avg?: number | null
          streak_days?: number
          last_active?: string | null
          flashcards_reviewed?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          id: string
          user_id: string
          rating: number
          comment: string | null
          page: string | null
          app_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rating: number
          comment?: string | null
          page?: string | null
          app_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          page?: string | null
          app_version?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          message: string
          cta_label: string | null
          cta_url: string | null
          target_plan: 'all' | 'free' | 'premium'
          is_active: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type?: string
          title: string
          message: string
          cta_label?: string | null
          cta_url?: string | null
          target_plan?: 'all' | 'free' | 'premium'
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          message?: string
          cta_label?: string | null
          cta_url?: string | null
          target_plan?: 'all' | 'free' | 'premium'
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_chunks: {
        Args: {
          query_embedding: string
          match_count?: number
          min_similarity?: number
          filter_document_id?: string
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          page_number: number | null
          metadata: Json
          similarity: number
        }[]
      }
      increment_xp: {
        Args: { p_user_id: string; p_amount: number }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never
