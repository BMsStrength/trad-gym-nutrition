import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const GOAL_LABELS = {
  diet:'ダイエット', muscle:'筋肉増量', maintain:'体型維持',
  performance:'競技パフォーマンス', health:'健康改善',
  energy:'疲労・エネルギー改善', condition:'体調不良改善'
}

// 過去の食事記録から傾向を分析する関数
function analyzeTrends(records, profile) {
  if (!records || records.length === 0) return null

  const days = {}
  records.forEach(r => {
    const date = r.recorded_at.slice(0, 10)
    if (!days[date]) days[date] = { cal: 0, protein: 0, fat: 0, carbs: 0, count: 0, vitamins: {}, minerals: {} }
    days[date].cal     += r.total_cal || 0
    days[date].protein += r.protein   || 0
    days[date].fat     += r.fat       || 0
    days[date].carbs   += r.carbs     || 0
    days[date].count   += 1
    // ビタミン・ミネラルの集計
    if (r.vitamins) Object.entries(r.vitamins).forEach(([k, v]) => {
      days[date].vitamins[k] = (days[date].vitamins[k] || 0) + (v.amount || 0)
    })
    if (r.minerals) Object.entries(r.minerals).forEach(([k, v]) => {
      days[date].minerals[k] = (days[date].minerals[k] || 0) + (v.amount || 0)
    })
  })

  const dayArr = Object.values(days)
  const n = dayArr.length
  if (n === 0) return null

  const avgCal     = Math.round(dayArr.reduce((s, d) => s + d.cal, 0) / n)
  const avgProtein = Math.round(dayArr.reduce((s, d) => s + d.protein, 0) / n)
  const avgFat     = Math.round(dayArr.reduce((s, d) => s + d.fat, 0) / n)
  const avgCarbs   = Math.round(dayArr.reduce((s, d) => s + d.carbs, 0) / n)
  const avgMeals   = Math.round(dayArr.reduce((s, d) => s + d.count, 0) / n * 10) / 10

  // 各ビタミン・ミネラルの平均
  const vitKeys = ['A','B1','B2','B6','B12','C','D','E','K','葉酸']
  const minKeys = ['カルシウム','鉄','マグネシウム','亜鉛','カリウム']
  const avgVit = {}, avgMin = {}
  vitKeys.forEach(k => { avgVit[k] = Math.round(dayArr.reduce((s, d) => s + (d.vitamins[k] || 0), 0) / n * 10) / 10 })
  minKeys.forEach(k => { avgMin[k] = Math.round(dayArr.reduce((s, d) => s + (d.minerals[k] || 0), 0) / n * 10) / 10 })

  // 目標比較（不足しているものを特定）
  const targetCal  = profile.targetCal || 2000
  const targetP    = profile.pfcP || 120
  const calPct     = Math.round(avgCal / targetCal * 100)
  const protPct    = Math.round(avgProtein / targetP * 100)

  // 常に不足している栄養素を特定
  const vitTargets = { 'A':800,'B1':1.2,'B2':1.4,'B6':1.3,'B12':2.4,'C':100,'D':10,'E':12,'K':100,'葉酸':240 }
  const minTargets = { 'カルシウム':800,'鉄':10,'マグネシウム':340,'亜鉛':10,'カリウム':2500 }
  const lowVit = vitKeys.filter(k => vitTargets[k] && avgVit[k] < vitTargets[k] * 0.6).map(k => `ビタミン${k}`)
  const lowMin = minKeys.filter(k => minTargets[k] && avgMin[k] < minTargets[k] * 0.6)
  const chronicallyLow = [...lowVit, ...lowMin]

  // 脂質過多チェック
  const fatCalPct = avgCal > 0 ? Math.round((avgFat * 9) / avgCal * 100) : 0
  const fatExcess = fatCalPct > 30

  // 食事時刻の傾向分析
  const hourCounts = Array(24).fill(0)
  records.forEach(r => {
    const hour = (new Date(r.recorded_at).getUTCHours() + 9) % 24
    hourCounts[hour]++
  })
  const totalMeals = records.length
  const lateNightMeals = hourCounts.slice(21,24).reduce((a,b)=>a+b,0) + hourCounts[0] + hourCounts[1]
  const breakfastMeals = hourCounts.slice(5,10).reduce((a,b)=>a+b,0)
  const lateRatio = totalMeals > 0 ? Math.round(lateNightMeals / totalMeals * 100) : 0
  const breakfastRatio = n > 0 ? Math.round(breakfastMeals / n * 100) : 0
  // 最も多い食事時間帯
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
  const timingSummary = `
【食事時刻の傾向】
- 夜遅い食事(21時以降)の割合：${lateRatio}%${lateRatio >= 20 ? ' ※改善が必要' : ' ※良好'}
- 朝食摂取率：${breakfastRatio}%${breakfastRatio < 70 ? ' ※朝食欠食が多め' : ' ※良好'}
- 最も多い食事時間帯：${peakHour}時台
  `.trim()

  return {
    recordDays: n,
    totalRecords: records.length,
    avgCal, avgProtein, avgFat, avgCarbs, avgMeals,
    calPct, protPct, fatCalPct, fatExcess,
    chronicallyLow, lateRatio, breakfastRatio,
    avgVit, avgMin,
    summary: `
【過去${n}日間の食事傾向（${records.length}食分の記録より）】
- 1日平均摂取カロリー：${avgCal}kcal（目標比${calPct}%）
- 平均たんぱく質：${avgProtein}g/日（目標比${protPct}%）
- 平均脂質：${avgFat}g/日（カロリー比${fatCalPct}%${fatExcess ? ' ※過多傾向' : ''}）
- 平均炭水化物：${avgCarbs}g/日
- 1日平均食事回数：${avgMeals}回
- 慢性的に不足している栄養素：${chronicallyLow.length > 0 ? chronicallyLow.join('・') : 'なし（良好）'}
- 平均ビタミン摂取：${vitKeys.map(k => `${k}=${avgVit[k]}`).join(', ')}
- 平均ミネラル摂取：${minKeys.map(k => `${k}=${avgMin[k]}`).join(', ')}
    `.trim(),
    timingSummary
  }
}

