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
      athlete_achievements: {
        Row: {
          achievement_date: string
          athlete_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          result: string | null
          title: string
          updated_at: string
        }
        Insert: {
          achievement_date: string
          athlete_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          result?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          achievement_date?: string
          athlete_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          result?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_achievements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_achievements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_awards: {
        Row: {
          athlete_id: string
          award_date: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          issuer: string
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          award_date: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          issuer: string
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          award_date?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          issuer?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_awards_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_awards_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_documents: {
        Row: {
          athlete_id: string
          created_at: string
          description: string | null
          document_type: string
          document_url: string
          file_size_bytes: number | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          description?: string | null
          document_type: string
          document_url: string
          file_size_bytes?: number | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          document_url?: string
          file_size_bytes?: number | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_documents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_documents_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_profiles: {
        Row: {
          affiliation: string | null
          availability: string | null
          background_image_url: string | null
          bio: string | null
          career_interests: string[] | null
          created_at: string
          email: string | null
          gallery_images: string[] | null
          geographic_preferences: string[] | null
          hero_image_url: string | null
          home_mountain: string | null
          id: string
          instagram_url: string | null
          is_public: boolean | null
          phone: string | null
          photo_url: string | null
          professional_highlights: string | null
          profile_completeness: number | null
          profile_views: number | null
          skills: string[] | null
          sponsors: string[] | null
          sport_discipline: string[] | null
          updated_at: string
          user_id: string
          years_of_membership: number | null
        }
        Insert: {
          affiliation?: string | null
          availability?: string | null
          background_image_url?: string | null
          bio?: string | null
          career_interests?: string[] | null
          created_at?: string
          email?: string | null
          gallery_images?: string[] | null
          geographic_preferences?: string[] | null
          hero_image_url?: string | null
          home_mountain?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          phone?: string | null
          photo_url?: string | null
          professional_highlights?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          skills?: string[] | null
          sponsors?: string[] | null
          sport_discipline?: string[] | null
          updated_at?: string
          user_id: string
          years_of_membership?: number | null
        }
        Update: {
          affiliation?: string | null
          availability?: string | null
          background_image_url?: string | null
          bio?: string | null
          career_interests?: string[] | null
          created_at?: string
          email?: string | null
          gallery_images?: string[] | null
          geographic_preferences?: string[] | null
          hero_image_url?: string | null
          home_mountain?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean | null
          phone?: string | null
          photo_url?: string | null
          professional_highlights?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          skills?: string[] | null
          sponsors?: string[] | null
          sport_discipline?: string[] | null
          updated_at?: string
          user_id?: string
          years_of_membership?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profiles_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_videos: {
        Row: {
          athlete_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type: string
          video_url: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_videos_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_videos_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
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
          {
            foreignKeyName: "certifications_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
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
          initiated_by_user_id: string | null
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
          initiated_by_user_id?: string | null
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
          initiated_by_user_id?: string | null
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
            foreignKeyName: "connection_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "top_employer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          id: string
          role: string
          text_overrides: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          role: string
          text_overrides?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          role?: string
          text_overrides?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "education_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          about: string | null
          background_image_url: string | null
          company_name: string
          company_size: string | null
          connection_to_ussa: string | null
          contact_email: string | null
          contact_person: string | null
          contact_title: string | null
          created_at: string
          hq_location: string | null
          id: string
          individual_roles: Json | null
          industry: string | null
          job_board_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          opportunities_offered: string | null
          phone: string | null
          profile_completeness: number | null
          profile_views: number | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          about?: string | null
          background_image_url?: string | null
          company_name: string
          company_size?: string | null
          connection_to_ussa?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          created_at?: string
          hq_location?: string | null
          id?: string
          individual_roles?: Json | null
          industry?: string | null
          job_board_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          opportunities_offered?: string | null
          phone?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          about?: string | null
          background_image_url?: string | null
          company_name?: string
          company_size?: string | null
          connection_to_ussa?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_title?: string | null
          created_at?: string
          hq_location?: string | null
          id?: string
          individual_roles?: Json | null
          industry?: string | null
          job_board_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          opportunities_offered?: string | null
          phone?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_profiles_profile_fkey"
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
          {
            foreignKeyName: "experience_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_connection_requests: {
        Row: {
          athlete_id: string
          created_at: string
          expert_id: string
          id: string
          initiated_by_user_id: string | null
          message: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          expert_id: string
          id?: string
          initiated_by_user_id?: string | null
          message?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          expert_id?: string
          id?: string
          initiated_by_user_id?: string | null
          message?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_connection_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_connection_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "top_athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_connection_requests_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "expert_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_profiles: {
        Row: {
          area_of_expertise: string | null
          background_image_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          headshot: string | null
          id: string
          industry: string | null
          is_alum: boolean | null
          is_public: boolean | null
          job_title: string | null
          linkedin_url: string | null
          photo_url: string | null
          profile_completeness: number | null
          profile_views: number | null
          ussa_affiliate: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_of_expertise?: string | null
          background_image_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          headshot?: string | null
          id?: string
          industry?: string | null
          is_alum?: boolean | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          photo_url?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          ussa_affiliate?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_of_expertise?: string | null
          background_image_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          headshot?: string | null
          id?: string
          industry?: string | null
          is_alum?: boolean | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          photo_url?: string | null
          profile_completeness?: number | null
          profile_views?: number | null
          ussa_affiliate?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          created_at: string
          date: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          source_order: number | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          source_order?: number | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          date?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          source_order?: number | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string
          email_accepted_connections: boolean
          email_connections_declined: boolean
          email_new_accounts: boolean
          email_new_requests: boolean
          email_profile_views: boolean
          id: string
          sms_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string
          email_accepted_connections?: boolean
          email_connections_declined?: boolean
          email_new_accounts?: boolean
          email_new_requests?: boolean
          email_profile_views?: boolean
          id?: string
          sms_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string
          email_accepted_connections?: boolean
          email_connections_declined?: boolean
          email_new_accounts?: boolean
          email_new_requests?: boolean
          email_profile_views?: boolean
          id?: string
          sms_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_articles: {
        Row: {
          author_image_url: string | null
          author_name: string | null
          body: string
          category: string | null
          created_at: string
          created_by: string
          font_family: string | null
          font_size: string | null
          hero_image_url: string | null
          id: string
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_image_url?: string | null
          author_name?: string | null
          body: string
          category?: string | null
          created_at?: string
          created_by: string
          font_family?: string | null
          font_size?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_image_url?: string | null
          author_name?: string | null
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string
          font_family?: string | null
          font_size?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
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
        Relationships: []
      }
      waitlist_applicants: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          profile_data: Json
          status: string
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          profile_data?: Json
          status?: string
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          profile_data?: Json
          status?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_analytics_summary: {
        Row: {
          accepted_connections: number | null
          avg_athlete_completeness: number | null
          avg_employer_completeness: number | null
          pending_requests: number | null
          rejected_requests: number | null
          total_athletes: number | null
          total_employers: number | null
          total_requests: number | null
          total_users: number | null
        }
        Relationships: []
      }
      athletes_by_sport: {
        Row: {
          count: number | null
          sport_discipline: string | null
        }
        Relationships: []
      }
      connections_by_day: {
        Row: {
          accepted: number | null
          pending: number | null
          rejected: number | null
          request_date: string | null
          total_requests: number | null
        }
        Relationships: []
      }
      employers_by_industry: {
        Row: {
          count: number | null
          industry: string | null
        }
        Relationships: []
      }
      top_athlete_profiles: {
        Row: {
          full_name: string | null
          id: string | null
          profile_completeness: number | null
          profile_views: number | null
          sport_discipline: string[] | null
        }
        Relationships: []
      }
      top_employer_profiles: {
        Row: {
          company_name: string | null
          id: string | null
          industry: string | null
          profile_completeness: number | null
          profile_views: number | null
        }
        Relationships: []
      }
      user_signups_by_day: {
        Row: {
          athlete_signups: number | null
          employer_signups: number | null
          signup_date: string | null
          signups: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      block_oauth_signup_hook: { Args: { event: Json }; Returns: Json }
      clear_connection_requests: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_employer_profile_views: {
        Args: { employer_profile_id: string }
        Returns: undefined
      }
      setup_admin_user: {
        Args: { user_email: string; user_password: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "athlete" | "employer" | "admin" | "expert"
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
      app_role: ["athlete", "employer", "admin", "expert"],
    },
  },
} as const
