import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DailySummaryCard } from '../MainApp'

const MEAL_ICONS = { breakfast:'🌅', lunch:'☀️', dinner:'🌙' }
const MEAL_LABELS = { breakfast:'朝食', lunch:'昼食', dinner:'夕食' }

export default function HistoryTab({ profile, dailyIntake = [], onDelete }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)

  useEffect(() => { fetchRecords() }, [selectedDate])

  // 食事が追加・削除されたとき今日の表示を自動更新
  useEffect(() => {
    if (isToday) fetchRecords()
  }, [dailyIntake.length])

  async function fetchRecords() {
    setLoading(true)
    const from = selectedDate + 'T00:00:00.000Z'
    const to   = selectedDate + 'T23:59:59.999Z'
    const { data } = await supabase
      .from('meal_records')
      .select('*')
      .eq('user_id', profile.id)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function deleteRecord(id) {
    setDeletingId(id)
    await supabase.from('meal_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
    setConfirmId(null)
    setDeletingId(null)
    // 今日の記録ならdailyIntakeからも除去
    if (onDelete) onDelete(id)
  }

  const displayRecords = records
  const intakeForSummary = displayRecords.map(r => ({
    total_cal: r.total_cal, protein: r.protein, fat: r.fat,
    carbs: r.carbs, vitamins: r.vitamins, minerals: r.minerals,
  }))

  return (
    <>
      {/* 日付選択 */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width:'100%' }} />
      </div>

      {/* 栄養バランスサマリー */}
      <DailySummaryCard profile={profile} dailyIntake={intakeForSummary} defaultOpen={true} />

      {/* 食事リスト */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>食事記録</div>
        {loading
          ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>読み込み中...</p>
          : displayRecords.length === 0
            ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>この日の記録はありません</p>
            : displayRecords.map((r, i) => (
                <div key={r.id || i}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: confirmId === r.id ? 'none' : '1px solid #f5f5f5' }}>
                    {/* 食事アイコン */}
                    <div style={{ fontSize:24, flexShrink:0 }}>
                      {MEAL_ICONS[r.meal_type] || '🍽️'}
                    </div>

                    {/* 食事情報 */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:14, fontWeight:600 }}>{r.meal_name}</span>
                        {r.meal_type && (
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'#f0f0f0', color:'#666' }}>
                            {MEAL_LABELS[r.meal_type] || r.meal_type}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                        {r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' }) : ''}
                        &ensp;P {Math.round(r.protein || 0)}g · F {Math.round(r.fat || 0)}g · C {Math.round(r.carbs || 0)}g
                      </div>
                      {r.symptoms && (
                        <div style={{ fontSize:11, color:'#BA7517', marginTop:2 }}>📋 {r.symptoms}</div>
                      )}
                    </div>

                    {/* カロリー＋削除ボタン */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:18, fontWeight:700 }}>{r.total_cal}</div>
                        <div style={{ fontSize:11, color:'#888' }}>kcal</div>
                      </div>
                      {r.id && (
                        <button
                          onClick={() => setConfirmId(confirmId === r.id ? null : r.id)}
                          style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'4px 8px', fontSize:16, cursor:'pointer', color:'#aaa' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 削除確認 */}
                  {confirmId === r.id && (
                    <div style={{ background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'#A32D2D' }}>この記録を削除しますか？</span>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{ background:'#fff', border:'1px solid #ddd', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer' }}
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => deleteRecord(r.id)}
                          disabled={deletingId === r.id}
                          style={{ background:'#A32D2D', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: deletingId === r.id ? 0.6 : 1 }}
                        >
                          {deletingId === r.id ? '削除中...' : '削除する'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
        }
      </div>
    </>
  )
}
