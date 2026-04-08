import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 運動種目と消費カロリー目安（体重60kgベース）
// ━━━━━━━━━━━━━━━━━━━━━━━━
const EXERCISE_PRESETS = [
  { name: 'ウォーキング', cal_per_min: 3.5, icon: '🚶' },
  { name: 'ジョギング', cal_per_min: 7, icon: '🏃' },
  { name: '筋トレ', cal_per_min: 5, icon: '💪' },
  { name: 'サイクリング', cal_per_min: 6, icon: '🚴' },
  { name: 'ヨガ・ストレッチ', cal_per_min: 2.5, icon: '🧘' },
  { name: '水泳', cal_per_min: 8, icon: '🏊' },
  { name: 'HIIT', cal_per_min: 10, icon: '🔥' },
  { name: 'その他', cal_per_min: 4, icon: '🏋️' },
]

const SUPP_PRESETS = [
  'プロテイン', 'BCAA', 'EAA', 'クレアチン', 'マルチビタミン',
  'ビタミンD', '鉄', 'マグネシウム', '亜鉛', 'オメガ3', 'CoQ10', 'その他'
]

const WATER_QUICK = [150, 200, 350, 500]

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 週次トレンドグラフ（SVGシンプル折れ線）
// ━━━━━━━━━━━━━━━━━━━━━━━━
function TrendChart({ data, label, color, unit, targetLine }) {
  if (!data || data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#aaa', fontSize: 12 }}>
      記録が2件以上になるとグラフが表示されます
    </div>
  )
  const W = 300, H = 80, PAD = 10
  const vals = data.map(d => d.value)
  const min = Math.min(...vals) * 0.98
  const max = Math.max(...vals) * 1.02
  const range = max - min || 1
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.value - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })
  const targetY = targetLine ? H - PAD - ((targetLine - min) / range) * (H - PAD * 2) : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
        {targetY && (
          <line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY}
            stroke="#e8c97e" strokeWidth="1" strokeDasharray="4,3" />
        )}
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = pts[i].split(',')
          return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginTop: 2 }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      {targetLine && (
        <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: '#e8c97e', marginRight: 4, verticalAlign: 'middle' }} />
          目標 {targetLine}{unit}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━
