/* ── KiraciYonet — Supabase Client ── */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ulbhgfcmvmygdtqrwxad.supabase.co'
const supabaseAnonKey = 'sb_publishable_UaED7l8Echf4kqfQASSOEg_cfrnFGl6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
