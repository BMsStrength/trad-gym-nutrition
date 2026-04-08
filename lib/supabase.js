import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // セッションをlocalStorageに保存（デフォルトtrue）
    autoRefreshToken: true,      // トークンを自動更新（期限切れでもログアウトしない）
    detectSessionInUrl: true,    // メール認証リンクからの自動ログインに対応
  }
})
