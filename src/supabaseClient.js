import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://juhrvqbeutqzwpveskas.supabase.co'
const supabaseKey = 'sb_publishable_OoKz7VANEc4B-GuvmCr1eA_jKjkD7fL'
export const supabase = createClient(supabaseUrl, supabaseKey)
