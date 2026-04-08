import { supabase } from '../../lib/supabase'

const GOAL_LABELS = { diet:'ダイエット', muscle:'筋肉増量', maintain:'体型維持', performance:'競技パフォーマンス', health:'健康改善', energy:'疲労・エネルギー改善' }
const GOAL_ICONS  = { diet:'🔥', muscle:'💪', maintain:'⚖️', performance:'🏃', health:'💚', energy:'⚡' }

export default function ProfileTab({ session, profile, onProfileUpdate }) {
  const bmi = Math.round(profile.weight / ((profile.height / 100) ** 2) * 10) / 10

  const s = {
    card: { background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 },
    row: { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5', fontSize:13 },
    key: { color:'#888' },
    val: { fontWeight:600 },
    calBox: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:12, padding:'1rem', margin:'10px 0' },
    pfcGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 },
    pfcCard: { background:'#fff', borderRadius:8, padding:'8px', textAlign:'center', border:'1px solid #eee' },
    logoutBtn: { width:'100%', background:'none', border:'1px solid #ddd', borderRadius:12, padding:12, fontSize:14, color:'#888', cursor:'pointer', marginTop:4 },
  }

  const rows = [
    ['ニックネーム', profile.nickname],
    ['性別', profile.gender === 'male' ? '男性' : '女性'],
    ['年齢', profile.age + ' 歳'],
    ['身長', profile.height + ' cm'],
    ['体重', profile.weight + ' kg'],
    ['BMI', bmi],
    ['体脂肪率', profile.bodyfat ? profile.bodyfat + ' %' : '未入力'],
    ['目標', GOAL_ICONS[profile.goal] + ' ' + GOAL_LABELS[profile.goal]],
  ]

  return (
    <>
      <div style={s.card}>
        <div style={{fontSize:14, fontWeight:600, marginBottom:10}}>プロフィール</div>
        {rows.map(([k, v]) => <div key={k} style={s.row}><span style={s.key}>{k}</span><span style={s.val}>{v}</span></div>)}
      </div>

      <div style={s.card}>
        <div style={{fontSize:14, fontWeight:600, marginBottom:4}}>目標カロリー・PFC</div>
        <div style={s.calBox}>
          <div style={{fontSize:12, color:'#639922'}}>1日の目標カロリー</div>
          <div style={{fontSize:36, fontWeight:700, color:'#3B6D11'}}>{profile.targetCal} <span style={{fontSize:16}}>kcal</span></div>
          <div style={{fontSize:12, color:'#3B6D11', marginTop:4}}>維持カロリー {profile.tdee} kcal</div>
        </div>
        <div style={s.pfcGrid}>
          <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#185FA5'}}>{profile.pfcP}</div><div style={{fontSize:11, color:'#888'}}>たんぱく質 g</div></div>
          <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#BA7517'}}>{profile.pfcF}</div><div style={{fontSize:11, color:'#888'}}>脂質 g</div></div>
          <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#3B6D11'}}>{profile.pfcC}</div><div style={{fontSize:11, color:'#888'}}>炭水化物 g</div></div>
        </div>
      </div>

      <div style={s.card}>
        <div style={{fontSize:13, color:'#888', marginBottom:6}}>ログイン中: {session.user.email}</div>
        <button style={s.logoutBtn} onClick={() => supabase.auth.signOut()}>ログアウト</button>
      </div>
    </>
  )
}
