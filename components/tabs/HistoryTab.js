import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DailySummaryCard } from '../MainApp'

export default function HistoryTab({ profile, dailyIntake = [] }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const isToday = selectedDate === new Date().toISOString().slice(0, 10)

  useEffect(() => { fetchRecords() }, [selectedDate])

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

  // 今日ならリアルタイムのdailyIntake、過去日はDBのrecordsを使う
  const displayRecords = isToday && dailyIntake.length > 0 ? dailyIntake : records
  const intakeForSummary = displayRecords.map(r => ({
    total_cal: r.total_cal,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
    vitamins: r.vitamins,
    minerals: r.minerals,
  }))

  return (
    <>
      {/* 日付選択 */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ width:'100%' }}
        />
      </div>

      {/* 栄養バランスサマリー */}
      <DailySummaryCard
        profile={profile}
        dailyIntake={intakeForSummary}
        defaultOpen={true}
      />

      {/* 食事リスト */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>食事記録</div>
        {loading
          ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>読み込み中...</p>
          : displayRecords.length === 0
            ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>この日の記録はありません</p>
            : displayRecords.map((r, i) => (
                <div key={r.id || i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <div style={{ fontSize:28, flexShrink:0 }}>🍽️</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{r.meal_name}</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                      {r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' }) : ''}
                      &ensp;P {Math.round(r.protein || 0)}g · F {Math.round(r.fat || 0)}g · C {Math.round(r.carbs || 0)}g
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:18, fontWeight:700 }}>{r.total_cal}</div>
                    <div style={{ fontSize:11, color:'#888' }}>kcal</div>
                  </div>
                </div>
              ))
        }
      </div>
    </>
  )
}
