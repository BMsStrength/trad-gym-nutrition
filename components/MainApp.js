import { useState } from 'react'
import { supabase } from '../lib/supabase'
import PhotoTab from './tabs/PhotoTab'
import HistoryTab from './tabs/HistoryTab'
import AdviceTab from './tabs/AdviceTab'
import ProfileTab from './tabs/ProfileTab'

const TABS = [
  { id:'photo',   icon:'📷', label:'食事記録' },
  { id:'history', icon:'📋', label:'履歴' },
  { id:'advice',  icon:'💬', label:'相談' },
  { id:'profile', icon:'👤', label:'プロフィール' },
]

// 1日のビタミン・ミネラル目標量（成人平均）
const DAILY_TARGETS = {
  vitamins: {
    'A':   { target: 800,  unit: 'μgRE' },
    'B1':  { target: 1.2,  unit: 'mg' },
    'B2':  { target: 1.4,  unit: 'mg' },
    'B6':  { target: 1.3,  unit: 'mg' },
    'B12': { target: 2.4,  unit: 'μg' },
    'C':   { target: 100,  unit: 'mg' },
    'D':   { target: 10,   unit: 'μg' },
    'E':   { target: 12,   unit: 'mg' },
    'K':   { target: 100,  unit: 'μg' },
    '葉酸': { target: 240, unit: 'μg' },
  },
  minerals: {
    'カルシウム':   { target: 800,  unit: 'mg' },
    '鉄':          { target: 10,   unit: 'mg' },
    'マグネシウム': { target: 340,  unit: 'mg' },
    '亜鉛':        { target: 10,   unit: 'mg' },
    'カリウム':    { target: 2500, unit: 'mg' },
    'ナトリウム':  { target: 2000, unit: 'mg' },
    'リン':        { target: 700,  unit: 'mg' },
    '銅':          { target: 0.9,  unit: 'mg' },
  }
}

function sumNutrients(dailyIntake) {
  const vitamins = {}
  const minerals = {}
  Object.keys(DAILY_TARGETS.vitamins).forEach(k => { vitamins[k] = 0 })
  Object.keys(DAILY_TARGETS.minerals).forEach(k => { minerals[k] = 0 })
  dailyIntake.forEach(item => {
    if (item.vitamins) Object.entries(item.vitamins).forEach(([k, v]) => { if (vitamins[k] !== undefined) vitamins[k] += v.amount || 0 })
    if (item.minerals) Object.entries(item.minerals).forEach(([k, v]) => { if (minerals[k] !== undefined) minerals[k] += v.amount || 0 })
  })
  return { vitamins, minerals }
}

function NutrientBar({ label, consumed, target, unit, color }) {
  const pct = Math.min(100, Math.round(consumed / target * 100))
  const barColor = pct >= 80 ? '#3B6D11' : pct >= 50 ? '#378ADD' : '#BA7517'
  const display = consumed < 10 ? consumed.toFixed(1) : Math.round(consumed)
  const targetDisplay = target < 10 ? target.toFixed(1) : Math.round(target)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
        <span style={{ color:'#555' }}>{label}</span>
        <span style={{ fontWeight:600, color: pct >= 80 ? '#3B6D11' : pct >= 50 ? '#378ADD' : '#BA7517' }}>
          {display}{unit} / {targetDisplay}{unit}
        </span>
      </div>
      <div style={{ height:6, background:'#eee', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width: pct+'%', background: barColor, borderRadius:3, transition:'width 0.4s' }} />
      </div>
      <div style={{ fontSize:10, color:'#aaa', marginTop:1, textAlign:'right' }}>{pct}%</div>
    </div>
  )
}

