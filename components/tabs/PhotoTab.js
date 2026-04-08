import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const MEALS = [
  { id:'breakfast', label:'朝食', icon:'🌅' },
  { id:'lunch',     label:'昼食', icon:'☀️' },
  { id:'dinner',    label:'夕食', icon:'🌙' },
]

const TIPS = [
  { icon:'🏪', title:'コンビニ商品', desc:'パッケージのラベルが写るように撮ると正確に読み取れます' },
  { icon:'🍔', title:'チェーン店',   desc:'メモ欄に「マクドナルド ビッグマックセット」と書くと公式値を使用します' },
  { icon:'🍱', title:'定食・弁当',   desc:'全品が1枚に収まるよう引いて撮影してください' },
  { icon:'📝', title:'テキストだけでもOK', desc:'メモ欄に「吉野家 牛丼並盛」と入力するだけで分析できます' },
]

// 不足栄養素と料理提案カード
function FoodSuggestions({ suggestions }) {
  const [openIdx, setOpenIdx] = useState(0) // 最初の1件はデフォルト展開

  if (!suggestions || suggestions.length === 0) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🍽️</span> 次の食事で補いたい栄養素と料理
      </div>

      {suggestions.map((s, si) => (
        <div key={si} style={{ border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
          {/* ヘッダー（タップで開閉） */}
          <button
            onClick={() => setOpenIdx(openIdx === si ? -1 : si)}
            style={{
              width: '100%', background: openIdx === si ? '#1a1a2e' : '#f8f8f8',
              border: 'none', padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{s.nutrient_icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: openIdx === si ? '#e8c97e' : '#1a1a2e' }}>
                  {s.nutrient_name}が不足
                </div>
                <div style={{ fontSize: 11, color: openIdx === si ? 'rgba(232,201,126,0.8)' : '#888', marginTop: 1 }}>
                  {s.reason}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: openIdx === si ? '#e8c97e' : '#aaa', flexShrink: 0 }}>
              {openIdx === si ? '▲' : '▼'}
            </span>
          </button>

          {/* 食材・料理リスト */}
          {openIdx === si && (
            <div style={{ padding: '10px 12px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(s.foods || []).map((food, fi) => (
                <div key={fi} style={{ background: '#f8f8f8', borderRadius: 10, padding: '10px 12px' }}>
                  {/* 食材名 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                      🥘 {food.food_name}
                    </span>
                    <span style={{ fontSize: 11, color: '#888', background: '#e8e8e8', padding: '2px 8px', borderRadius: 20 }}>
                      {food.amount}
                    </span>
                  </div>

                  {/* 料理リスト */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(food.dishes || []).map((dish, di) => (
                      <div key={di} style={{
                        background: '#fff', borderRadius: 8, padding: '8px 10px',
                        borderLeft: '3px solid #e8c97e',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 3 }}>
                          🍴 {dish.dish_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                          💡 {dish.tip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function PhotoTab({ profile, onRecord }) {
  const [activeMeal, setActiveMeal] = useState('breakfast')
  const [mealData, setMealData] = useState({
    breakfast: { images: [], note: '', symptoms: '' },
    lunch:     { images: [], note: '', symptoms: '' },
    dinner:    { images: [], note: '', symptoms: '' },
  })
  const [analyzing, setAnalyzing] = useState(null)
  const [results, setResults] = useState({})
  const [showTips, setShowTips] = useState(false)
  const fileRefs = { breakfast: useRef(), lunch: useRef(), dinner: useRef() }

  function handleFiles(mealId, e) {
    const files = Array.from(e.target.files)
    const current = mealData[mealId].images
    if (current.length + files.length > 10) {
      alert('1食につき最大10枚までです')
      return
    }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setMealData(prev => ({
          ...prev,
          [mealId]: {
            ...prev[mealId],
            images: [...prev[mealId].images, { dataUrl: ev.target.result, base64: ev.target.result.split(',')[1] }]
          }
        }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImage(mealId, idx) {
    setMealData(prev => ({
      ...prev,
      [mealId]: { ...prev[mealId], images: prev[mealId].images.filter((_, i) => i !== idx) }
    }))
  }

  function updateField(mealId, field, value) {
    setMealData(prev => ({ ...prev, [mealId]: { ...prev[mealId], [field]: value } }))
  }

  async function analyzeMeal(mealId) {
    const meal = mealData[mealId]
    if (meal.images.length === 0 && !meal.note) return
    setAnalyzing(mealId)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: meal.images.map(img => img.base64),
          note: meal.note,
          symptoms: meal.symptoms,
          mealType: MEALS.find(m => m.id === mealId)?.label,
          profile,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await supabase.from('meal_records').insert({
        user_id: profile.id,
        meal_name: data.meal_name,
        meal_type: mealId,
        total_cal: data.total_cal,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        vitamins: data.vitamins,
        minerals: data.minerals,
        advice: data.advice,
        note: meal.note,
        symptoms: meal.symptoms,
        recorded_at: new Date().toISOString(),
      })
      onRecord(data)
      setResults(prev => ({ ...prev, [mealId]: data }))
    } catch(e) {
      alert('分析に失敗しました。もう一度お試しください。')
    }
    setAnalyzing(null)
  }

  const s = {
    card: { background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 },
    mealTabs: { display:'flex', gap:6, marginBottom:12 },
    mealTab: (active) => ({ flex:1, padding:'8px 4px', borderRadius:10, border: active ? '2px solid #1a1a2e' : '1px solid #ddd', background: active ? '#1a1a2e' : '#f8f8f8', color: active ? '#e8c97e' : '#555', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center' }),
    imgGrid: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:10 },
    imgThumb: { position:'relative', paddingTop:'100%', borderRadius:8, overflow:'hidden', background:'#f0f0f0' },
    addBox: { border:'2px dashed #ddd', borderRadius:8, paddingTop:'100%', position:'relative', cursor:'pointer', background:'#fafafa' },
    addInner: { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 },
    removeBtn: { position:'absolute', top:4, right:4, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:'50%', width:22, height:22, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    analyzeBtn: (disabled) => ({ width:'100%', background: disabled ? '#ccc' : '#1a1a2e', color: disabled ? '#fff' : '#e8c97e', border:'none', borderRadius:12, padding:13, fontSize:14, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer', marginTop:8 }),
    resultBox: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:12, padding:'1rem', marginTop:10 },
    pfcRow: { display:'flex', gap:8, marginTop:8 },
    pfcCard: { flex:1, background:'#fff', borderRadius:8, padding:'6px', textAlign:'center' },
    adviceBox: { background:'#f8f8f8', borderLeft:'3px solid #1a1a2e', borderRadius:'0 8px 8px 0', padding:'10px 12px', fontSize:13, lineHeight:1.7, marginTop:10 },
    secTitle: { fontSize:12, color:'#888', fontWeight:600, margin:'12px 0 6px' },
    nutriRow: { display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f5f5f5', fontSize:12 },
    barWrap: { width:80, height:3, background:'#eee', borderRadius:2, overflow:'hidden', marginTop:2 },
  }

  const activeMealData = mealData[activeMeal]
  const activeResult = results[activeMeal]
  const isAnalyzing = analyzing === activeMeal
  const canAnalyze = activeMealData.images.length > 0 || activeMealData.note.trim().length > 0

  return (
    <div style={s.card}>
      {/* 朝・昼・夜タブ */}
      <div style={s.mealTabs}>
        {MEALS.map(m => (
          <div key={m.id} style={s.mealTab(activeMeal === m.id)} onClick={() => setActiveMeal(m.id)}>
            <div style={{fontSize:18}}>{m.icon}</div>
            <div>{m.label}</div>
            {results[m.id] && <div style={{fontSize:10, marginTop:2}}>{results[m.id].total_cal}kcal ✓</div>}
          </div>
        ))}
      </div>

      {/* 画像グリッド */}
      <div style={s.secTitle}>写真（最大10枚）</div>
      <div style={s.imgGrid}>
        {activeMealData.images.map((img, idx) => (
          <div key={idx} style={s.imgThumb}>
            <img src={img.dataUrl} style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}} />
            <button style={s.removeBtn} onClick={() => removeImage(activeMeal, idx)}>×</button>
          </div>
        ))}
        {activeMealData.images.length < 10 && (
          <div style={s.addBox} onClick={() => fileRefs[activeMeal].current?.click()}>
            <div style={s.addInner}>
              <span style={{fontSize:24}}>📷</span>
              <span style={{fontSize:10, color:'#aaa'}}>追加</span>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRefs[activeMeal]} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e => handleFiles(activeMeal, e)} />

      {/* メモ */}
      <div style={s.secTitle}>食事メモ（任意）</div>
      <textarea
        value={activeMealData.note}
        onChange={e => updateField(activeMeal, 'note', e.target.value)}
        placeholder={'例: 「セブン サラダチキン＋おにぎり鮭」\n例: 「マクドナルド ビッグマックセットMサイズ」'}
        style={{height:72, width:'100%', borderRadius:10, border:'1px solid #ddd', padding:'8px', fontSize:13, fontFamily:'inherit', resize:'none'}}
      />

      {/* 体調・症状 */}
      <div style={s.secTitle}>体調・症状（任意）</div>
      <textarea
        value={activeMealData.symptoms}
        onChange={e => updateField(activeMeal, 'symptoms', e.target.value)}
        placeholder={'例: 「今日は胃もたれがある」\n例: 「便秘3日目、お腹が張っている」\n例: 「特になし」'}
        style={{height:60, width:'100%', borderRadius:10, border:'1px solid #ddd', padding:'8px', fontSize:13, fontFamily:'inherit', resize:'none'}}
      />

      {/* 分析ボタン */}
      {isAnalyzing
        ? <div style={{textAlign:'center', padding:'1rem 0'}}>
            <div style={{width:28, height:28, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px'}} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{color:'#888', fontSize:13}}>栄養データベースを参照中...</p>
          </div>
        : <button style={s.analyzeBtn(!canAnalyze)} onClick={() => analyzeMeal(activeMeal)} disabled={!canAnalyze}>
            AI栄養分析を開始
          </button>
      }

      {/* 分析結果 */}
      {activeResult && !isAnalyzing && (
        <div style={s.resultBox}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontSize:14, fontWeight:700}}>{activeResult.meal_name}</div>
            <span style={{fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600, background: activeResult.confidence==='high'?'#EAF3DE':'#FAEEDA', color: activeResult.confidence==='high'?'#3B6D11':'#854F0B'}}>
              {activeResult.confidence === 'high' ? '高精度' : activeResult.confidence === 'medium' ? '中精度' : '推定値'}
            </span>
          </div>
          <div style={{textAlign:'center', padding:'8px 0'}}>
            <div style={{fontSize:36, fontWeight:700}}>{activeResult.total_cal}</div>
            <div style={{fontSize:12, color:'#888'}}>kcal</div>
          </div>
          <div style={s.pfcRow}>
            <div style={s.pfcCard}><div style={{fontSize:18, fontWeight:700, color:'#185FA5'}}>{activeResult.protein}</div><div style={{fontSize:10, color:'#888'}}>たんぱく質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:18, fontWeight:700, color:'#BA7517'}}>{activeResult.fat}</div><div style={{fontSize:10, color:'#888'}}>脂質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:18, fontWeight:700, color:'#3B6D11'}}>{activeResult.carbs}</div><div style={{fontSize:10, color:'#888'}}>炭水化物 g</div></div>
          </div>

          {/* ビタミン・ミネラル */}
          <div style={{...s.secTitle, color:'#555'}}>ビタミン</div>
          {Object.entries(activeResult.vitamins).map(([name, v]) => (
            <div key={name} style={s.nutriRow}>
              <div><div>ビタミン {name}</div><div style={s.barWrap}><div style={{height:'100%', background: v.rda_pct>=80?'#3B6D11':'#378ADD', width:Math.min(100,v.rda_pct)+'%', borderRadius:2}} /></div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:600}}>{v.amount} {v.unit}</div><div style={{color:'#aaa', fontSize:11}}>{v.rda_pct}%</div></div>
            </div>
          ))}
          <div style={{...s.secTitle, color:'#555'}}>ミネラル</div>
          {Object.entries(activeResult.minerals).map(([name, v]) => (
            <div key={name} style={s.nutriRow}>
              <div><div>{name}</div><div style={s.barWrap}><div style={{height:'100%', background: v.rda_pct>=80?'#3B6D11':'#378ADD', width:Math.min(100,v.rda_pct)+'%', borderRadius:2}} /></div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:600}}>{v.amount} {v.unit}</div><div style={{color:'#aaa', fontSize:11}}>{v.rda_pct}%</div></div>
            </div>
          ))}

          {/* AIアドバイス */}
          <div style={s.adviceBox}>{activeResult.advice}</div>

          {/* ★ 新機能：不足栄養素と食材・料理の提案 */}
          <FoodSuggestions suggestions={activeResult.food_suggestions} />
        </div>
      )}

      {/* 精度アップのコツ */}
      <div style={{marginTop:12}}>
        <button onClick={() => setShowTips(!showTips)} style={{background:'none', border:'none', fontSize:12, color:'#888', cursor:'pointer', padding:0}}>
          {showTips ? '▲' : '▼'} 精度を上げるコツ
        </button>
        {showTips && (
          <div style={{marginTop:8, background:'#f8f8f8', borderRadius:10, padding:'0.75rem'}}>
            {TIPS.map((t, i) => (
              <div key={i} style={{display:'flex', gap:10, padding:'6px 0', borderBottom: i<TIPS.length-1?'1px solid #eee':'none'}}>
                <span style={{fontSize:18, flexShrink:0}}>{t.icon}</span>
                <div><div style={{fontSize:12, fontWeight:600}}>{t.title}</div><div style={{fontSize:12, color:'#666', lineHeight:1.6}}>{t.desc}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
