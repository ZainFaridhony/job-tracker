// Generated from the Supabase project rruexatjgmmazyldqirp.
// Regenerate after any migration:
//   pnpm exec supabase gen types typescript --project-id rruexatjgmmazyldqirp
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      cvs: {
        Row: {
          char_count: number | null
          created_at: string
          extracted_text: string | null
          file_name: string
          id: string
          is_primary: boolean
          storage_path: string
          user_id: string
        }
        Insert: {
          char_count?: number | null
          created_at?: string
          extracted_text?: string | null
          file_name: string
          id?: string
          is_primary?: boolean
          storage_path: string
          user_id: string
        }
        Update: {
          char_count?: number | null
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          id?: string
          is_primary?: boolean
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          career_goal: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          onboarding_step: number
          role: string
          salary_currency: string | null
          salary_period: string | null
          salary_target: string | null
          skills: string[]
          target_roles: string[]
          work_location: string | null
          years_experience: number | null
        }
        Insert: {
          accepted_terms_at?: string | null
          career_goal?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_complete?: boolean
          onboarding_step?: number
          role?: string
          salary_currency?: string | null
          salary_period?: string | null
          salary_target?: string | null
          skills?: string[]
          target_roles?: string[]
          work_location?: string | null
          years_experience?: number | null
        }
        Update: {
          accepted_terms_at?: string | null
          career_goal?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          onboarding_step?: number
          role?: string
          salary_currency?: string | null
          salary_period?: string | null
          salary_target?: string | null
          skills?: string[]
          target_roles?: string[]
          work_location?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update']
