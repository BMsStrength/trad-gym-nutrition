import { useState } from 'react'
import { supabase } from '../lib/supabase'

const GOALS = [
  { id:'diet',        icon:'🔥', label:'ダイエット' },
  { id:'muscle',      icon:'💪', label:'筋肉増量' },
  { id:'maintain',    icon:'⚖️', label:'体型維持' },
  { id:'performance', icon:'🏃', label:'競技パフォーマンス' },
  { id:'health',      icon:'💚', label:'健康改善' },
  { id:'energy',      icon:'⚡', label:'疲労・エネルギー' },
  { id:'condition',   icon:'🤒', label:'体調不良' },
]

const SYMPTOMS = [
  // 消化器系
  '便秘', '下痢', '腹痛', '胃もたれ', '吐き気', '食欲不振',
  // 循環・代謝系
  '貧血・立ちくらみ', 'むくみ', '冷え性', '高血圧', '血糖値が高め', '脂質異常',
  // 疲労・エネルギー系
  '慢性的な疲労感', '朝起きられない', '体重が減りやすい', '体重が増えやすい',
  // 皮膚・外見系
  '肌荒れ・ニキビ', '抜け毛・薄毛', '爪が割れやすい', '口内炎が頻繁に出る',
  // 神経・精神系
  'イライラしやすい', '気分が落ち込む・うつ傾向', '不安感が強い', '集中力・記憶力の低下',
  '睡眠障害・寝つきが悪い', '頭痛・偏頭痛', 'めまい',
  // 筋骨格系
  '筋肉のけいれん・こむら返り', '関節痛・骨の痛み',
  // その他
  'PMS・月経不順', 'アレルギー・花粉症', 'その他',
]

function calcTargets(data) {
  const { height, weight, age, gender, activity, goals } = data
  const bmr = gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
  const tdee = Math.round(bmr * parseFloat(activity))
  let targetCal = tdee
  if (goals.includes('diet'))        targetCal = Math.max(1200, tdee - Math.round((2.5 * 7700) / 30))
  else if (goals.includes('muscle')) targetCal = tdee + 300
  else if (goals.includes('performance')) targetCal = tdee + 100
  const mainGoal = goals.includes('diet') ? 'diet' : goals.includes('muscle') ? 'muscle' : goals.includes('performance') ? 'performance' : goals[0] || 'maintain'
  const pfcP = Math.round(weight * (mainGoal === 'muscle' ? 2.2 : mainGoal === 'diet' ? 2.0 : mainGoal === 'performance' ? 1.8 : 1.6))
  const pfcF = Math.round(targetCal * 0.25 / 9)
  const pfcC = Math.round((targetCal - pfcP * 4 - pfcF * 9) / 4)
  return { tdee, targetCal, pfcP, pfcF, pfcC }
}

