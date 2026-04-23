import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const MEALS = [
  { id:'breakfast', label:'朝食', icon:'🌅', defaultTime:'08:00' },
  { id:'lunch',     label:'昼食', icon:'☀️', defaultTime:'12:00' },
  { id:'dinner',    label:'夕食', icon:'🌙', defaultTime:'19:00' },
  { id:'snack',     label:'間食', icon:'🍪', defaultTime:'15:00' },
]

const TIPS = [
  { icon:'🍽️', title:'食器を一緒に写す（最重要）', desc:'お皿・茶碗・丼など食器が写っていると量の推定精度が大幅に上がります。' },
  { icon:'📐', title:'斜め45度から撮る', desc:'真上より斜め45度からの撮影が最も精度が高いです。食材の厚みも見えます。' },
  { icon:'✋', title:'手・箸を添える', desc:'手や箸を横に置くとサイズ基準になり量の推定がより正確になります。' },
  { icon:'📝', title:'量をメモに書く', desc:'「ご飯200g」「鶏むね肉150g」とメモに書くと写真より高精度になります。' },
  { icon:'🏪', title:'コンビニ・チェーン店', desc:'店名と商品名をメモに書くと公式の栄養成分値を優先して使用します。' },
]

const MAX_IMAGES = 3

// ─── 画像圧縮（Canvas API・外部依存なし）───
const MAX_LONG_SIDE = 1280
const JPEG_QUALITY  = 0.78

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|gif)$/i)) {
      reject(new Error('非対応の画像形式です。JPEG / PNG / WebP をご使用ください。'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('画像のデコードに失敗しました。'))
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_LONG_SIDE || height > MAX_LONG_SIDE) {
          if (width >= height) { height = Math.round(height * MAX_LONG_SIDE / width); width = MAX_LONG_SIDE }
          else { width = Math.round(width * MAX_LONG_SIDE / height); height = MAX_LONG_SIDE }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve({ dataUrl, base64: dataUrl.split(',')[1] })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// JST基準の日付
function getJstDateString() {
  return new Date(Date.now() + 9*60*60*1000).toISOString().slice(0,10)
}
function buildRecordedAt(timeStr) {
  if (!timeStr) return new Date().toISOString()
  return `${getJstDateString()}T${timeStr}:00+09:00`
}
function nowTime() {
  const n = new Date()
  return n.getHours().toString().padStart(2,'0') + ':' + n.getMinutes().toString().padStart(2,'0')
}

// ─── レシピモーダル ───
function RecipeModal({ dish, onClose }) {
  if (!dish) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'85vh', overflowY:'auto', padding:'20px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>🍴 {dish.dish_name}</div>
            {dish.calories_approx && <div style={{ fontSize:12, color:'#888', marginTop:3 }}>{dish.calories_approx}</div>}
          </div>
          <button onClick={onClose} style={{ background:'#f0f0f0', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
        {dish.goal_fit && (
          <div style={{ background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:10, padding:'8px 12px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#3B6D11', marginBottom:2 }}>✅ あなたの目標との相性</div>
            <div style={{ fontSize:12, color:'#3B6D11', lineHeight:1.6 }}>{dish.goal_fit}</div>
          </div>
        )}
        {dish.tip && (
          <div style={{ background:'#f8f8f8', borderLeft:'3px solid #e8c97e', borderRadius:'0 8px 8px 0', padding:'8px 12px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#B45309', marginBottom:2 }}>💡 ポイント</div>
            <div style={{ fontSize:12, color:'#555', lineHeight:1.6 }}>{dish.tip}</div>
          </div>
        )}
        {dish.recipe_steps && dish.recipe_steps.length > 0 && (
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:10 }}>📋 作り方</div>
            {dish.recipe_steps.map((step, i) => (
              <div key={i} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#1a1a2e', color:'#e8c97e', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.7, flex:1 }}>{step}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ width:'100%', background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:12, padding:12, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:10 }}>閉じる</button>
      </div>
    </div>
  )
}

// ─── 不足栄養素と料理提案 ───
function FoodSuggestions({ suggestions }) {
  const [openIdx, setOpenIdx]   = useState(0)
  const [recipeModal, setRecipeModal] = useState(null)
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div style={{ marginTop:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        <span>🍽️</span> 次の食事で補いたい栄養素と料理
      </div>
      {suggestions.map((s, si) => (
        <div key={si} style={{ border:'1px solid #e8e8e8', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
          <button onClick={() => setOpenIdx(openIdx === si ? -1 : si)}
            style={{ width:'100%', background: openIdx===si?'#1a1a2e':'#f8f8f8', border:'none', padding:'10px 12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:22 }}>{s.nutrient_icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color: openIdx===si?'#e8c97e':'#1a1a2e' }}>{s.nutrient_name}が不足</div>
                <div style={{ fontSize:11, color: openIdx===si?'rgba(232,201,126,0.8)':'#888', marginTop:1 }}>{s.reason}</div>
              </div>
            </div>
            <span style={{ fontSize:12, color: openIdx===si?'#e8c97e':'#aaa', flexShrink:0 }}>{openIdx===si?'▲':'▼'}</span>
          </button>
          {openIdx === si && (
            <div style={{ padding:'10px 12px', background:'#fff', display:'flex', flexDirection:'column', gap:10 }}>
              {(s.foods || []).map((food, fi) => (
                <div key={fi} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>🥘 {food.food_name}</span>
                    <span style={{ fontSize:11, color:'#888', background:'#e8e8e8', padding:'2px 8px', borderRadius:20 }}>{food.amount}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {(food.dishes || []).map((dish, di) => (
                      <div key={di} style={{ background:'#fff', borderRadius:8, padding:'8px 10px', borderLeft:'3px solid #e8c97e' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>🍴 {dish.dish_name}</div>
                          {dish.recipe_steps && dish.recipe_steps.length > 0 && (
                            <button onClick={() => setRecipeModal(dish)}
                              style={{ background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0, marginLeft:6 }}>
                              レシピ
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:'#666', lineHeight:1.6 }}>💡 {dish.tip}</div>
                        {dish.calories_approx && <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>📊 {dish.calories_approx}</div>}
                        {dish.goal_fit && <div style={{ fontSize:10, color:'#3B6D11', marginTop:2 }}>✅ {dish.goal_fit}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {recipeModal && <RecipeModal dish={recipeModal} onClose={() => setRecipeModal(null)} />}
    </div>
  )
}

// ─── 1食分の入力フォーム ───
function MealForm({ mealId, mealLabel, mealIcon, data, onUpdate, onAddImage, fileRef, onRemoveImage }) {
  const s = {
    imgGrid:  { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:6 },
    imgThumb: { position:'relative', paddingTop:'100%', borderRadius:8, overflow:'hidden', background:'#f0f0f0' },
    addBox:   { border:'2px dashed #ddd', borderRadius:8, paddingTop:'100%', position:'relative', cursor:'pointer', background:'#fafafa' },
    addInner: { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 },
    removeBtn:{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    secTitle: { fontSize:11, color:'#888', fontWeight:600, margin:'8px 0 4px' },
  }
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px', marginBottom:10 }}>
      {/* ヘッダー */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ fontSize:22 }}>{mealIcon}</span>
        <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{mealLabel}</span>
        <input
          type="time"
          value={data.eaten_at}
          onChange={e => onUpdate('eaten_at', e.target.value)}
          style={{ marginLeft:'auto', borderRadius:8, border:'1px solid #ddd', padding:'5px 8px', fontSize:12, color:'#555' }}
        />
      </div>

      {/* 写真 */}
      <div style={s.imgGrid}>
        {data.images.map((img, idx) => (
          <div key={idx} style={s.imgThumb}>
            <img src={img.dataUrl} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            <button style={s.removeBtn} onClick={() => onRemoveImage(idx)}>×</button>
          </div>
        ))}
        {data.images.length < MAX_IMAGES && (
          <div style={s.addBox} onClick={() => fileRef.current?.click()}>
            <div style={s.addInner}>
              <span style={{ fontSize:20 }}>📷</span>
              <span style={{ fontSize:9, color:'#aaa' }}>写真追加</span>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple style={{ display:'none' }} onChange={onAddImage} />

      {/* メモ */}
      <div style={s.secTitle}>食事メモ（任意）</div>
      <textarea
        value={data.note}
        onChange={e => onUpdate('note', e.target.value)}
        placeholder={'例: セブン サラダチキン＋おにぎり鮭\n例: マクドナルド ビッグマックセットM'}
        style={{ height:60, width:'100%', borderRadius:8, border:'1px solid #ddd', padding:'7px', fontSize:12, fontFamily:'inherit', resize:'none', boxSizing:'border-box' }}
      />

      {/* 体調 */}
      <div style={s.secTitle}>体調・症状（任意）</div>
      <textarea
        value={data.symptoms}
        onChange={e => onUpdate('symptoms', e.target.value)}
        placeholder={'例: 胃もたれがある / 特になし'}
        style={{ height:44, width:'100%', borderRadius:8, border:'1px solid #ddd', padding:'7px', fontSize:12, fontFamily:'inherit', resize:'none', boxSizing:'border-box' }}
      />
    </div>
  )
}

// ─── 分析結果表示 ───
function AnalysisResult({ result, mealLabel }) {
  const s = {
    resultBox: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:12, padding:'1rem', marginTop:10 },
    pfcRow:    { display:'flex', gap:8, marginTop:8 },
    pfcCard:   { flex:1, background:'#fff', borderRadius:8, padding:'6px', textAlign:'center' },
    adviceBox: { background:'#f8f8f8', borderLeft:'3px solid #1a1a2e', borderRadius:'0 8px 8px 0', padding:'10px 12px', fontSize:13, lineHeight:1.7, marginTop:10 },
    secTitle:  { fontSize:12, color:'#888', fontWeight:600, margin:'12px 0 6px' },
    nutriRow:  { display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f5f5f5', fontSize:12 },
    barWrap:   { width:80, height:3, background:'#eee', borderRadius:2, overflow:'hidden', marginTop:2 },
  }
  if (!result) return null
  return (
    <div style={s.resultBox}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, fontWeight:700 }}>{result.meal_name}</div>
        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
          background: result.confidence==='high'?'#EAF3DE':'#FAEEDA',
          color:      result.confidence==='high'?'#3B6D11':'#854F0B' }}>
          {result.confidence === 'high' ? '高精度' : result.confidence === 'medium' ? '中精度' : '推定値'}
        </span>
      </div>
      <div style={{ textAlign:'center', padding:'8px 0' }}>
        <div style={{ fontSize:36, fontWeight:700 }}>{result.total_cal}</div>
        <div style={{ fontSize:12, color:'#888' }}>kcal</div>
      </div>
      <div style={s.pfcRow}>
        <div style={s.pfcCard}><div style={{ fontSize:18, fontWeight:700, color:'#185FA5' }}>{result.protein}</div><div style={{ fontSize:10, color:'#888' }}>たんぱく質 g</div></div>
        <div style={s.pfcCard}><div style={{ fontSize:18, fontWeight:700, color:'#BA7517' }}>{result.fat}</div><div style={{ fontSize:10, color:'#888' }}>脂質 g</div></div>
        <div style={s.pfcCard}><div style={{ fontSize:18, fontWeight:700, color:'#3B6D11' }}>{result.carbs}</div><div style={{ fontSize:10, color:'#888' }}>炭水化物 g</div></div>
      </div>
      <div style={{ ...s.secTitle, color:'#555' }}>ビタミン</div>
      {Object.entries(result.vitamins || {}).map(([name, v]) => (
        <div key={name} style={s.nutriRow}>
          <div><div>ビタミン {name}</div><div style={s.barWrap}><div style={{ height:'100%', background: v.rda_pct>=80?'#3B6D11':'#378ADD', width:Math.min(100,v.rda_pct)+'%', borderRadius:2 }} /></div></div>
          <div style={{ textAlign:'right' }}><div style={{ fontWeight:600 }}>{v.amount} {v.unit}</div><div style={{ color:'#aaa', fontSize:11 }}>{v.rda_pct}%</div></div>
        </div>
      ))}
      <div style={{ ...s.secTitle, color:'#555' }}>ミネラル</div>
      {Object.entries(result.minerals || {}).map(([name, v]) => (
        <div key={name} style={s.nutriRow}>
          <div><div>{name}</div><div style={s.barWrap}><div style={{ height:'100%', background: v.rda_pct>=80?'#3B6D11':'#378ADD', width:Math.min(100,v.rda_pct)+'%', borderRadius:2 }} /></div></div>
          <div style={{ textAlign:'right' }}><div style={{ fontWeight:600 }}>{v.amount} {v.unit}</div><div style={{ color:'#aaa', fontSize:11 }}>{v.rda_pct}%</div></div>
        </div>
      ))}
      <div style={s.adviceBox}>{result.advice}</div>
      {result.public_nutrition_tip && (
        <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'10px 12px', marginTop:10, display:'flex', gap:8, alignItems:'flex-start' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>📚</span>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#1E40AF', marginBottom:2 }}>食育ワンポイント</div>
            <div style={{ fontSize:12, color:'#1D4ED8', lineHeight:1.6 }}>{result.public_nutrition_tip}</div>
          </div>
        </div>
      )}
      <FoodSuggestions suggestions={result.food_suggestions} />
    </div>
  )
}

// ─── メインコンポーネント ───
export default function PhotoTab({ profile, onRecord }) {
  // モード: 'single'=1食ずつ / 'batch'=まとめて入力
  const [mode, setMode] = useState('single')
  const [activeMeal, setActiveMeal] = useState('breakfast')

  const initMealData = () => ({
    breakfast: { images:[], note:'', symptoms:'', eaten_at:'08:00' },
    lunch:     { images:[], note:'', symptoms:'', eaten_at:'12:00' },
    dinner:    { images:[], note:'', symptoms:'', eaten_at:'19:00' },
    snack:     { images:[], note:'', symptoms:'', eaten_at:'15:00' },
  })
  const [mealData, setMealData]   = useState(initMealData)
  const [analyzing, setAnalyzing] = useState(null)   // null | mealId | 'all'
  const [results,   setResults]   = useState({})
  const [errorMsg,  setErrorMsg]  = useState(null)
  const [showTips,  setShowTips]  = useState(false)

  const fileRefs = {
    breakfast: useRef(), lunch: useRef(), dinner: useRef(), snack: useRef()
  }

  // ─── 画像追加（圧縮付き）───
  async function handleFiles(mealId, e) {
    const files   = Array.from(e.target.files)
    const current = mealData[mealId].images
    setErrorMsg(null)
    if (current.length >= MAX_IMAGES) {
      setErrorMsg(`写真は1食につき最大${MAX_IMAGES}枚までです`)
      e.target.value = ''; return
    }
    const remaining = MAX_IMAGES - current.length
    const toProcess = files.slice(0, remaining)
    if (files.length > remaining) {
      setErrorMsg(`${files.length}枚選択されましたが、あと${remaining}枚しか追加できません。先頭${remaining}枚を追加します。`)
    }
    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file)
        setMealData(prev => ({ ...prev, [mealId]: { ...prev[mealId], images: [...prev[mealId].images, compressed] } }))
      } catch (err) { setErrorMsg(err.message) }
    }
    e.target.value = ''
  }

  function removeImage(mealId, idx) {
    setMealData(prev => ({ ...prev, [mealId]: { ...prev[mealId], images: prev[mealId].images.filter((_,i)=>i!==idx) } }))
  }
  function updateField(mealId, field, value) {
    setMealData(prev => ({ ...prev, [mealId]: { ...prev[mealId], [field]: value } }))
  }

  // ─── 1食分を分析してSupabaseに保存 ───
  async function analyzeSingle(mealId) {
    const meal = mealData[mealId]
    if (meal.images.length === 0 && !meal.note.trim()) return null  // スキップ

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images:   meal.images.map(img => img.base64),
        note:     meal.note,
        symptoms: meal.symptoms,
        mealType: MEALS.find(m => m.id === mealId)?.label,
        mealTime: meal.eaten_at || nowTime(),
        profile,
      }),
    })
    const text = await res.text()
    const data = JSON.parse(text)
    if (!res.ok || data.error) throw new Error(data.error || `APIエラー (${res.status})`)

    // Supabase保存（food_suggestionsカラムありで試み、なければなしで再試行）
    let inserted = null
    try {
      const baseRecord = {
        user_id:          profile.id,
        meal_name:        data.meal_name        || '食事記録',
        meal_type:        mealId,
        total_cal:        data.total_cal        || 0,
        protein:          data.protein          || 0,
        fat:              data.fat              || 0,
        carbs:            data.carbs            || 0,
        vitamins:         data.vitamins         || {},
        minerals:         data.minerals         || {},
        advice:           data.advice           || '',
        note:             meal.note             || '',
        symptoms:         meal.symptoms         || '',
        recorded_at:      buildRecordedAt(meal.eaten_at),
      }
      // food_suggestionsカラムありで試みる
      const { data: ins1, error: err1 } = await supabase
        .from('meal_records')
        .insert({ ...baseRecord, food_suggestions: data.food_suggestions || [] })
        .select().single()
      if (!err1) {
        inserted = ins1
      } else {
        console.warn('food_suggestions付きinsert失敗、カラムなしで再試行:', err1.message)
        // food_suggestionsなしで再試行（カラムが未作成の場合の互換性）
        const { data: ins2, error: err2 } = await supabase
          .from('meal_records')
          .insert(baseRecord)
          .select().single()
        if (!err2) { inserted = ins2 }
        else { console.error('DB save error:', err2.message) }
      }
    } catch (dbErr) { console.error('DB save failed:', dbErr.message) }
    onRecord(inserted || data)  // DB保存の成否にかかわらずonRecordを呼ぶ

    return data
  }

  // 指定したmealのフォームをリセット（分析完了後に呼ぶ）
  function resetMeal(mealId) {
    const defaultTime = MEALS.find(m => m.id === mealId)?.defaultTime || '12:00'
    setMealData(prev => ({
      ...prev,
      [mealId]: { images: [], note: '', symptoms: '', eaten_at: defaultTime }
    }))
  }

  // ─── 個別分析（1食のみ）───
  async function analyzeOne(mealId) {
    setErrorMsg(null)
    const meal = mealData[mealId]
    if (meal.images.length === 0 && !meal.note.trim()) {
      setErrorMsg('写真を撮るか、食事メモを入力してください'); return
    }
    setAnalyzing(mealId)
    try {
      const data = await analyzeSingle(mealId)
      if (data) {
        setResults(prev => ({ ...prev, [mealId]: data }))
        resetMeal(mealId)  // 分析完了後にフォームをリセットして二重送信防止
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('AI分析に失敗しました：' + e.message)
    }
    setAnalyzing(null)
  }

  // ─── 一括分析（入力済みの全食事）───
  async function analyzeAll() {
    setErrorMsg(null)
    const targets = MEALS.filter(m => {
      const d = mealData[m.id]
      return d.images.length > 0 || d.note.trim().length > 0
    })
    if (targets.length === 0) {
      setErrorMsg('少なくとも1食分の写真またはメモを入力してください'); return
    }
    setAnalyzing('all')
    const newResults = { ...results }
    for (const meal of targets) {
      try {
        const data = await analyzeSingle(meal.id)
        if (data) {
          newResults[meal.id] = data
          resetMeal(meal.id)  // 分析完了後にフォームをリセットして二重送信防止
        }
      } catch (e) {
        console.error(`${meal.label}の分析失敗:`, e.message)
        setErrorMsg(`${meal.label}の分析に失敗しました：${e.message}`)
      }
    }
    setResults(newResults)
    setAnalyzing(null)
  }

  // ─── 入力済み食事の判定 ───
  const hasInput = (mealId) => {
    const d = mealData[mealId]
    return d.images.length > 0 || d.note.trim().length > 0
  }
  const inputCount = MEALS.filter(m => hasInput(m.id)).length

  const isAnalyzingAll = analyzing === 'all'

  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>

      {/* ─── モード切り替え ─── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, background:'#f0f0f0', borderRadius:12, padding:4 }}>
        <button
          onClick={() => { setMode('single'); setErrorMsg(null) }}
          style={{ flex:1, padding:'8px 4px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
            background: mode==='single' ? '#1a1a2e' : 'transparent',
            color:      mode==='single' ? '#e8c97e'  : '#666' }}>
          1食ずつ入力
        </button>
        <button
          onClick={() => { setMode('batch'); setErrorMsg(null) }}
          style={{ flex:1, padding:'8px 4px', borderRadius:9, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
            background: mode==='batch' ? '#1a1a2e' : 'transparent',
            color:      mode==='batch' ? '#e8c97e'  : '#666' }}>
          まとめて入力
        </button>
      </div>

      {/* ─── エラー表示 ─── */}
      {errorMsg && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 12px', marginBottom:10, display:'flex', alignItems:'flex-start', gap:8 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12, color:'#991B1B', lineHeight:1.6, flex:1 }}>{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} style={{ background:'none', border:'none', color:'#991B1B', cursor:'pointer', fontSize:14, flexShrink:0 }}>✕</button>
        </div>
      )}

      {/* ══════════════════════════════════════
          モード A: 1食ずつ入力
      ══════════════════════════════════════ */}
      {mode === 'single' && (
        <>
          {/* 食事タブ */}
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {MEALS.map(m => (
              <div key={m.id}
                onClick={() => { setActiveMeal(m.id); setErrorMsg(null) }}
                style={{ flex:1, padding:'8px 4px', borderRadius:10, border: activeMeal===m.id ? '2px solid #1a1a2e' : '1px solid #ddd',
                  background: activeMeal===m.id ? '#1a1a2e' : '#f8f8f8',
                  color:      activeMeal===m.id ? '#e8c97e'  : '#555',
                  fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:18 }}>{m.icon}</div>
                <div>{m.label}</div>
                {results[m.id] && <div style={{ fontSize:10, marginTop:2 }}>{results[m.id].total_cal}kcal ✓</div>}
              </div>
            ))}
          </div>

          {/* アクティブな食事の入力フォーム */}
          {MEALS.filter(m => m.id === activeMeal).map(m => (
            <MealForm
              key={m.id}
              mealId={m.id}
              mealLabel={m.label}
              mealIcon={m.icon}
              data={mealData[m.id]}
              onUpdate={(field, value) => updateField(m.id, field, value)}
              onAddImage={e => handleFiles(m.id, e)}
              fileRef={fileRefs[m.id]}
              onRemoveImage={idx => removeImage(m.id, idx)}
            />
          ))}

          {/* 分析ボタン */}
          {analyzing === activeMeal ? (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:28, height:28, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <p style={{ color:'#888', fontSize:13 }}>AI が栄養データを解析中...</p>
              <p style={{ color:'#aaa', fontSize:11 }}>10〜30秒かかる場合があります</p>
            </div>
          ) : (
            <button
              onClick={() => analyzeOne(activeMeal)}
              disabled={!hasInput(activeMeal) || analyzing !== null}
              style={{ width:'100%', background: hasInput(activeMeal) ? '#1a1a2e' : '#ccc', color: hasInput(activeMeal) ? '#e8c97e' : '#fff',
                border:'none', borderRadius:12, padding:13, fontSize:14, fontWeight:600, cursor: hasInput(activeMeal) ? 'pointer' : 'not-allowed', marginTop:4 }}>
              {hasInput(activeMeal) ? `${MEALS.find(m=>m.id===activeMeal)?.label}を分析する` : '写真またはメモを入力してください'}
            </button>
          )}

          {/* 分析結果 */}
          {results[activeMeal] && analyzing !== activeMeal && (
            <AnalysisResult result={results[activeMeal]} mealLabel={MEALS.find(m=>m.id===activeMeal)?.label} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          モード B: まとめて入力
      ══════════════════════════════════════ */}
      {mode === 'batch' && (
        <>
          <div style={{ fontSize:12, color:'#64748b', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>
            📝 朝食・昼食・夕食をまとめて入力して、一括で分析できます。<br />
            入力しない食事はスキップされます。
          </div>

          {/* 3食のフォームを縦に並べる */}
          {MEALS.map(m => (
            <div key={m.id}>
              <MealForm
                mealId={m.id}
                mealLabel={m.label}
                mealIcon={m.icon}
                data={mealData[m.id]}
                onUpdate={(field, value) => updateField(m.id, field, value)}
                onAddImage={e => handleFiles(m.id, e)}
                fileRef={fileRefs[m.id]}
                onRemoveImage={idx => removeImage(m.id, idx)}
              />
              {/* 各食事の個別結果（一括分析後に表示）*/}
              {results[m.id] && !isAnalyzingAll && (
                <AnalysisResult result={results[m.id]} mealLabel={m.label} />
              )}
            </div>
          ))}

          {/* 一括分析ボタン */}
          {isAnalyzingAll ? (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <div style={{ width:28, height:28, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <p style={{ color:'#888', fontSize:13 }}>入力済みの食事を順番に分析中...</p>
              <p style={{ color:'#aaa', fontSize:11 }}>食事の数によって30〜60秒かかる場合があります</p>
            </div>
          ) : (
            <button
              onClick={analyzeAll}
              disabled={inputCount === 0 || analyzing !== null}
              style={{ width:'100%', background: inputCount > 0 ? 'linear-gradient(135deg, #1a1a2e, #2d3a6e)' : '#ccc',
                color: inputCount > 0 ? '#e8c97e' : '#fff',
                border:'none', borderRadius:12, padding:14, fontSize:14, fontWeight:700,
                cursor: inputCount > 0 ? 'pointer' : 'not-allowed', marginTop:4 }}>
              {inputCount > 0
                ? `${inputCount}食まとめてAI分析する ✨`
                : '少なくとも1食分を入力してください'}
            </button>
          )}
        </>
      )}

      {/* 精度アップのコツ */}
      <div style={{ marginTop:14 }}>
        <button onClick={() => setShowTips(!showTips)} style={{ background:'none', border:'none', fontSize:12, color:'#888', cursor:'pointer', padding:0 }}>
          {showTips ? '▲' : '▼'} 精度を上げるコツ
        </button>
        {showTips && (
          <div style={{ marginTop:8, background:'#f8f8f8', borderRadius:10, padding:'0.75rem' }}>
            {TIPS.map((t, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom: i<TIPS.length-1?'1px solid #eee':'none' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{t.icon}</span>
                <div><div style={{ fontSize:12, fontWeight:600 }}>{t.title}</div><div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>{t.desc}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
