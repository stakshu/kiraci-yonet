/* ── KiraciYonet — Supabase Client ── */
import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://ulbhgfcmvmygdtqrwxad.supabase.co'
export const supabaseAnonKey = 'sb_publishable_UaED7l8Echf4kqfQASSOEg_cfrnFGl6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
