import { createClient } from "@supabase/supabase-js"

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://iqjcmqkgrfmopznrfikx.supabase.co"
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxamNtcWtncmZtb3B6bnJmaWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODA0NzcsImV4cCI6MjEwMjg1NjQ3N30.ujfATs0huUkR9tCNB0Rs8JlqJG3dkz13EKtkr-eFiDg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
