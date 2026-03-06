import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log("SUPABASE URL:", supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
