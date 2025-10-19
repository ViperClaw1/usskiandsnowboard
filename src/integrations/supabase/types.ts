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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      athlete_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          career_interests: string[] | null
          created_at: string
          email: string | null
          geographic_preferences: string[] | null
          id: string
          instagram_url: string | null
          is_public: boolean | null
          photo_url: string | null
          professional_highlights: string | null
          profile_completeness: number | null
          profile_views: number | null
          skills: string[] | null
          sponsors: string[] | null
          sport_discipline: string | null
          updated_at: string
          user_id: string
          years_of_membership: number | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          career_interests?: string[] | null
          created_at?: string
          email?: string | null
          geographic_preferences?: string[] | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          photo_url?: string | null
          professional_highlights?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          skills?: string[] | null
          sponsors?: string[] | null
          sport_discipline?: string | null
          updated_at?: string
          user_id: string
          years_of_membership?: number | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          career_interests?: string[] | null
          created_at?: string
          email?: string | null
          geographic_preferences?: string[] | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          photo_url?: string | null
          professional_highlights?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          skills?: string[] | null
          sponsors?: string[] | null
          sport_discipline?: string | null
          updated_at?: string
          user_id?: string
          years_of_membership?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          athlete_id: string
          created_at: string
          employer_id: string
          id: string
          message: string | null
          opportunity_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          employer_id: string
          id?: string
          message?: string | null
          opportunity_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          message?: string | null
          opportunity_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          athlete_id: string
          created_at: string
          degree: string | null
          graduation_year: number | null
          id: string
          school: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          degree?: string | null
          graduation_year?: number | null
          id?: string
          school: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          degree?: string | null
          graduation_year?: number | null
          id?: string
          school?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          about: string | null
          company_name: string
          company_size: string | null
          contact_email: string | null
          contact_person: string | null
          contact_title: string | null
          created_at: string
          hq_location: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          logo_url: string | null
          opportunities_offered: string | null
          profile_completeness: number | null
          profile_views: number | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          about?: string | null
          company_name: string
          company_size?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          created_at?: string
          hq_location?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          opportunities_offered?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          about?: string | null
          company_name?: string
          company_size?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          created_at?: string
          hq_location?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          opportunities_offered?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experience: {
        Row: {
          athlete_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          organization: string | null
          start_date: string | null
          title: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          organization?: string | null
          start_date?: string | null
          title: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          organization?: string | null
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          created_at: string
          date: string | null
          excerpt: string | null
          id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      clear_connection_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "athlete" | "employer" | "admin"
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
      app_role: ["athlete", "employer", "admin"],
    },
  },
} as const
