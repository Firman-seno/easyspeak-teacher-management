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
      assignments: {
        Row: {
          assigned_date: string
          attachment: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          max_score: number | null
          score: number | null
          status: string
          student_id: string
          teacher_notes: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          attachment?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          score?: number | null
          status?: string
          student_id: string
          teacher_notes?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          attachment?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          score?: number | null
          status?: string
          student_id?: string
          teacher_notes?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_time: string | null
          created_at: string
          date: string
          id: string
          meeting: string | null
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string
          date: string
          id?: string
          meeting?: string | null
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          check_in_time?: string | null
          created_at?: string
          date?: string
          id?: string
          meeting?: string | null
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachment: string | null
          content: string | null
          created_at: string
          date: string
          duration: number | null
          grammar: string | null
          homework: string | null
          id: string
          level: string | null
          notes: string | null
          objective: string | null
          program: string | null
          speaking_practice: string | null
          status: string
          student_id: string | null
          subtitle: string | null
          success_indicator: string | null
          title: string
          topic: string | null
          unit: string | null
          updated_at: string
          vocabulary: string | null
        }
        Insert: {
          attachment?: string | null
          content?: string | null
          created_at?: string
          date?: string
          duration?: number | null
          grammar?: string | null
          homework?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          objective?: string | null
          program?: string | null
          speaking_practice?: string | null
          status?: string
          student_id?: string | null
          subtitle?: string | null
          success_indicator?: string | null
          title: string
          topic?: string | null
          unit?: string | null
          updated_at?: string
          vocabulary?: string | null
        }
        Update: {
          attachment?: string | null
          content?: string | null
          created_at?: string
          date?: string
          duration?: number | null
          grammar?: string | null
          homework?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          objective?: string | null
          program?: string | null
          speaking_practice?: string | null
          status?: string
          student_id?: string | null
          subtitle?: string | null
          success_indicator?: string | null
          title?: string
          topic?: string | null
          unit?: string | null
          updated_at?: string
          vocabulary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          code: string
          description: string | null
          id: string
          name: string
          order_number: number
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          name: string
          order_number: number
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          name?: string
          order_number?: number
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          absent: number
          areas_to_improve: string | null
          assignments_avg_score: number | null
          assignments_completed: number
          assignments_completion_percent: number
          assignments_in_progress: number
          assignments_overdue: number
          assignments_submitted: number
          assignments_total: number
          attendance_rate: number
          created_at: string
          excused: number
          id: string
          late: number
          lessons_completed: number
          lessons_completed_percent: number
          lessons_in_progress: number
          lessons_planned: number
          lessons_total: number
          level: string | null
          month: number
          next_month_goals: string | null
          overall_progress: number
          present: number
          projects_assigned: number
          projects_avg_score: number | null
          projects_completed: number
          projects_completion_percent: number
          projects_in_progress: number
          projects_overdue: number
          projects_submitted: number
          projects_total: number
          recommendations: string | null
          skills: Json
          strengths: string | null
          student_id: string
          teacher_evaluation: string | null
          total_meetings: number
          year: number
        }
        Insert: {
          absent?: number
          areas_to_improve?: string | null
          assignments_avg_score?: number | null
          assignments_completed?: number
          assignments_completion_percent?: number
          assignments_in_progress?: number
          assignments_overdue?: number
          assignments_submitted?: number
          assignments_total?: number
          attendance_rate?: number
          created_at?: string
          excused?: number
          id?: string
          late?: number
          lessons_completed?: number
          lessons_completed_percent?: number
          lessons_in_progress?: number
          lessons_planned?: number
          lessons_total?: number
          level?: string | null
          month: number
          next_month_goals?: string | null
          overall_progress?: number
          present?: number
          projects_assigned?: number
          projects_avg_score?: number | null
          projects_completed?: number
          projects_completion_percent?: number
          projects_in_progress?: number
          projects_overdue?: number
          projects_submitted?: number
          projects_total?: number
          recommendations?: string | null
          skills?: Json
          strengths?: string | null
          student_id: string
          teacher_evaluation?: string | null
          total_meetings?: number
          year: number
        }
        Update: {
          absent?: number
          areas_to_improve?: string | null
          assignments_avg_score?: number | null
          assignments_completed?: number
          assignments_completion_percent?: number
          assignments_in_progress?: number
          assignments_overdue?: number
          assignments_submitted?: number
          assignments_total?: number
          attendance_rate?: number
          created_at?: string
          excused?: number
          id?: string
          late?: number
          lessons_completed?: number
          lessons_completed_percent?: number
          lessons_in_progress?: number
          lessons_planned?: number
          lessons_total?: number
          level?: string | null
          month?: number
          next_month_goals?: string | null
          overall_progress?: number
          present?: number
          projects_assigned?: number
          projects_avg_score?: number | null
          projects_completed?: number
          projects_completion_percent?: number
          projects_in_progress?: number
          projects_overdue?: number
          projects_submitted?: number
          projects_total?: number
          recommendations?: string | null
          skills?: Json
          strengths?: string | null
          student_id?: string
          teacher_evaluation?: string | null
          total_meetings?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          grammar: number
          id: string
          listening: number
          overall_progress: number
          reading: number
          speaking: number
          student_id: string
          teacher_notes: string | null
          updated_at: string
          vocabulary: number
          writing: number
        }
        Insert: {
          grammar?: number
          id?: string
          listening?: number
          overall_progress?: number
          reading?: number
          speaking?: number
          student_id: string
          teacher_notes?: string | null
          updated_at?: string
          vocabulary?: number
          writing?: number
        }
        Update: {
          grammar?: number
          id?: string
          listening?: number
          overall_progress?: number
          reading?: number
          speaking?: number
          student_id?: string
          teacher_notes?: string | null
          updated_at?: string
          vocabulary?: number
          writing?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_history: {
        Row: {
          created_at: string
          id: string
          new_score: number | null
          notes: string | null
          previous_score: number | null
          skill: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_score?: number | null
          notes?: string | null
          previous_score?: number | null
          skill: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_score?: number | null
          notes?: string | null
          previous_score?: number | null
          skill?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          attachment: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          level: string | null
          objective: string | null
          progress: number
          program: string | null
          score: number | null
          assigned_date: string
          status: string
          student_id: string
          submission_date: string | null
          submission_link: string | null
          feedback: string | null
          teacher_notes: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attachment?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          level?: string | null
          objective?: string | null
          progress?: number
          program?: string | null
          score?: number | null
          assigned_date?: string
          status?: string
          student_id: string
          submission_date?: string | null
          submission_link?: string | null
          feedback?: string | null
          teacher_notes?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          attachment?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          level?: string | null
          objective?: string | null
          progress?: number
          program?: string | null
          score?: number | null
          assigned_date?: string
          status?: string
          student_id?: string
          submission_date?: string | null
          submission_link?: string | null
          feedback?: string | null
          teacher_notes?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          id: number
          phone: string | null
          school_name: string
          teacher_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          id?: number
          phone?: string | null
          school_name?: string
          teacher_name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          id?: number
          phone?: string | null
          school_name?: string
          teacher_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          created_at: string
          current_level: string
          date_of_birth: string | null
          email: string | null
          enrollment_date: string
          gender: string | null
          id: string
          level_start_date: string | null
          level_status: string
          name: string
          notes: string | null
          phone: string | null
          photo: string | null
          program: string
          status: string
          student_id: string
          target_level: string
          teacher: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_level?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string
          gender?: string | null
          id?: string
          level_start_date?: string | null
          level_status?: string
          name: string
          notes?: string | null
          phone?: string | null
          photo?: string | null
          program?: string
          status?: string
          student_id: string
          target_level?: string
          teacher?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          current_level?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string
          gender?: string | null
          id?: string
          level_start_date?: string | null
          level_status?: string
          name?: string
          notes?: string | null
          phone?: string | null
          photo?: string | null
          program?: string
          status?: string
          student_id?: string
          target_level?: string
          teacher?: string | null
          updated_at?: string
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
