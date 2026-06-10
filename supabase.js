import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ⚠️ NEXT_PUBLIC_* の環境変数は「ビルド時」に埋め込まれます。
// Vercelで値を変更しても、再デプロイ（Redeploy）しないと反映されません。
// 値が空のままビルドされると、全員がログインできなくなります。
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'アプリの接続設定が読み込めていません（環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定）。管理者にご連絡ください。'
    : ''

if (supabaseConfigError && typeof window !== 'undefined') {
  // ブラウザのコンソール（F12）にハッキリ出して原因をすぐ分かるようにする
  console.error('[Supabase設定エラー] 環境変数が読み込まれていません。Vercelの環境変数を確認し、必ず再デプロイしてください。')
}

// 環境変数が無い場合でも createClient で即クラッシュ（画面真っ白）しないよう、
// ダミー値でフォールバックする。実際のエラーは AuthPage 側で案内する。
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,        // セッションをlocalStorageに保存（デフォルトtrue）
      autoRefreshToken: true,      // トークンを自動更新（期限切れでもログアウトしない）
      detectSessionInUrl: true,    // メール認証リンクからの自動ログインに対応
    },
  }
)