export default function AdviceTab({ profile, dailyIntake }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [trends, setTrends] = useState(null)
  const [loadingTrends, setLoadingTrends] = useState(true)
  const [showTrends, setShowTrends] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // 起動時に過去30日の食事記録を取得して傾向を分析
  useEffect(() => {
    async function loadTrends() {
      setLoadingTrends(true)
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('meal_records')
        .select('total_cal,protein,fat,carbs,vitamins,minerals,recorded_at,meal_name')
        .eq('user_id', profile.id)
        .gte('recorded_at', from)
        .order('recorded_at')
      const t = analyzeTrends(data, profile)
      setTrends(t)
      setLoadingTrends(false)

      // 傾向データを踏まえた初回メッセージを生成
      const goalLabel = GOAL_LABELS[profile.goal] || profile.goal
      let greeting = `こんにちは、${profile.nickname}さん！TRADジム栄養士AIです。\n目標「${goalLabel}」に向けてサポートします。`
      if (t && t.recordDays >= 3) {
        greeting += `\n\n📊 過去${t.recordDays}日間のデータを分析しました。`
        if (t.calPct < 80) {
          greeting += `\n⚠️ 平均摂取カロリーが目標の${t.calPct}%と少なめです。しっかり食べることが代謝アップの第一歩です。`
        } else if (t.calPct > 115) {
          greeting += `\n⚠️ 平均摂取カロリーが目標を${t.calPct - 100}%超えています。食事内容を見直しましょう。`
        }
        if (t.chronicallyLow.length > 0) {
          greeting += `\n🔴 慢性的に不足：${t.chronicallyLow.slice(0, 3).join('・')}${t.chronicallyLow.length > 3 ? 'など' : ''}`
        }
        if (t.fatExcess) {
          greeting += `\n⚠️ 脂質比率が${t.fatCalPct}%と高めです。ご飯中心の食事に切り替えると改善しやすいです。`
        }
        greeting += '\n\n食事・体づくりについて何でもご相談ください！'
      } else {
        greeting += '\n食事・栄養・体づくりについて何でもご相談ください。'
      }
      setMessages([{ role: 'assistant', text: greeting }])
    }
    loadTrends()
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setMessages(prev => [...prev, { role: 'user', text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          profile,
          dailyIntake,
          trends: trends?.summary || null,
          timingTrends: trends?.timingSummary || null, // 食事時刻傾向
          history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'エラーが発生しました' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '接続エラーが発生しました。しばらく後にお試しください。' }])
    }
    setSending(false)
  }

  const s = {
    wrap: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' },
    messages: { flex: 1, overflowY: 'auto', paddingBottom: 8 },
    bubble: (role) => ({
      background: role === 'user' ? '#1a1a2e' : '#fff',
      color: role === 'user' ? '#e8c97e' : '#1a1a1a',
      borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
      maxWidth: '85%', marginLeft: role === 'user' ? 'auto' : '0',
      marginBottom: 8, whiteSpace: 'pre-wrap',
      border: role === 'user' ? 'none' : '1px solid #eee',
    }),
    inputRow: { display: 'flex', gap: 8, paddingTop: 8 },
    sendBtn: { background: '#1a1a2e', color: '#e8c97e', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: sending ? 0.5 : 1 },
  }

  return (
    <div style={s.wrap}>
      {/* 傾向サマリーバナー（折りたたみ式） */}
      {!loadingTrends && trends && trends.recordDays >= 3 && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowTrends(!showTrends)}
            style={{ width: '100%', background: '#1a1a2e', border: 'none', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e8c97e' }}>
              📊 あなたの食事傾向（過去{trends.recordDays}日・{trends.totalRecords}食分）
            </span>
            <span style={{ fontSize: 11, color: 'rgba(232,201,126,0.7)' }}>{showTrends ? '▲ 閉じる' : '▼ 見る'}</span>
          </button>

          {showTrends && (
            <div style={{ background: '#f8f8f8', borderRadius: '0 0 12px 12px', padding: '10px 12px', border: '1px solid #eee', borderTop: 'none' }}>
              {/* 平均摂取カロリーバー */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#555' }}>平均カロリー</span>
                  <span style={{ fontWeight: 700, color: trends.calPct >= 80 && trends.calPct <= 115 ? '#3B6D11' : '#E24B4A' }}>
                    {trends.avgCal}kcal（目標比{trends.calPct}%）
                  </span>
                </div>
                <div style={{ height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: Math.min(100, trends.calPct) + '%', background: trends.calPct >= 80 && trends.calPct <= 115 ? '#3B6D11' : '#E24B4A', borderRadius: 3 }} />
                </div>
              </div>

              {/* PFC */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[
                  { label: 'P', value: trends.avgProtein + 'g', color: '#185FA5' },
                  { label: 'F', value: trends.avgFat + 'g', color: '#BA7517' },
                  { label: 'C', value: trends.avgCarbs + 'g', color: '#3B6D11' },
                ].map(item => (
                  <div key={item.label} style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '6px', textAlign: 'center', border: '1px solid #eee' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>平均{item.label}</div>
                  </div>
                ))}
              </div>

              {/* 慢性的不足 */}
              {trends.chronicallyLow.length > 0 && (
                <div style={{ background: '#FCEBEB', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#A32D2D', marginBottom: 3 }}>🔴 慢性的に不足している栄養素</div>
                  <div style={{ fontSize: 12, color: '#A32D2D' }}>{trends.chronicallyLow.join('・')}</div>
                </div>
              )}

              {trends.fatExcess && (
                <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#92400E' }}>⚠️ 脂質比率{trends.fatCalPct}%（理想は25%以下）。主食をご飯に切り替えると改善しやすいです。</div>
                </div>
              )}
              {trends.lateRatio >= 20 && (
                <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#92400E' }}>🌙 夜遅い食事が{trends.lateRatio}%。21時以降の食事は脂肪蓄積2倍になりやすいです。</div>
                </div>
              )}
              {trends.breakfastRatio < 70 && (
                <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: '#1D4ED8' }}>🌅 朝食摂取率{trends.breakfastRatio}%。朝食は体内時計リセット・代謝スイッチONに重要です。</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* チャットメッセージ */}
      <div style={s.messages}>
        {loadingTrends && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: 13 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #eee', borderTopColor: '#1a1a2e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            過去の食事データを読み込んでいます...
          </div>
        )}
        {messages.map((m, i) => <div key={i} style={s.bubble(m.role)}>{m.text}</div>)}
        {sending && <div style={s.bubble('assistant')}><span style={{ color: '#aaa' }}>考え中...</span></div>}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div style={s.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="質問を入力..."
          style={{ flex: 1 }}
        />
        <button style={s.sendBtn} onClick={send} disabled={sending}>送信</button>
      </div>
    </div>
  )
}
