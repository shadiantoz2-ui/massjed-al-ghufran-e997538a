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
      app_settings: {
        Row: {
          current_academic_year: number
          id: number
          updated_at: string
        }
        Insert: {
          current_academic_year?: number
          id?: number
          updated_at?: string
        }
        Update: {
          current_academic_year?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          academic_year: number | null
          archived: boolean
          attendance_date: string
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          status: string
          student_id: string
        }
        Insert: {
          academic_year?: number | null
          archived?: boolean
          attendance_date?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status: string
          student_id: string
        }
        Update: {
          academic_year?: number | null
          archived?: boolean
          attendance_date?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_current: boolean
          name: string
          started_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name: string
          started_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name?: string
          started_at?: string
          year?: number
        }
        Relationships: []
      }
      hadith_recitations: {
        Row: {
          academic_year: number
          archived: boolean
          course_id: string | null
          created_at: string
          grade: string | null
          hadith_number: number
          id: string
          notes: string | null
          points: number
          recitation_date: string
          recitation_type: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          academic_year: number
          archived?: boolean
          course_id?: string | null
          created_at?: string
          grade?: string | null
          hadith_number: number
          id?: string
          notes?: string | null
          points?: number
          recitation_date?: string
          recitation_type?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          academic_year?: number
          archived?: boolean
          course_id?: string | null
          created_at?: string
          grade?: string | null
          hadith_number?: number
          id?: string
          notes?: string | null
          points?: number
          recitation_date?: string
          recitation_type?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hadith_recitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hadith_recitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          academic_year: number | null
          archived: boolean
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          points: number
          reason: string | null
          reference_id: string | null
          source: string
          student_id: string
        }
        Insert: {
          academic_year?: number | null
          archived?: boolean
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          points: number
          reason?: string | null
          reference_id?: string | null
          source: string
          student_id: string
        }
        Update: {
          academic_year?: number | null
          archived?: boolean
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          points?: number
          reason?: string | null
          reference_id?: string | null
          source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      probes: {
        Row: {
          academic_year: number | null
          archived: boolean
          course_id: string | null
          created_at: string
          grade: string | null
          id: string
          juz_number: number
          notes: string | null
          points: number
          probe_date: string
          recitation_type: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: number | null
          archived?: boolean
          course_id?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          juz_number: number
          notes?: string | null
          points?: number
          probe_date?: string
          recitation_type?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: number | null
          archived?: boolean
          course_id?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          juz_number?: number
          notes?: string | null
          points?: number
          probe_date?: string
          recitation_type?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "probes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "probes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      recitations: {
        Row: {
          academic_year: number
          archived: boolean
          course_id: string | null
          created_at: string
          from_ayah: number | null
          grade: string | null
          id: string
          kind: string
          notes: string | null
          page_number: number | null
          recitation_date: string
          recitation_type: string
          student_id: string
          surah_number: number | null
          teacher_id: string
          to_ayah: number | null
        }
        Insert: {
          academic_year: number
          archived?: boolean
          course_id?: string | null
          created_at?: string
          from_ayah?: number | null
          grade?: string | null
          id?: string
          kind: string
          notes?: string | null
          page_number?: number | null
          recitation_date?: string
          recitation_type?: string
          student_id: string
          surah_number?: number | null
          teacher_id: string
          to_ayah?: number | null
        }
        Update: {
          academic_year?: number
          archived?: boolean
          course_id?: string | null
          created_at?: string
          from_ayah?: number | null
          grade?: string | null
          id?: string
          kind?: string
          notes?: string | null
          page_number?: number | null
          recitation_date?: string
          recitation_type?: string
          student_id?: string
          surah_number?: number | null
          teacher_id?: string
          to_ayah?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_year: number | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          father_job: string | null
          father_name: string | null
          father_phone: string | null
          full_name: string
          grade_level: string | null
          id: string
          mother_name: string | null
          mother_phone: string | null
          nickname: string | null
          teacher_id: string | null
        }
        Insert: {
          address?: string | null
          birth_year?: number | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          father_job?: string | null
          father_name?: string | null
          father_phone?: string | null
          full_name: string
          grade_level?: string | null
          id?: string
          mother_name?: string | null
          mother_phone?: string | null
          nickname?: string | null
          teacher_id?: string | null
        }
        Update: {
          address?: string | null
          birth_year?: number | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          father_job?: string | null
          father_name?: string | null
          father_phone?: string | null
          full_name?: string
          grade_level?: string | null
          id?: string
          mother_name?: string | null
          mother_phone?: string | null
          nickname?: string | null
          teacher_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_course: { Args: { _course_id: string }; Returns: undefined }
      export_courses_data: {
        Args: { _course_ids: string[] }
        Returns: {
          address: string
          birth_year: number
          contact_phone: string
          course_name: string
          course_year: number
          father_job: string
          father_name: string
          father_phone: string
          grade_level: string
          hadiths_count: number
          late_count: number
          mother_name: string
          mother_phone: string
          nickname: string
          pages_count: number
          present_count: number
          probes_count: number
          student_name: string
          surahs_count: number
          teacher_name: string
          total_points: number
        }[]
      }
      export_points_data: {
        Args: { _course_id: string }
        Returns: {
          attendance_points: number
          course_name: string
          course_year: number
          father_name: string
          grade_level: string
          hadiths_points: number
          manual_points: number
          nickname: string
          pages_points: number
          probes_points: number
          student_name: string
          surahs_points: number
          teacher_name: string
          total_points: number
        }[]
      }
      get_current_course: {
        Args: never
        Returns: {
          id: string
          name: string
          year: number
        }[]
      }
      get_student_achievements: {
        Args: { _student_id: string }
        Returns: {
          course_id: string
          course_name: string
          course_year: number
          ended_at: string
          hadiths_count: number
          is_current: boolean
          pages_count: number
          probes_count: number
          surahs_count: number
          total_points: number
        }[]
      }
      get_student_attendance: {
        Args: { _student_id: string }
        Returns: {
          academic_year: number
          archived: boolean
          attendance_date: string
          id: string
          status: string
        }[]
      }
      get_student_basic: {
        Args: { _student_id: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_student_hadiths: {
        Args: { _student_id: string }
        Returns: {
          academic_year: number
          archived: boolean
          grade: string
          hadith_number: number
          id: string
          notes: string
          recitation_date: string
          recitation_type: string
          teacher_id: string
        }[]
      }
      get_student_point_events: {
        Args: { _student_id: string }
        Returns: {
          academic_year: number
          archived: boolean
          created_at: string
          id: string
          points: number
          reason: string
          source: string
        }[]
      }
      get_student_probes: {
        Args: { _student_id: string }
        Returns: {
          academic_year: number
          archived: boolean
          grade: string
          id: string
          juz_number: number
          notes: string
          probe_date: string
          recitation_type: string
        }[]
      }
      get_student_recitations: {
        Args: { _student_id: string }
        Returns: {
          academic_year: number
          archived: boolean
          from_ayah: number
          grade: string
          id: string
          kind: string
          notes: string
          page_number: number
          recitation_date: string
          recitation_type: string
          surah_number: number
          to_ayah: number
        }[]
      }
      get_student_total_points: {
        Args: { _student_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_halaqah_teacher_of: {
        Args: { _student_id: string; _uid: string }
        Returns: boolean
      }
      list_courses: {
        Args: never
        Returns: {
          ended_at: string
          id: string
          is_current: boolean
          name: string
          started_at: string
          year: number
        }[]
      }
      list_teachers: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      search_students_by_name: {
        Args: { _query: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_new_course: {
        Args: { _name: string; _year: number }
        Returns: undefined
      }
      surah_points: { Args: { _surah: number }; Returns: number }
      update_course: {
        Args: { _course_id: string; _name: string; _year: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "reciter" | "halaqah"
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
      app_role: ["admin", "supervisor", "reciter", "halaqah"],
    },
  },
} as const
