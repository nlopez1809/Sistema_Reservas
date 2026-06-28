import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_KEY!

if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env')

// Admin client — bypasses RLS (only used in backend, never exposed to frontend)
export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Create a client scoped to a specific user JWT (respects RLS)
export const supabaseForUser = (jwt: string) =>
  createClient(url, process.env.SUPABASE_ANON_KEY || key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  })