function DailySummaryCard({ profile, dailyIntake, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [section, setSection] = useState('pfc')

  const consumed = dailyIntake.reduce((s, r) => s + r.total_cal, 0)
  const consumedP = dailyIntake.reduce((s, r) => s + (r.protein || 0), 0)
  const consumedF = dailyIntake.reduce((s, r) => s + (r.fat || 0), 0)
  const consumedC = dailyIntake.reduce((s, r) => s + (r.carbs || 0), 0)
  const calPct = Math.min(100, Math.round(consumed / profile.targetCal * 100))
  const { vitamins, minerals } = sumNutrients(dailyIntake)

  const calColor = calPct > 110 ? '#E24B4A' : calPct >= 80 ? '#3B6D11' : '#BA7517'

  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, cursor:'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontSize:13, fontWeight:600 }}>今日の栄養バランス</span>
        <span style={{ fontSize:12, color:'#888' }}>{open ? '▲ 閉じる' : '▼ 詳細を見る'}</span>
      </div>

      {/* カロリーバー（常に表示） */}
      <div style={{ marginBottom: open ? 12 : 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
          <span style={{ color:'#555' }}>カロリー</span>
          <span style={{ fontWeight:700, color: calColor }}>{consumed} kcal / {profile.targetCal} kcal</span>
        </div>
        <div style={{ height:8, background:'#eee', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width: calPct+'%', background: calColor, borderRadius:4, transition:'width 0.4s' }} />
        </div>
        <div style={{ fontSize:10, color:'#aaa', marginTop:1, textAlign:'right' }}>{calPct}%</div>
      </div>

      {open && <>
        {/* セクション切替 */}
        <div style={{ display:'flex', gap:6, marginBottom:12, marginTop:4 }}>
          {[['pfc','PFC'],['vitamins','ビタミン'],['minerals','ミネラル']].map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} style={{
              flex:1, padding:'5px 0', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
              background: section===id ? '#1a1a2e' : '#f0f0f0',
              color: section===id ? '#e8c97e' : '#666',
            }}>{label}</button>
          ))}
        </div>

        {section === 'pfc' && <>
          <NutrientBar label="たんぱく質" consumed={consumedP} target={profile.pfcP} unit="g" />
          <NutrientBar label="脂質"       consumed={consumedF} target={profile.pfcF} unit="g" />
          <NutrientBar label="炭水化物"   consumed={consumedC} target={profile.pfcC} unit="g" />
        </>}

        {section === 'vitamins' && Object.entries(DAILY_TARGETS.vitamins).map(([name, t]) => (
          <NutrientBar key={name} label={'ビタミン ' + name} consumed={vitamins[name] || 0} target={t.target} unit={t.unit} />
        ))}

        {section === 'minerals' && Object.entries(DAILY_TARGETS.minerals).map(([name, t]) => (
          <NutrientBar key={name} label={name} consumed={minerals[name] || 0} target={t.target} unit={t.unit} />
        ))}
      </>}
    </div>
  )
}

export { DailySummaryCard, DAILY_TARGETS, sumNutrients }

export default function MainApp({ session, profile, onProfileUpdate }) {
  const [tab, setTab] = useState('photo')
  const [dailyIntake, setDailyIntake] = useState([])

  function addRecord(record) {
    setDailyIntake(prev => [...prev, record])
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f0', display:'flex', flexDirection:'column', maxWidth:480, margin:'0 auto' }}>
      {/* ヘッダー */}
      <div style={{ background:'#1a1a2e', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ color:'#e8c97e', fontSize:16, fontWeight:700, letterSpacing:2 }}>TRAD GYM</div>
        <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13 }}>{profile.nickname} さん</div>
      </div>

      {/* コンテンツ */}
      <div style={{ flex:1, padding:16, paddingBottom:80 }}>
        {/* 今日の栄養サマリー（ホーム画面上部に常時表示） */}
        {tab === 'photo' && (
          <DailySummaryCard profile={profile} dailyIntake={dailyIntake} defaultOpen={false} />
        )}

        {tab === 'photo'   && <PhotoTab profile={profile} onRecord={addRecord} />}
        {tab === 'history' && <HistoryTab profile={profile} dailyIntake={dailyIntake} />}
        {tab === 'advice'  && <AdviceTab profile={profile} dailyIntake={dailyIntake} />}
        {tab === 'profile' && <ProfileTab session={session} profile={profile} onProfileUpdate={onProfileUpdate} />}
      </div>

      {/* ナビゲーションバー */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'1px solid #eee', display:'flex', zIndex:10 }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', cursor:'pointer', borderTop: tab===t.id ? '2px solid #1a1a2e' : '2px solid transparent' }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:10, color: tab===t.id ? '#1a1a2e' : '#999', marginTop:2, fontWeight: tab===t.id ? 600 : 400 }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
