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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      user_profiles: {
        Row: {
          board: string
          created_at: string
          daily_target: number
          display_name: string | null
          exam_year: number
          main_end: string
          main_start: string
          onboarding_completed: boolean
          onboarding_step: number
          privacy_accepted_at: string | null
          privacy_version: string | null
          selected_subjects: string[]
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          board?: string
          created_at?: string
          daily_target?: number
          display_name?: string | null
          exam_year?: number
          main_end?: string
          main_start?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          selected_subjects?: string[]
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          board?: string
          created_at?: string
          daily_target?: number
          display_name?: string | null
          exam_year?: number
          main_end?: string
          main_start?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          selected_subjects?: string[]
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_links: {
        Row: {
          calendar_id: string
          conflict_state: string | null
          event_etag: string | null
          event_id: string
          id: string
          last_app_update: string | null
          last_calendar_update: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          conflict_state?: string | null
          event_etag?: string | null
          event_id: string
          id?: string
          last_app_update?: string | null
          last_calendar_update?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          conflict_state?: string | null
          event_etag?: string | null
          event_id?: string
          id?: string
          last_app_update?: string | null
          last_calendar_update?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_links_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "study_tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      chapter_preferences: {
        Row: {
          chapter_id: string
          excluded: boolean
          exclusion_reason: string | null
          included_for_ssc: boolean
          priority: number
          target_month: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          excluded?: boolean
          exclusion_reason?: string | null
          included_for_ssc?: boolean
          priority?: number
          target_month?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          excluded?: boolean
          exclusion_reason?: string | null
          included_for_ssc?: boolean
          priority?: number
          target_month?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_preferences_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_progress: {
        Row: {
          chapter_id: string
          confidence: number
          id: string
          last_studied: string | null
          next_review: string | null
          questions_attempted: number
          questions_correct: number
          status: Database["public"]["Enums"]["mastery_status"]
          timed_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          confidence?: number
          id: string
          last_studied?: string | null
          next_review?: string | null
          questions_attempted?: number
          questions_correct?: number
          status?: Database["public"]["Enums"]["mastery_status"]
          timed_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          confidence?: number
          id?: string
          last_studied?: string | null
          next_review?: string | null
          questions_attempted?: number
          questions_correct?: number
          status?: Database["public"]["Enums"]["mastery_status"]
          timed_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          steps: string[]
          updated_at: string
          workflow_kind: string
        }
        Insert: {
          steps?: string[]
          updated_at?: string
          workflow_kind: string
        }
        Update: {
          steps?: string[]
          updated_at?: string
          workflow_kind?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          chapter_number: number | null
          created_at: string
          division: string | null
          id: string
          note: string | null
          question_formats: string[]
          subject_id: string
          syllabus_eligible: boolean
          title: string
        }
        Insert: {
          chapter_number?: number | null
          created_at?: string
          division?: string | null
          id: string
          note?: string | null
          question_formats?: string[]
          subject_id: string
          syllabus_eligible?: boolean
          title: string
        }
        Update: {
          chapter_number?: number | null
          created_at?: string
          division?: string | null
          id?: string
          note?: string | null
          question_formats?: string[]
          subject_id?: string
          syllabus_eligible?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          ends_on: string
          id: string
          name: string
          stage: string
          starts_on: string
          syllabus_scope: string
        }
        Insert: {
          ends_on: string
          id: string
          name: string
          stage: string
          starts_on: string
          syllabus_scope: string
        }
        Update: {
          ends_on?: string
          id?: string
          name?: string
          stage?: string
          starts_on?: string
          syllabus_scope?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          attempted: number
          chapter_id: string
          confidence_after: number | null
          confidence_before: number | null
          correct: number
          created_at: string
          id: string
          learning_goal: string | null
          minutes: number
          mistakes_text: string | null
          next_action: string | null
          reflection: string | null
          resources: string[]
          subject_id: string
          task_id: string | null
          updated_at: string
          user_id: string
          written_score: number | null
        }
        Insert: {
          attempted?: number
          chapter_id: string
          confidence_after?: number | null
          confidence_before?: number | null
          correct?: number
          created_at?: string
          id: string
          learning_goal?: string | null
          minutes?: number
          mistakes_text?: string | null
          next_action?: string | null
          reflection?: string | null
          resources?: string[]
          subject_id: string
          task_id?: string | null
          updated_at?: string
          user_id: string
          written_score?: number | null
        }
        Update: {
          attempted?: number
          chapter_id?: string
          confidence_after?: number | null
          confidence_before?: number | null
          correct?: number
          created_at?: string
          id?: string
          learning_goal?: string | null
          minutes?: number
          mistakes_text?: string | null
          next_action?: string | null
          reflection?: string | null
          resources?: string[]
          subject_id?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
          written_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      marks_distributions: {
        Row: {
          choice_rule: string
          id: string
          marks: number
          part: string | null
          question_type: string
          subject_id: string
        }
        Insert: {
          choice_rule: string
          id?: string
          marks: number
          part?: string | null
          question_type: string
          subject_id: string
        }
        Update: {
          choice_rule?: string
          id?: string
          marks?: number
          part?: string | null
          question_type?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_distributions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mistakes: {
        Row: {
          chapter_id: string
          error_type: string
          explanation: string | null
          id: string
          prompt: string
          reattempt_date: string | null
          resolved: boolean
          resolved_at: string | null
          revision_count: number
          last_attempted_at: string | null
          last_attempt_note: string | null
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          error_type: string
          explanation?: string | null
          id: string
          prompt: string
          reattempt_date?: string | null
          resolved?: boolean
          resolved_at?: string | null
          revision_count?: number
          last_attempted_at?: string | null
          last_attempt_note?: string | null
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          error_type?: string
          explanation?: string | null
          id?: string
          prompt?: string
          reattempt_date?: string | null
          resolved?: boolean
          resolved_at?: string | null
          revision_count?: number
          last_attempted_at?: string | null
          last_attempt_note?: string | null
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_results: {
        Row: {
          breakdown: Json
          duration_minutes: number | null
          id: string
          paper_type: string | null
          score: number
          subject_id: string
          taken_at: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          breakdown?: Json
          duration_minutes?: number | null
          id: string
          paper_type?: string | null
          score: number
          subject_id: string
          taken_at?: string
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          breakdown?: Json
          duration_minutes?: number | null
          id?: string
          paper_type?: string | null
          score?: number
          subject_id?: string
          taken_at?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_resources: {
        Row: {
          archived: boolean
          chapter_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
          subject_id: string
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          chapter_id: string
          created_at?: string
          id: string
          kind?: string
          note?: string | null
          subject_id: string
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          archived?: boolean
          chapter_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          subject_id?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          chapter_id: string | null
          completed: boolean
          ended_at: string | null
          focused_seconds: number
          id: string
          mode: string
          pause_seconds: number
          questions_attempted: number | null
          questions_correct: number | null
          started_at: string
          subject_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed?: boolean
          ended_at?: string | null
          focused_seconds?: number
          id?: string
          mode?: string
          pause_seconds?: number
          questions_attempted?: number | null
          questions_correct?: number | null
          started_at: string
          subject_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          completed?: boolean
          ended_at?: string | null
          focused_seconds?: number
          id?: string
          mode?: string
          pause_seconds?: number
          questions_attempted?: number | null
          questions_correct?: number | null
          started_at?: string
          subject_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_user_id_task_id_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "study_tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      adaptive_plan_summaries: {
        Row: {
          available_minutes: number
          deferred_count: number
          generated_revision_count: number
          planned_at: string
          rationale: string[]
          updated_at: string
          used_minutes: number
          user_id: string
        }
        Insert: {
          available_minutes?: number
          deferred_count?: number
          generated_revision_count?: number
          planned_at?: string
          rationale?: string[]
          updated_at?: string
          used_minutes?: number
          user_id: string
        }
        Update: {
          available_minutes?: number
          deferred_count?: number
          generated_revision_count?: number
          planned_at?: string
          rationale?: string[]
          updated_at?: string
          used_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      exam_events: {
        Row: {
          archived: boolean
          ends_on: string
          id: string
          kind: string
          locked: boolean
          name: string
          note: string | null
          scope: string[]
          starts_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          ends_on: string
          id: string
          kind: string
          locked?: boolean
          name: string
          note?: string | null
          scope?: string[]
          starts_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          ends_on?: string
          id?: string
          kind?: string
          locked?: boolean
          name?: string
          note?: string | null
          scope?: string[]
          starts_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_settings: {
        Row: {
          agriculture_days_per_week: number
          daily_target: number
          math_days_per_week: number
          math_end: string
          math_start: string
          main_end: string
          main_start: string
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agriculture_days_per_week?: number
          daily_target?: number
          math_days_per_week?: number
          math_end?: string
          math_start?: string
          main_end?: string
          main_start?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agriculture_days_per_week?: number
          daily_target?: number
          math_days_per_week?: number
          math_end?: string
          math_start?: string
          main_end?: string
          main_start?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_tasks: {
        Row: {
          chapter_id: string
          current_step: number
          deferred_until: string | null
          duration_minutes: number
          focused_seconds: number
          id: string
          origin: string
          pinned: boolean
          planned_end: string | null
          planned_start: string | null
          priority_explanation: string | null
          priority_score: number
          status: Database["public"]["Enums"]["task_status"]
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          current_step?: number
          deferred_until?: string | null
          duration_minutes?: number
          focused_seconds?: number
          id: string
          origin: string
          pinned?: boolean
          planned_end?: string | null
          planned_start?: string | null
          priority_explanation?: string | null
          priority_score?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          current_step?: number
          deferred_until?: string | null
          duration_minutes?: number
          focused_seconds?: number
          id?: string
          origin?: string
          pinned?: boolean
          planned_end?: string | null
          planned_start?: string | null
          priority_explanation?: string | null
          priority_score?: number
          status?: Database["public"]["Enums"]["task_status"]
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          maintenance_target: number
          name: string
          priority: number
          short_name: string
          strength_level: string
          workflow_kind: string
        }
        Insert: {
          created_at?: string
          id: string
          maintenance_target?: number
          name: string
          priority?: number
          short_name: string
          strength_level: string
          workflow_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_target?: number
          name?: string
          priority?: number
          short_name?: string
          strength_level?: string
          workflow_kind?: string
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          calendar_sync_token: string | null
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          last_successful_sync: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
          watch_channel_id: string | null
          watch_expires_at: string | null
          watch_resource_id: string | null
        }
        Insert: {
          calendar_sync_token?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          last_successful_sync?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
        }
        Update: {
          calendar_sync_token?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          last_successful_sync?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
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
      mastery_status:
        | "not-started"
        | "learning"
        | "practising"
        | "exam-ready"
        | "needs-revision"
      task_status: "planned" | "in-progress" | "completed" | "skipped"
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
      mastery_status: [
        "not-started",
        "learning",
        "practising",
        "exam-ready",
        "needs-revision",
      ],
      task_status: ["planned", "in-progress", "completed", "skipped"],
    },
  },
} as const