export default function TrackingTab({ profile }) {
  const [activeSection, setActiveSection] = useState('summary')
  const [today] = useState(new Date().toISOString().slice(0, 10))

  // 体重・体組成
  const [bodyWeight, setBodyWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [muscleMass, setMuscleMass] = useState('')
  const [bodyRecords, setBodyRecords] = useState([])
  const [savingBody, setSavingBody] = useState(false)

  // 水分
  const [waterRecords, setWaterRecords] = useState([])
  const [savingWater, setSavingWater] = useState(false)

  // 運動
  const [exName, setExName] = useState('')
  const [exDuration, setExDuration] = useState('')
  const [exCalories, setExCalories] = useState('')
  const [exMemo, setExMemo] = useState('')
  const [exerciseRecords, setExerciseRecords] = useState([])
  const [savingEx, setSavingEx] = useState(false)

  // サプリ
  const [suppName, setSuppName] = useState('')
  const [suppAmount, setSuppAmount] = useState('')
  const [suppTiming, setSuppTiming] = useState('朝')
  const [suppRecords, setSuppRecords] = useState([])
  const [savingSupp, setSavingSupp] = useState(false)

  // グラフ関連state
  const [graphPeriod, setGraphPeriod] = useState('week') // 'week' | 'month'
  const [mealTrends, setMealTrends] = useState([]) // 日別食事集計
  const [mealHourCounts, setMealHourCounts] = useState(Array(24).fill(0)) // 食事時刻分布

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const from30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const uid = profile.id
    const [b, w, e, s, m] = await Promise.all([
      supabase.from('body_records').select('*').eq('user_id', uid).gte('recorded_at', from30).order('recorded_at'),
      supabase.from('water_records').select('*').eq('user_id', uid).gte('recorded_at', today + 'T00:00:00Z').order('recorded_at'),
      supabase.from('exercise_records').select('*').eq('user_id', uid).gte('recorded_at', today + 'T00:00:00Z').order('recorded_at', { ascending: false }),
      supabase.from('supplement_records').select('*').eq('user_id', uid).gte('recorded_at', today + 'T00:00:00Z').order('recorded_at', { ascending: false }),
      supabase.from('meal_records').select('id,total_cal,protein,fat,carbs,recorded_at').eq('user_id', uid).gte('recorded_at', from30).order('recorded_at'),
    ])
    setBodyRecords(b.data || [])
    setWaterRecords(w.data || [])
    setExerciseRecords(e.data || [])
    setSuppRecords(s.data || [])

    // 日別に食事記録を集計
    const daily = {}
    const hourCounts = Array(24).fill(0) // 時刻帯カウント
    ;(m.data || []).forEach(r => {
      const date = r.recorded_at.slice(0, 10)
      if (!daily[date]) daily[date] = { date, cal: 0, protein: 0, fat: 0, carbs: 0, count: 0 }
      daily[date].cal     += r.total_cal || 0
      daily[date].protein += r.protein   || 0
      daily[date].fat     += r.fat       || 0
      daily[date].carbs   += r.carbs     || 0
      daily[date].count   += 1
      // 食事時刻の集計（JST: UTC+9）
      const hour = (new Date(r.recorded_at).getUTCHours() + 9) % 24
      hourCounts[hour]++
    })
    setMealTrends(Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)))
    setMealHourCounts(hourCounts)
  }

  // 今日の水分合計
  const totalWaterMl = waterRecords.reduce((s, r) => s + r.amount_ml, 0)
  const waterTarget = 2000
  const waterPct = Math.min(100, Math.round(totalWaterMl / waterTarget * 100))

  // 今日の運動消費カロリー合計
  const totalExCal = exerciseRecords.reduce((s, r) => s + (r.calories_burned || 0), 0)


  // 体重記録保存
  async function saveBody() {
    if (!bodyWeight) return
    setSavingBody(true)
    await supabase.from('body_records').insert({
      user_id: profile.id,
      weight: parseFloat(bodyWeight),
      bodyfat: bodyFat ? parseFloat(bodyFat) : null,
      muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
      recorded_at: new Date().toISOString(),
    })
    setBodyWeight(''); setBodyFat(''); setMuscleMass('')
    fetchAll()
    setSavingBody(false)
  }

  // 水分記録保存
  async function saveWater(ml) {
    setSavingWater(true)
    await supabase.from('water_records').insert({
      user_id: profile.id, amount_ml: ml, recorded_at: new Date().toISOString(),
    })
    fetchAll()
    setSavingWater(false)
  }

  // 運動記録保存
  async function saveExercise() {
    if (!exName || !exDuration) return
    setSavingEx(true)
    const cal = exCalories || Math.round(
      (EXERCISE_PRESETS.find(e => e.name === exName)?.cal_per_min || 4)
      * parseFloat(exDuration)
      * (profile.weight / 60)
    )
    await supabase.from('exercise_records').insert({
      user_id: profile.id,
      exercise_name: exName,
      duration_min: parseInt(exDuration),
      calories_burned: parseInt(cal),
      memo: exMemo,
      recorded_at: new Date().toISOString(),
    })
    setExName(''); setExDuration(''); setExCalories(''); setExMemo('')
    fetchAll()
    setSavingEx(false)
  }

  // サプリ記録保存
  async function saveSupplement() {
    if (!suppName) return
    setSavingSupp(true)
    await supabase.from('supplement_records').insert({
      user_id: profile.id,
      supp_name: suppName,
      amount: suppAmount,
      timing: suppTiming,
      recorded_at: new Date().toISOString(),
    })
    setSuppName(''); setSuppAmount('')
    fetchAll()
    setSavingSupp(false)
  }

  const s = {
    card: { background: '#fff', borderRadius: 16, padding: '1rem', marginBottom: 12 },
    sectionTab: (active) => ({
      flex: 1, padding: '7px 4px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      border: 'none', cursor: 'pointer', textAlign: 'center',
      background: active ? '#1a1a2e' : '#f0f0f0',
      color: active ? '#e8c97e' : '#666',
    }),
    input: { width: '100%', borderRadius: 10, border: '1px solid #ddd', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' },
    saveBtn: (disabled) => ({
      width: '100%', background: disabled ? '#ccc' : '#1a1a2e', color: disabled ? '#aaa' : '#e8c97e',
      border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 8,
    }),
    label: { fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4, display: 'block' },
    row: { display: 'flex', gap: 8, marginBottom: 10 },
    statBox: { flex: 1, background: '#f8f8f8', borderRadius: 10, padding: '10px 8px', textAlign: 'center' },
  }

  return (
    <>
      {/* セクション切り替えタブ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['summary','📊 サマリー'],['body','⚖️ 体重'],['water','💧 水分'],['exercise','💪 運動'],['supplement','💊 サプリ']].map(([id, label]) => (
          <div key={id} style={s.sectionTab(activeSection === id)} onClick={() => setActiveSection(id)}>{label}</div>
        ))}
      </div>

      {/* ━━━━━ サマリー ━━━━━ */}
      {activeSection === 'summary' && (
        <>
          {/* 今日のサマリーカード */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📅 今日のトラッキング</div>
            <div style={s.row}>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#185FA5' }}>{totalWaterMl}</div>
                <div style={{ fontSize: 10, color: '#888' }}>水分 ml</div>
                <div style={{ fontSize: 10, color: waterPct >= 100 ? '#3B6D11' : '#BA7517' }}>目標{waterTarget}ml の{waterPct}%</div>
              </div>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#BA7517' }}>{totalExCal}</div>
                <div style={{ fontSize: 10, color: '#888' }}>運動消費 kcal</div>
              </div>
              <div style={s.statBox}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3B6D11' }}>{suppRecords.length}</div>
                <div style={{ fontSize: 10, color: '#888' }}>サプリ摂取数</div>
              </div>
            </div>
          </div>

          {/* 期間切り替えボタン */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['week','7日間'],['month','30日間']].map(([id, label]) => (
              <button key={id} onClick={() => setGraphPeriod(id)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: graphPeriod === id ? '#1a1a2e' : '#f0f0f0', color: graphPeriod === id ? '#e8c97e' : '#666' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 体重トレンドグラフ */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚖️ 体重トレンド</div>
            {bodyRecords.length > 0 && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 22 }}>{bodyRecords[bodyRecords.length - 1]?.weight}</span>
                <span style={{ color: '#888', fontSize: 12 }}>kg（最新）</span>
                {bodyRecords.length >= 2 && (
                  <span style={{ fontSize: 12, color: bodyRecords[bodyRecords.length-1].weight <= bodyRecords[0].weight ? '#3B6D11' : '#E24B4A', marginLeft: 8 }}>
                    {bodyRecords[bodyRecords.length-1].weight <= bodyRecords[0].weight ? '▼' : '▲'}
                    {Math.abs(bodyRecords[bodyRecords.length-1].weight - bodyRecords[0].weight).toFixed(1)}kg
                  </span>
                )}
              </div>
            )}
            <TrendChart
              data={(graphPeriod === 'week' ? bodyRecords.slice(-7) : bodyRecords).map(r => ({
                value: r.weight,
                label: new Date(r.recorded_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
              }))}
              color="#185FA5" unit="kg"
            />
          </div>

          {/* 週次・月次 栄養グラフ */}
          {mealTrends.length >= 2 && (() => {
            const data = graphPeriod === 'week' ? mealTrends.slice(-7) : mealTrends
            const calData  = data.map(d => ({ value: d.cal,     label: d.date.slice(5) }))
            const protData = data.map(d => ({ value: d.protein, label: d.date.slice(5) }))
            const carbData = data.map(d => ({ value: d.carbs,   label: d.date.slice(5) }))
            const avgCal   = Math.round(data.reduce((s,d) => s + d.cal, 0) / data.length)
            const avgProt  = Math.round(data.reduce((s,d) => s + d.protein, 0) / data.length)
            return (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🍽️ 栄養摂取トレンド</div>

                {/* グラフ切り替えタブ */}
                {[
                  { label: 'カロリー', data: calData, color: '#1a1a2e', unit: 'kcal', avg: avgCal, target: profile.targetCal },
                  { label: 'タンパク質', data: protData, color: '#185FA5', unit: 'g', avg: avgProt, target: profile.pfcP },
                  { label: '炭水化物', data: carbData, color: '#3B6D11', unit: 'g',
                    avg: Math.round(data.reduce((s,d) => s + d.carbs, 0) / data.length), target: profile.pfcC },
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        平均 <span style={{ fontWeight: 700, color: item.color }}>{item.avg}{item.unit}</span>
                        {item.target && <span style={{ color: '#aaa', marginLeft: 4 }}>/ 目標{item.target}{item.unit}</span>}
                      </div>
                    </div>
                    <TrendChart data={item.data} color={item.color} unit={item.unit} targetLine={item.target} />
                  </div>
                ))}
              </div>
            )
          })()}

          {/* 食事時刻の傾向（時間栄養学） */}
          {mealTrends.length >= 3 && (() => {
            // meal_recordsから時刻帯を分析
            return null // meal_recordsの時刻データはTrackingTabで別途取得が必要なため後続で対応
          })()}

          {/* 食事カロリー × 体重変化 相関グラフ */}
          {mealTrends.length >= 3 && bodyRecords.length >= 3 && (() => {
            // 食事記録と体重記録が重なる日付のみ抽出
            const bodyMap = {}
            bodyRecords.forEach(r => { bodyMap[r.recorded_at.slice(0, 10)] = r.weight })
            const corr = mealTrends
              .filter(d => bodyMap[d.date])
              .map(d => ({ date: d.date.slice(5), cal: d.cal, weight: bodyMap[d.date] }))

            if (corr.length < 3) return (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📉 食事×体重 相関</div>
                <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '12px 0' }}>
                  食事記録と体重記録が重なる日が3日以上になると表示されます
                </div>
              </div>
            )

            const W = 300, H = 120, PAD = 30
            const cals    = corr.map(d => d.cal)
            const weights = corr.map(d => d.weight)
            const calMin = Math.min(...cals) * 0.95, calMax = Math.max(...cals) * 1.05
            const wMin   = Math.min(...weights) * 0.998, wMax = Math.max(...weights) * 1.002

            const calPts = corr.map((d, i) => {
              const x = PAD + (i / (corr.length - 1)) * (W - PAD * 2)
              const y = H - PAD - ((d.cal - calMin) / (calMax - calMin || 1)) * (H - PAD * 2)
              return { x, y, d }
            })
            const wPts = corr.map((d, i) => {
              const x = PAD + (i / (corr.length - 1)) * (W - PAD * 2)
              const y = H - PAD - ((d.weight - wMin) / (wMax - wMin || 1)) * (H - PAD * 2)
              return { x, y, d }
            })

            const avgCal2   = Math.round(cals.reduce((a, b) => a + b, 0) / cals.length)
            const latestW   = weights[weights.length - 1]
            const firstW    = weights[0]
            const wChange   = (latestW - firstW).toFixed(1)
            const wColor    = wChange <= 0 ? '#3B6D11' : '#E24B4A'

            return (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📉 食事カロリー × 体重 相関</div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
                  食事量と体重変化の関係を可視化します
                </div>

                {/* サマリー数値 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={s.statBox}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{avgCal2}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>平均摂取kcal</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: wColor }}>
                      {wChange > 0 ? '+' : ''}{wChange}kg
                    </div>
                    <div style={{ fontSize: 10, color: '#888' }}>期間中の体重変化</div>
                  </div>
                  <div style={s.statBox}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#555' }}>{corr.length}日分</div>
                    <div style={{ fontSize: 10, color: '#888' }}>記録日数</div>
                  </div>
                </div>

                {/* 2軸グラフ（SVG） */}
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
                  {/* カロリー折れ線（黄金色） */}
                  <polyline
                    points={calPts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#e8c97e" strokeWidth="2" strokeLinejoin="round"
                  />
                  {/* 体重折れ線（青） */}
                  <polyline
                    points={wPts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinejoin="round"
                  />
                  {corr.map((d, i) => (
                    <g key={i}>
                      <circle cx={calPts[i].x} cy={calPts[i].y} r="3" fill="#e8c97e" />
                      <circle cx={wPts[i].x}   cy={wPts[i].y}   r="3" fill="#185FA5" />
                    </g>
                  ))}
                </svg>

                {/* 凡例 */}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 3, background: '#e8c97e', borderRadius: 2 }} />
                    摂取カロリー
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 16, height: 3, background: '#185FA5', borderRadius: 2 }} />
                    体重
                  </span>
                </div>

                {/* 解釈コメント */}
                <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '8px 10px', marginTop: 10, fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                  {parseFloat(wChange) < -0.5
                    ? '✅ 食事管理が体重減少に反映されています。この調子で継続しましょう！'
                    : parseFloat(wChange) > 0.5
                    ? '📊 体重が増加傾向です。摂取カロリーと目標カロリーを見直してみましょう。'
                    : '⚖️ 体重が安定しています。現在の食事量を維持しながら栄養の質を高めましょう。'}
                </div>
              </div>
            )
          })()}
          {/* 食事時刻の分布（時間栄養学） */}
          {mealHourCounts.some(c => c > 0) && (() => {
            const maxCount = Math.max(...mealHourCounts, 1)
            // 主な食事時間帯を特定
            const lateNight = mealHourCounts.slice(21, 24).reduce((a,b)=>a+b,0) + mealHourCounts.slice(0,5).reduce((a,b)=>a+b,0)
            const total = mealHourCounts.reduce((a,b)=>a+b,0)
            const lateRatio = total > 0 ? Math.round(lateNight / total * 100) : 0
            // 朝食の時刻帯
            const breakfastHours = mealHourCounts.slice(5,10).reduce((a,b)=>a+b,0)
            const hasBreakfast = breakfastHours > 0
            return (
              <div style={s.card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🕐 食事時刻の傾向（時間栄養学）</div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>いつ食べているかを可視化します</div>

                {/* 24時間バーチャート */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginBottom: 6 }}>
                  {mealHourCounts.map((count, hour) => {
                    const h = count / maxCount
                    const isLate = hour >= 21 || hour <= 4
                    const isBreakfast = hour >= 5 && hour <= 9
                    const isMorning = hour >= 10 && hour <= 13
                    const color = isLate ? '#E24B4A' : isBreakfast ? '#3B6D11' : isMorning ? '#185FA5' : '#1a1a2e'
                    return (
                      <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', height: Math.max(2, h * 52), background: count > 0 ? color : '#f0f0f0', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                      </div>
                    )
                  })}
                </div>

                {/* 時刻ラベル */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa', marginBottom: 10 }}>
                  {['0','6','12','18','23'].map(h => <span key={h}>{h}時</span>)}
                </div>

                {/* 凡例 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, marginBottom: 10 }}>
                  {[['#3B6D11','朝食帯(5-9時)'],['#185FA5','昼食帯(10-13時)'],['#1a1a2e','夕食帯(14-20時)'],['#E24B4A','夜遅い食事(21時以降)']].map(([c,l]) => (
                    <span key={l} style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <span style={{ display:'inline-block', width:10, height:10, background:c, borderRadius:2 }} />{l}
                    </span>
                  ))}
                </div>

                {/* 時間栄養学コメント */}
                <div style={{ background: lateRatio >= 20 ? '#FCEBEB' : '#EAF3DE', borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.6, color: lateRatio >= 20 ? '#A32D2D' : '#3B6D11' }}>
                  {lateRatio >= 20
                    ? `⚠️ 食事の${lateRatio}%が21時以降です。夜遅い食事は同じカロリーでも脂肪として蓄積されやすくなります。`
                    : !hasBreakfast
                    ? '⚠️ 朝食の記録がありません。朝食は体内時計をリセットし代謝スイッチをONにする重要な食事です。'
                    : '✅ 食事のタイミングが良好です。この習慣を維持しましょう。'}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ━━━━━ 体重・体組成 ━━━━━ */}
      {activeSection === 'body' && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚖️ 体重・体組成を記録</div>
          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>体重 (kg) *</label>
              <input value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} placeholder="例: 65.5" type="number" step="0.1" style={s.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>体脂肪率 (%)</label>
              <input value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="例: 22.0" type="number" step="0.1" style={s.input} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>筋肉量 (kg)</label>
            <input value={muscleMass} onChange={e => setMuscleMass(e.target.value)} placeholder="例: 45.0" type="number" step="0.1" style={s.input} />
          </div>
          <button style={s.saveBtn(!bodyWeight || savingBody)} onClick={saveBody} disabled={!bodyWeight || savingBody}>
            {savingBody ? '保存中...' : '記録する'}
          </button>

          {/* 過去の記録 */}
          {bodyRecords.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>過去の記録</div>
              {bodyRecords.slice().reverse().slice(0, 10).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                  <span style={{ color: '#888' }}>{new Date(r.recorded_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                  <span>
                    <strong>{r.weight}kg</strong>
                    {r.bodyfat && <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>体脂{r.bodyfat}%</span>}
                    {r.muscle_mass && <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>筋{r.muscle_mass}kg</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━ 水分摂取 ━━━━━ */}
      {activeSection === 'water' && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💧 水分摂取を記録</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
            時間栄養学的に、1日2Lの水分摂取が代謝・体温維持・デトックスに重要です。
          </div>

          {/* 進捗バー */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{totalWaterMl}ml / {waterTarget}ml</span>
              <span style={{ color: waterPct >= 100 ? '#3B6D11' : '#888' }}>{waterPct}%</span>
            </div>
            <div style={{ height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: waterPct + '%', background: waterPct >= 100 ? '#3B6D11' : '#185FA5', borderRadius: 5, transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* クイック追加ボタン */}
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>クイック追加</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {WATER_QUICK.map(ml => (
              <button key={ml} onClick={() => saveWater(ml)} disabled={savingWater}
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 4px', fontSize: 13, fontWeight: 600, color: '#1D4ED8', cursor: 'pointer' }}>
                +{ml}ml
              </button>
            ))}
          </div>

          {/* 今日のログ */}
          {waterRecords.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>今日の記録</div>
              {waterRecords.slice().reverse().map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}>
                  <span style={{ color: '#888' }}>{new Date(r.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ fontWeight: 600, color: '#185FA5' }}>+{r.amount_ml}ml</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━ 運動記録 ━━━━━ */}
      {activeSection === 'exercise' && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💪 運動を記録</div>

          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>種目 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {EXERCISE_PRESETS.map(e => (
                <button key={e.name} onClick={() => setExName(e.name)}
                  style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: exName === e.name ? '#1a1a2e' : '#f0f0f0', color: exName === e.name ? '#e8c97e' : '#555' }}>
                  {e.icon} {e.name}
                </button>
              ))}
            </div>
          </div>

          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>時間（分）*</label>
              <input value={exDuration} onChange={e => { setExDuration(e.target.value); const preset = EXERCISE_PRESETS.find(p => p.name === exName); if (preset && e.target.value) setExCalories(String(Math.round(preset.cal_per_min * parseFloat(e.target.value) * (profile.weight / 60)))) }} placeholder="例: 30" type="number" style={s.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>消費kcal（自動計算）</label>
              <input value={exCalories} onChange={e => setExCalories(e.target.value)} placeholder="自動入力" type="number" style={s.input} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>メモ（任意）</label>
            <input value={exMemo} onChange={e => setExMemo(e.target.value)} placeholder="例: 胸・背中の日、MAXベンチ80kg" style={s.input} />
          </div>

          <button style={s.saveBtn((!exName || !exDuration) || savingEx)} onClick={saveExercise} disabled={(!exName || !exDuration) || savingEx}>
            {savingEx ? '保存中...' : '記録する'}
          </button>

          {exerciseRecords.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>今日の運動</div>
              {exerciseRecords.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.exercise_name}</div>
                    {r.memo && <div style={{ fontSize: 11, color: '#888' }}>{r.memo}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#BA7517' }}>{r.calories_burned}kcal</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{r.duration_min}分</div>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#BA7517', paddingTop: 8 }}>
                合計 {totalExCal}kcal消費
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━ サプリメント ━━━━━ */}
      {activeSection === 'supplement' && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💊 サプリメントを記録</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
            食事と合わせた総合的な栄養管理のために、サプリの摂取を記録しましょう。
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>サプリ名 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {SUPP_PRESETS.map(name => (
                <button key={name} onClick={() => setSuppName(name)}
                  style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: suppName === name ? '#1a1a2e' : '#f0f0f0', color: suppName === name ? '#e8c97e' : '#555' }}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>量・錠数</label>
              <input value={suppAmount} onChange={e => setSuppAmount(e.target.value)} placeholder="例: 1錠・30g" style={s.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>タイミング</label>
              <select value={suppTiming} onChange={e => setSuppTiming(e.target.value)} style={{ ...s.input, appearance: 'none' }}>
                {['朝食前', '朝食後', '昼食後', '運動前', '運動後', '夕食後', '就寝前'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <button style={s.saveBtn(!suppName || savingSupp)} onClick={saveSupplement} disabled={!suppName || savingSupp}>
            {savingSupp ? '保存中...' : '記録する'}
          </button>

          {suppRecords.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>今日のサプリ</div>
              {suppRecords.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{r.supp_name}</span>
                    {r.amount && <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>{r.amount}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: 20 }}>{r.timing}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
