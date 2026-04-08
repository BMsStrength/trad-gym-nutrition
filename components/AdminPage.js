import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const GOAL_LABELS = { diet:'ダイエット', muscle:'筋肉増量', maintain:'体型維持', performance:'競技パフォーマンス', health:'健康改善', energy:'疲労・エネルギー改善' }
const STATUS_LABEL = { pending:'承認待ち', active:'利用中', suspended:'停止中' }
const STATUS_COLOR = { pending:'#854F0B', active:'#3B6D11', suspended:'#A32D2D' }
const STATUS_BG    = { pending:'#FAEEDA', active:'#EAF3DE', suspended:'#FCEBEB' }

export default function AdminPage({ session }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setSaving(true)
    const now = new Date().toISOString()
    const update = {
      status,
      updated_at: now,
      ...(status === 'active' ? { approved_at: now } : {}),
      ...(status === 'suspended' ? { suspended_at: now } : {}),
    }
    await supabase.from('profiles').update(update).eq('id', id)
    await fetchMembers()
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...update }))
    setSaving(false)
  }

  async function saveMemo(id) {
    setSaving(true)
    await supabase.from('profiles').update({ memo, updated_at: new Date().toISOString() }).eq('id', id)
    await fetchMembers()
    setSaving(false)
  }

  const filtered = members.filter(m => {
    const matchFilter = filter === 'all' || m.status === filter
    const matchSearch = !search || m.nickname?.includes(search) || m.memo?.includes(search)
    return matchFilter && matchSearch
  })

  const counts = {
    all: members.length,
    pending: members.filter(m => m.status === 'pending').length,
    active: members.filter(m => m.status === 'active').length,
    suspended: members.filter(m => m.status === 'suspended').length,
  }

  const s = {
    wrap: { minHeight:'100vh', background:'#f5f5f0', maxWidth:480, margin:'0 auto' },
    header: { background:'#1a1a2e', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10 },
    badge: { color:'#e8c97e', fontSize:15, fontWeight:700, letterSpacing:2 },
    adminBadge: { background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11, padding:'3px 8px', borderRadius:6 },
    content: { padding:16 },
    tabs: { display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:2 },
    tab: (active) => ({ flexShrink:0, padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background: active ? '#1a1a2e' : '#fff', color: active ? '#e8c97e' : '#666', border: active ? 'none' : '1px solid #ddd' }),
    card: { background:'#fff', borderRadius:16, padding:'1rem', marginBottom:10, cursor:'pointer', border:'1px solid transparent', transition:'border 0.15s' },
    cardSelected: { border:'1px solid #1a1a2e' },
    memberRow: { display:'flex', alignItems:'center', gap:10 },
    avatar: { width:40, height:40, borderRadius:'50%', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 },
    name: { fontSize:14, fontWeight:700 },
    meta: { fontSize:12, color:'#888', marginTop:2 },
    statusBadge: (st) => ({ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600, background: STATUS_BG[st], color: STATUS_COLOR[st] }),
    actionRow: { display:'flex', gap:6, marginTop:10 },
    actionBtn: (color, bg) => ({ flex:1, background:bg, color, border:'none', borderRadius:8, padding:'8px 4px', fontSize:12, fontWeight:600, cursor:'pointer' }),
    detailBox: { background:'#f8f8f8', borderRadius:10, padding:'10px 12px', marginTop:10, fontSize:12, lineHeight:1.8 },
    memoArea: { marginTop:10 },
    memoInput: { width:'100%', height:60, borderRadius:8, border:'1px solid #ddd', padding:'8px', fontSize:13, resize:'none', fontFamily:'inherit' },
    saveBtn: { marginTop:6, background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' },
    logout: { background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer' },
    empty: { textAlign:'center', padding:'2rem', color:'#aaa', fontSize:14 },
    searchWrap: { marginBottom:10 },
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.badge}>TRAD GYM</div>
          <div style={s.adminBadge}>管理者</div>
        </div>
        <button style={s.logout} onClick={() => supabase.auth.signOut()}>ログアウト</button>
      </div>

      <div style={s.content}>
        <div style={s.searchWrap}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="会員名・メモで検索..." style={{background:'#fff'}} />
        </div>

        <div style={s.tabs}>
          {[['all','全員'],['pending','承認待ち'],['active','利用中'],['suspended','停止中']].map(([val, label]) => (
            <button key={val} style={s.tab(filter === val)} onClick={() => setFilter(val)}>
              {label} {counts[val] > 0 && `(${counts[val]})`}
            </button>
          ))}
        </div>

        {loading
          ? <div style={s.empty}>読み込み中...</div>
          : filtered.length === 0
            ? <div style={s.empty}>該当する会員がいません</div>
            : filtered.map(m => (
                <div key={m.id}
                  style={{...s.card, ...(selected?.id === m.id ? s.cardSelected : {})}}
                  onClick={() => { setSelected(selected?.id === m.id ? null : m); setMemo(m.memo || '') }}
                >
                  <div style={s.memberRow}>
                    <div style={s.avatar}>👤</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:6}}>
                        <span style={s.name}>{m.nickname}</span>
                        <span style={s.statusBadge(m.status)}>{STATUS_LABEL[m.status]}</span>
                      </div>
                      <div style={s.meta}>
                        {m.gender === 'male' ? '男性' : '女性'} / {m.age}歳 / {m.height}cm {m.weight}kg
                        {m.goal && ` / ${GOAL_LABELS[m.goal]}`}
                      </div>
                      {m.memo && <div style={{fontSize:11, color:'#e08000', marginTop:2}}>📝 {m.memo}</div>}
                    </div>
                  </div>

                  {selected?.id === m.id && (
                    <>
                      <div style={s.detailBox}>
                        <strong>目標カロリー</strong> {m.targetCal} kcal / 日（維持 {m.tdee} kcal）<br />
                        <strong>推奨PFC</strong> P{m.pfcP}g / F{m.pfcF}g / C{m.pfcC}g<br />
                        {m.approved_at && <><strong>承認日</strong> {new Date(m.approved_at).toLocaleDateString('ja-JP')}<br /></>}
                        {m.suspended_at && <><strong>停止日</strong> {new Date(m.suspended_at).toLocaleDateString('ja-JP')}<br /></>}
                      </div>

                      <div style={s.actionRow}>
                        {m.status !== 'active' && (
                          <button style={s.actionBtn('#3B6D11','#EAF3DE')} onClick={e => { e.stopPropagation(); updateStatus(m.id,'active') }} disabled={saving}>
                            ✅ 承認する
                          </button>
                        )}
                        {m.status !== 'pending' && (
                          <button style={s.actionBtn('#854F0B','#FAEEDA')} onClick={e => { e.stopPropagation(); updateStatus(m.id,'pending') }} disabled={saving}>
                            ⏳ 承認待ちに戻す
                          </button>
                        )}
                        {m.status !== 'suspended' && (
                          <button style={s.actionBtn('#A32D2D','#FCEBEB')} onClick={e => { e.stopPropagation(); updateStatus(m.id,'suspended') }} disabled={saving}>
                            🔒 停止する
                          </button>
                        )}
                      </div>

                      <div style={s.memoArea} onClick={e => e.stopPropagation()}>
                        <div style={{fontSize:12, color:'#888', marginBottom:4}}>メモ（未払い理由など）</div>
                        <textarea
                          style={s.memoInput}
                          value={memo}
                          onChange={e => setMemo(e.target.value)}
                          placeholder="例: 2024年4月分未払い、連絡済み"
                        />
                        <button style={s.saveBtn} onClick={() => saveMemo(m.id)} disabled={saving}>
                          {saving ? '保存中...' : 'メモを保存'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
        }
      </div>
    </div>
  )
}
