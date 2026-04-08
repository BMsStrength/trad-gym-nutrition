import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
  err: { background:'#fff0f0', border:'1px solid #fcc', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#c00', marginBottom:12 },
  ok: { background:'#f0fff4', border:'1px solid #9f9', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#060', marginBottom:12 },
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
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); setLoading(false); return }
    if (password.length < 6) { setError('パスワードは6文字以上で設定してください'); setLoading(false); return }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message === 'User already registered' ? 'このメールアドレスはすでに登録されています' : error.message)
      else setSuccess('確認メールを送信しました。メールのリンクをクリックして登録を完了してください。')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('メールアドレスまたはパスワードが正しくありません')
    }
    setLoading(false)
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
