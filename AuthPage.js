import { useState } from 'react'
import { supabase, supabaseConfigError } from '../lib/supabase'

const s = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'#f5f5f0' },
  box: { background:'#fff', borderRadius:20, padding:'2rem 1.5rem', width:'100%', maxWidth:400, boxShadow:'0 2px 20px rgba(0,0,0,0.08)' },
  logo: { textAlign:'center', marginBottom:'1.5rem' },
  badge: { display:'inline-block', background:'#1a1a2e', color:'#e8c97e', fontSize:22, fontWeight:600, padding:'10px 24px', borderRadius:12, letterSpacing:2 },
  sub: { fontSize:12, color:'#888', marginTop:6 },
  title: { fontSize:20, fontWeight:600, marginBottom:4 },
  desc: { fontSize:13, color:'#666', marginBottom:'1.25rem' },
  field: { marginBottom:14 },
  label: { display:'block', fontSize:13, color:'#666', marginBottom:5 },
  btn: { width:'100%', background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:12, padding:14, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:8 },
  link: { textAlign:'center', fontSize:13, color:'#666', marginTop:16 },
  linkBtn: { color:'#1a1a2e', fontWeight:600, cursor:'pointer', background:'none', border:'none', fontSize:13 },
  err: { background:'#fff0f0', border:'1px solid #fcc', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#c00', marginBottom:12, whiteSpace:'pre-wrap' },
  ok: { background:'#f0fff4', border:'1px solid #9f9', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#060', marginBottom:12 },
}

// Supabaseが返す英語エラーを、利用者向けの日本語に変換する。
// 「パスワードが違います」で全部まとめず、本当の原因を切り分けて表示する。
function translateAuthError(error) {
  const msg = (error && error.message) ? error.message : ''
  const low = msg.toLowerCase()

  // 通信そのものが失敗（Supabaseプロジェクト停止・URL誤り・ネットワーク断など）
  if (low.includes('fetch') || low.includes('network') || low.includes('failed to fetch')) {
    return 'サーバーに接続できませんでした。通信環境を確認のうえ、しばらく経ってから再度お試しください。\n（繰り返す場合はトレーナーにご連絡ください）'
  }
  // メール認証が未完了
  if (low.includes('email not confirmed') || low.includes('not confirmed')) {
    return 'メール認証が完了していません。登録時に届いた確認メールのリンクをクリックしてから、再度ログインしてください。'
  }
  // 認証情報（メール/パスワード）が違う
  if (low.includes('invalid login credentials') || low.includes('invalid credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }
  // 短時間に試行しすぎ
  if (low.includes('rate limit') || low.includes('too many')) {
    return '試行回数が多すぎます。少し時間をおいてから再度お試しください。'
  }
  // それ以外は原因特定のため生メッセージも表示する
  return msg ? ('ログインに失敗しました：' + msg) : 'ログインに失敗しました。しばらくしてから再度お試しください。'
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError(''); setSuccess(''); setLoading(true)

    // 接続設定が読み込めていない場合は、認証を試みる前に明示する
    if (supabaseConfigError) { setError(supabaseConfigError); setLoading(false); return }

    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); setLoading(false); return }
    if (password.length < 6) { setError('パスワードは6文字以上で設定してください'); setLoading(false); return }

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(error.message === 'User already registered' ? 'このメールアドレスはすでに登録されています' : translateAuthError(error))
        } else {
          setSuccess('確認メールを送信しました。メールのリンクをクリックして登録を完了してください。')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(translateAuthError(error))
      }
    } catch (e) {
      // ネットワーク例外などで throw された場合もここで拾う
      console.error('[認証エラー]', e)
      setError(translateAuthError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.logo}>
          <div style={s.badge}>TRAD GYM</div>
          <div style={s.sub}>栄養指導アプリ</div>
        </div>
        <div style={s.title}>{mode === 'login' ? 'ログイン' : '新規登録'}</div>
        <div style={s.desc}>{mode === 'login' ? '登録済みのアカウントでログイン' : 'アカウントを作成して始めましょう'}</div>
        {error && <div style={s.err}>{error}</div>}
        {success && <div style={s.ok}>{success}</div>}
        <div style={s.field}>
          <label style={s.label}>メールアドレス</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div style={s.field}>
          <label style={s.label}>パスワード（6文字以上）</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <button style={{...s.btn, opacity: loading ? 0.6 : 1}} onClick={handleSubmit} disabled={loading}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </button>
        <div style={s.link}>
          {mode === 'login' ? <>まだアカウントがない方は <button style={s.linkBtn} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>新規登録</button></> : <>すでにアカウントがある方は <button style={s.linkBtn} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>ログイン</button></>}
        </div>
      </div>
    </div>
  )
}