export default function OnboardingPage({ userId, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nickname:'', gender:'male', age:'',
    height:'', weight:'', bodyfat:'', activity:'1.55',
    goals:[], symptoms:[], symptomsOther:'',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setError('') }

  function toggleGoal(id) {
    setForm(p => ({
      ...p,
      goals: p.goals.includes(id) ? p.goals.filter(g => g !== id) : [...p.goals, id]
    }))
    setError('')
  }

  function toggleSymptom(s) {
    setForm(p => ({
      ...p,
      symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s]
    }))
  }

  function next1() {
    if (!form.nickname || !form.age) { setError('ニックネームと年齢を入力してください'); return }
    setStep(2)
  }
  function next2() {
    if (!form.height || !form.weight) { setError('身長と体重を入力してください'); return }
    setStep(3)
  }
  function next3() {
    if (form.goals.length === 0) { setError('目標を1つ以上選択してください'); return }
    if (form.goals.includes('condition')) { setStep(4); return }
    setStep(5)
  }
  function next4() {
    if (form.symptoms.length === 0) { setError('症状を1つ以上選択してください'); return }
    setStep(5)
  }

  async function save() {
    setSaving(true)
    const targets = calcTargets(form)
    const profile = {
      id: userId,
      nickname: form.nickname,
      gender: form.gender,
      age: parseInt(form.age),
      height: parseFloat(form.height),
      weight: parseFloat(form.weight),
      bodyfat: form.bodyfat ? parseFloat(form.bodyfat) : null,
      activity: parseFloat(form.activity),
      goal: form.goals[0],
      goals: form.goals,
      symptoms: form.symptoms,
      symptoms_other: form.symptomsOther,
      ...targets,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('profiles').upsert(profile).select().single()
    setSaving(false)
    if (error) { setError('保存に失敗しました: ' + error.message); return }
    onComplete(data)
  }

  const targets = step === 5 ? calcTargets(form) : null
  const bmi = step === 5 ? Math.round(form.weight / ((form.height / 100) ** 2) * 10) / 10 : null
  const totalSteps = form.goals.includes('condition') ? 5 : 4
  const currentStep = step === 5 ? totalSteps : step

  const s = {
    wrap: { minHeight:'100vh', background:'#f5f5f0', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:16, paddingTop:24 },
    box: { background:'#fff', borderRadius:20, padding:'1.5rem', width:'100%', maxWidth:420, boxShadow:'0 2px 20px rgba(0,0,0,0.08)' },
    logo: { textAlign:'center', marginBottom:'1rem' },
    badge: { display:'inline-block', background:'#1a1a2e', color:'#e8c97e', fontSize:18, fontWeight:700, padding:'8px 20px', borderRadius:10, letterSpacing:2 },
    dots: { display:'flex', justifyContent:'center', gap:6, margin:'1rem 0' },
    dot: (state) => ({ width:8, height:8, borderRadius:'50%', background: state==='done'?'#3B6D11': state==='active'?'#1a1a2e':'#ddd' }),
    title: { fontSize:18, fontWeight:700, marginBottom:3 },
    sub: { fontSize:12, color:'#888', marginBottom:'1.25rem' },
    field: { marginBottom:14 },
    label: { display:'block', fontSize:13, color:'#666', marginBottom:5 },
    btn: { width:'100%', background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:12, padding:14, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:8 },
    btnBack: { width:'100%', background:'#f0f0f0', color:'#333', border:'none', borderRadius:12, padding:14, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:8 },
    err: { background:'#fff0f0', border:'1px solid #fcc', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#c00', marginBottom:10 },
    goalGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 },
    goalBtn: (sel) => ({ background: sel ? '#EAF3DE' : '#f8f8f8', border: sel ? '2px solid #3B6D11' : '1px solid #ddd', borderRadius:10, padding:'14px 8px', textAlign:'center', cursor:'pointer' }),
    symptomWrap: { display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 },
    symptomBtn: (sel) => ({ padding:'6px 12px', borderRadius:20, fontSize:13, cursor:'pointer', border: sel ? '2px solid #185FA5' : '1px solid #ddd', background: sel ? '#E6F1FB' : '#f8f8f8', color: sel ? '#185FA5' : '#555', fontWeight: sel ? 600 : 400 }),
    calBox: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:12, padding:'1rem', margin:'10px 0' },
    pfcGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10 },
    pfcCard: { background:'#f8f8f8', borderRadius:8, padding:'8px', textAlign:'center' },
    row: { display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f0f0f0', fontSize:13 },
    hint: { fontSize:11, color:'#aaa', marginTop:4 },
  }

  const stepDots = Array.from({ length: totalSteps }, (_, i) => {
    const dotStep = i + 1
    return dotStep < currentStep ? 'done' : dotStep === currentStep ? 'active' : 'inactive'
  })

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.logo}><div style={s.badge}>TRAD GYM</div></div>
        <div style={s.dots}>{stepDots.map((state, i) => <div key={i} style={s.dot(state)} />)}</div>
        {error && <div style={s.err}>{error}</div>}

        {/* STEP 1: 基本情報 */}
        {step === 1 && <>
          <div style={s.title}>プロフィール設定</div>
          <div style={s.sub}>ステップ 1 / {totalSteps} — 基本情報</div>
          <div style={s.field}><label style={s.label}>ニックネーム</label><input value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="例: タロウ" /></div>
          <div style={s.field}><label style={s.label}>性別</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="male">男性</option><option value="female">女性</option>
            </select>
          </div>
          <div style={s.field}><label style={s.label}>年齢</label><input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="例: 30" /></div>
          <button style={s.btn} onClick={next1}>次へ</button>
        </>}

        {/* STEP 2: 身体情報 */}
        {step === 2 && <>
          <div style={s.title}>身体情報</div>
          <div style={s.sub}>ステップ 2 / {totalSteps}</div>
          <div style={s.field}><label style={s.label}>身長 (cm)</label><input type="number" value={form.height} onChange={e => set('height', e.target.value)} placeholder="例: 170" /></div>
          <div style={s.field}><label style={s.label}>体重 (kg)</label><input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="例: 65" step="0.1" /></div>
          <div style={s.field}><label style={s.label}>体脂肪率 (%) <span style={{fontSize:11,color:'#aaa'}}>— 不明な場合は空欄</span></label><input type="number" value={form.bodyfat} onChange={e => set('bodyfat', e.target.value)} placeholder="例: 20" step="0.1" /></div>
          <div style={s.field}><label style={s.label}>活動レベル</label>
            <select value={form.activity} onChange={e => set('activity', e.target.value)}>
              <option value="1.2">座り仕事が多い（ほぼ運動なし）</option>
              <option value="1.375">軽い運動（週1〜3回）</option>
              <option value="1.55">中程度の運動（週3〜5回）</option>
              <option value="1.725">激しい運動（週6〜7回）</option>
              <option value="1.9">非常に激しい運動（1日2回など）</option>
            </select>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button style={{...s.btnBack, flex:1}} onClick={() => setStep(1)}>戻る</button>
            <button style={{...s.btn, flex:2, marginTop:8}} onClick={next2}>次へ</button>
          </div>
        </>}

        {/* STEP 3: 目標（複数選択） */}
        {step === 3 && <>
          <div style={s.title}>目標を選択</div>
          <div style={s.sub}>ステップ 3 / {totalSteps} — 複数選択できます</div>
          <div style={s.goalGrid}>
            {GOALS.map(g => (
              <div key={g.id} style={s.goalBtn(form.goals.includes(g.id))} onClick={() => toggleGoal(g.id)}>
                <div style={{fontSize:24, marginBottom:4}}>{g.icon}</div>
                <div style={{fontSize:12, fontWeight:600}}>{g.label}</div>
                {form.goals.includes(g.id) && <div style={{fontSize:10, color:'#3B6D11', marginTop:2}}>✓ 選択中</div>}
              </div>
            ))}
          </div>
          {form.goals.includes('condition') && <div style={{background:'#E6F1FB', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#185FA5', marginBottom:8}}>「体調不良」を選択しました。次のステップで症状を教えてください。</div>}
          <div style={{display:'flex', gap:8}}>
            <button style={{...s.btnBack, flex:1}} onClick={() => setStep(2)}>戻る</button>
            <button style={{...s.btn, flex:2, marginTop:8}} onClick={next3}>次へ</button>
          </div>
        </>}

        {/* STEP 4: 症状選択（体調不良選択時のみ） */}
        {step === 4 && <>
          <div style={s.title}>症状を選択</div>
          <div style={s.sub}>ステップ 4 / {totalSteps} — 複数選択できます</div>
          <div style={s.symptomWrap}>
            {SYMPTOMS.map(s => (
              <button key={s} style={symptomBtn(form.symptoms.includes(s))} onClick={() => toggleSymptom(s)}>{s}</button>
            ))}
          </div>
          {form.symptoms.includes('その他') && (
            <div style={{marginBottom:12}}>
              <label style={{fontSize:13, color:'#666', display:'block', marginBottom:4}}>その他の症状を入力</label>
              <input value={form.symptomsOther} onChange={e => set('symptomsOther', e.target.value)} placeholder="例: 口内炎が頻繁に出る" />
            </div>
          )}
          <div style={{display:'flex', gap:8}}>
            <button style={{...s.btnBack, flex:1}} onClick={() => setStep(3)}>戻る</button>
            <button style={{...s.btn, flex:2, marginTop:8}} onClick={next4}>次へ</button>
          </div>
        </>}

        {/* STEP 5: 確認 */}
        {step === 5 && targets && <>
          <div style={s.title}>設定完了</div>
          <div style={s.sub}>ステップ {totalSteps} / {totalSteps} — 内容を確認してください</div>
          {[
            ['ニックネーム', form.nickname],
            ['性別・年齢', (form.gender==='male'?'男性':'女性') + ' / ' + form.age + '歳'],
            ['身長・体重', form.height + 'cm / ' + form.weight + 'kg (BMI ' + bmi + ')'],
            ['目標', form.goals.map(g => GOALS.find(x=>x.id===g)?.icon + ' ' + GOALS.find(x=>x.id===g)?.label).join('　')],
            ...(form.symptoms.length > 0 ? [['症状', form.symptoms.join('・')]] : []),
          ].map(([k,v]) => <div key={k} style={s.row}><span style={{color:'#888'}}>{k}</span><span style={{fontWeight:600, fontSize:12}}>{v}</span></div>)}
          <div style={s.calBox}>
            <div style={{fontSize:12, color:'#639922'}}>1日の目標カロリー</div>
            <div style={{fontSize:36, fontWeight:700, color:'#3B6D11'}}>{targets.targetCal} <span style={{fontSize:18}}>kcal</span></div>
            <div style={{fontSize:12, color:'#3B6D11', marginTop:4}}>維持カロリー {targets.tdee} kcal</div>
          </div>
          <div style={s.pfcGrid}>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#185FA5'}}>{targets.pfcP}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>たんぱく質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#BA7517'}}>{targets.pfcF}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>脂質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#3B6D11'}}>{targets.pfcC}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>炭水化物 g</div></div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button style={{...s.btnBack, flex:1}} onClick={() => setStep(form.goals.includes('condition') ? 4 : 3)}>戻る</button>
            <button style={{...s.btn, flex:2, opacity: saving?0.6:1}} onClick={save} disabled={saving}>{saving ? '保存中...' : 'アプリを開始'}</button>
          </div>
        </>}
      </div>
    </div>
  )

  function symptomBtn(sel) {
    return { padding:'6px 12px', borderRadius:20, fontSize:13, cursor:'pointer', border: sel ? '2px solid #185FA5' : '1px solid #ddd', background: sel ? '#E6F1FB' : '#f8f8f8', color: sel ? '#185FA5' : '#555', fontWeight: sel ? 600 : 400 }
  }
}
