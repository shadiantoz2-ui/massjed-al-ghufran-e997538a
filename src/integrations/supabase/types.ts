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
      hadith_recitations: {
        Row: {
          academic_year: number
          archived: boolean
          created_at: string
          grade: string | null
          hadith_number: number
          id: string
          notes: string | null
          recitation_date: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          academic_year: number
          archived?: boolean
          created_at?: string
          grade?: string | null
          hadith_number: number
          id?: string
          notes?: string | null
          recitation_date?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          academic_year?: number
          archived?: boolean
          created_at?: string
          grade?: string | null
          hadith_number?: number
          id?: string
          notes?: string | null
          recitation_date?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hadith_recitations_student_id_fkey"
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
          created_at: string
          grade: string | null
          id: string
          juz_number: number
          notes: string | null
          probe_date: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: number | null
          archived?: boolean
          created_at?: string
          grade?: string | null
          id?: string
          juz_number: number
          notes?: string | null
          probe_date?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: number | null
          archived?: boolean
          created_at?: string
          grade?: string | null
          id?: string
          juz_number?: number
          notes?: string | null
          probe_date?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
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
          teacher_id: string
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
      start_new_academic_year: { Args: never; Returns: undefined }
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
