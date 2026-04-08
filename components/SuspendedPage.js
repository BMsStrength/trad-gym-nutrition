import { supabase } from '../lib/supabase'

export default function SuspendedPage({ profile }) {
  const s = {
    wrap: { minHeight:'100vh', background:'#f5f5f0', display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    box: { background:'#fff', borderRadius:20, padding:'2rem 1.5rem', width:'100%', maxWidth:400, textAlign:'center', boxShadow:'0 2px 20px rgba(0,0,0,0.08)' },
    badge: { display:'inline-block', background:'#1a1a2e', color:'#e8c97e', fontSize:18, fontWeight:700, padding:'8px 20px', borderRadius:10, letterSpacing:2 },
    icon: { fontSize:48, margin:'1.5rem 0 1rem' },
    title: { fontSize:20, fontWeight:700, marginBottom:8 },
    desc: { fontSize:14, color:'#666', lineHeight:1.7, marginBottom:'1.5rem' },
    info: { background:'#fff0f0', border:'1px solid #fcc', borderRadius:12, padding:'1rem', fontSize:13, color:'#c00', lineHeight:1.8, textAlign:'left', marginBottom:'1.5rem' },
    logout: { background:'none', border:'1px solid #ddd', borderRadius:10, padding:'10px 20px', fontSize:13, color:'#888', cursor:'pointer' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.badge}>TRAD GYM</div>
        <div style={s.icon}>🔒</div>
        <div style={s.title}>利用が停止されています</div>
        <div style={s.desc}>
          {profile.nickname} さんのアカウントは現在停止中です。
        </div>
        <div style={s.info}>
          ご不明な点はジムスタッフまでお問い合わせください。<br />
          月額プランを再開することでご利用いただけます。
        </div>
        <button style={s.logout} onClick={() => supabase.auth.signOut()}>ログアウト</button>
      </div>
    </div>
  )
}
