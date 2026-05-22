import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@alpha-kelassi/types'

export type AppVariables = {
  userId: string
  supabase: SupabaseClient<Database>
}
