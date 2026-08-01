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
      profiles: {
        Row: {
          accepted_terms_at: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          role: string
        }
        Insert: {
          accepted_terms_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_complete?: boolean
          role?: string
        }
        Update: {
          accepted_terms_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          role?: string
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
