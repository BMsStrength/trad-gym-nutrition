import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthPage from '../components/AuthPage'
import OnboardingPage from '../components/OnboardingPage'
import MainApp from '../components/MainApp'
import AdminPage from '../components/AdminPage'
import PendingPage from '../components/PendingPage'
import SuspendedPage from '../components/SuspendedPage'

export default function Home() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) init(session.user.id)
        else setLoading(false)
      })
      .catch(err => {
        // Supabaseに到達できない等で getSession が失敗しても、
        // 読み込み画面で固まらずログイン画面を出す
        console.error('[getSession失敗]', err)
        setSession(null)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) init(session.user.id)
      else { setProfile(null); setIsAdmin(false); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function init(userId) {
    setLoading(true)
    try {
      // 管理者チェック
      const { data: adminData } = await supabase.from('admins').select('id').eq('id', userId).single()
      if (adminData) { setIsAdmin(true); return }

      // 会員プロフィール取得（PGRST116 = 該当行なし は正常＝未オンボーディング）
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error && error.code !== 'PGRST116') {
        console.error('[プロフィール取得エラー]', error)
      }
      setProfile(data)
    } catch (err) {
      // 例外が出ても loading を必ず解除して画面が固まらないようにする
      console.error('[init失敗]', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:'#888', fontSize:14 }}>読み込み中...</p>
    </div>
  )

  if (!session) return <AuthPage />
  if (isAdmin) return <AdminPage session={session} />
  if (!profile) return <OnboardingPage userId={session.user.id} onComplete={p => setProfile(p)} />
  if (profile.status === 'pending') return <PendingPage profile={profile} />
  if (profile.status === 'suspended') return <SuspendedPage profile={profile} />
  return <MainApp session={session} profile={profile} onProfileUpdate={setProfile} />
}
