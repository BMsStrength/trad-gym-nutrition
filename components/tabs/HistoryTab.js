import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DailySummaryCard } from '../MainApp'

const MEAL_ICONS  = { breakfast:'🌅', lunch:'☀️', dinner:'🌙' }
const MEAL_LABELS = { breakfast:'朝食', lunch:'昼食', dinner:'夕食' }

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
            <div style={{ fontSize:11, fontWeight:700, color:'#3B6D11', marginBottom:2 }}>✅ 目標との相性</div>
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

// ─── 明日の食事提案カード ───
function TomorrowSuggestions({ suggestions }) {
  const [openIdx, setOpenIdx] = useState(0)
  const [recipeModal, setRecipeModal] = useState(null)
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div style={{ marginTop:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
        <span>🌅</span> 明日摂りたい栄養素と料理
      </div>
      {suggestions.map((s, si) => (
        <div key={si} style={{ border:'1px solid #e8e8e8', borderRadius:10, marginBottom:6, overflow:'hidden' }}>
          <button onClick={() => setOpenIdx(openIdx === si ? -1 : si)}
            style={{ width:'100%', background: openIdx===si?'#1a1a2e':'#f8f8f8', border:'none', padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>{s.nutrient_icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: openIdx===si?'#e8c97e':'#1a1a2e' }}>{s.nutrient_name}を補おう</div>
                <div style={{ fontSize:10, color: openIdx===si?'rgba(232,201,126,0.8)':'#888', marginTop:1 }}>{s.reason}</div>
              </div>
            </div>
            <span style={{ fontSize:11, color: openIdx===si?'#e8c97e':'#aaa', flexShrink:0 }}>{openIdx===si?'▲':'▼'}</span>
          </button>
          {openIdx === si && (
            <div style={{ padding:'8px 10px', background:'#fff', display:'flex', flexDirection:'column', gap:8 }}>
              {(s.foods || []).map((food, fi) => (
                <div key={fi} style={{ background:'#f8f8f8', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>🥘 {food.food_name}</span>
                    <span style={{ fontSize:10, color:'#888', background:'#e8e8e8', padding:'1px 6px', borderRadius:20 }}>{food.amount}</span>
                  </div>
                  {(food.dishes || []).map((dish, di) => (
                    <div key={di} style={{ background:'#fff', borderRadius:7, padding:'7px 9px', borderLeft:'3px solid #e8c97e', marginBottom: di < (food.dishes||[]).length-1 ? 5 : 0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>🍴 {dish.dish_name}</div>
                        {dish.recipe_steps && dish.recipe_steps.length > 0 && (
                          <button onClick={() => setRecipeModal(dish)}
                            style={{ background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:600, cursor:'pointer', flexShrink:0, marginLeft:6 }}>
                            レシピ
                          </button>
                        )}
                      </div>
                      {dish.tip && <div style={{ fontSize:10, color:'#666', lineHeight:1.5 }}>💡 {dish.tip}</div>}
                      {dish.calories_approx && <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>📊 {dish.calories_approx}</div>}
                      {dish.goal_fit && <div style={{ fontSize:10, color:'#3B6D11', marginTop:2 }}>✅ {dish.goal_fit}</div>}
                    </div>
                  ))}
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

// ─── 1日の総評カード ───
function DailyReviewCard({ records, profile, reviewDate }) {
  const [review,   setReview]   = useState(null)   // 保存済み or 生成後
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // マウント時に保存済み総評を取得
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('daily_reviews')
        .select('*')
        .eq('user_id', profile.id)
        .eq('review_date', reviewDate)
        .single()
      if (data) setReview(data)
    }
    if (profile?.id && reviewDate) load()
  }, [reviewDate, profile?.id])

  async function generate() {
    if (records.length === 0) { setError('食事記録がありません'); return }
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/daily-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, profile, targetDate: reviewDate }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'エラーが発生しました')

      // Supabaseに保存（upsert）
      const { data: saved } = await supabase
        .from('daily_reviews')
        .upsert({
          user_id:              profile.id,
          review_date:          reviewDate,
          review:               data.review,
          tomorrow_suggestions: data.tomorrow_suggestions || [],
        }, { onConflict: 'user_id,review_date' })
        .select()
        .single()

      setReview(saved || data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // スコアの色
  const scoreColor = !review ? '#888'
    : review.overall_score >= 80 ? '#3B6D11'
    : review.overall_score >= 60 ? '#BA7517'
    : '#A32D2D'

  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
      {/* ヘッダー */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>📊 1日の食事総評</div>
        {review && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:22, fontWeight:800, color: scoreColor }}>{review.overall_score}</div>
            <div style={{ fontSize:11, color: scoreColor, fontWeight:600 }}>{review.score_label || '点'}</div>
          </div>
        )}
      </div>

      {/* 総評文 */}
      {review?.review && (
        <div style={{ background:'#f8f8f8', borderLeft:'3px solid #1a1a2e', borderRadius:'0 8px 8px 0', padding:'10px 12px', fontSize:13, lineHeight:1.8, color:'#374151', marginBottom:14 }}>
          {review.review}
        </div>
      )}

      {/* 明日の食事提案 */}
      {review?.tomorrow_suggestions && (
        <TomorrowSuggestions suggestions={review.tomorrow_suggestions} />
      )}

      {/* エラー */}
      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#991B1B', marginBottom:10 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 生成ボタン */}
      {!review && !loading && (
        <button onClick={generate} disabled={records.length === 0}
          style={{ width:'100%', background: records.length === 0 ? '#ccc' : 'linear-gradient(135deg, #1a1a2e, #2d3a6e)', color:'#e8c97e', border:'none', borderRadius:12, padding:13, fontSize:14, fontWeight:600, cursor: records.length === 0 ? 'not-allowed' : 'pointer' }}>
          {records.length === 0 ? '食事を記録してから生成できます' : 'AIで1日の総評を生成する ✨'}
        </button>
      )}
      {loading && (
        <div style={{ textAlign:'center', padding:'12px 0' }}>
          <div style={{ width:24, height:24, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:'#888', fontSize:13 }}>1日の食事を分析中...</p>
        </div>
      )}
      {review && !loading && (
        <button onClick={generate}
          style={{ width:'100%', background:'none', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px', fontSize:12, color:'#94a3b8', cursor:'pointer', marginTop:10 }}>
          🔄 再生成する
        </button>
      )}
    </div>
  )
}

// ─── 食事詳細パネル ───
function MealDetail({ record, onClose }) {
  const [openIdx, setOpenIdx]         = useState(0)
  const [recipeModal, setRecipeModal] = useState(null)
  const suggestions = record.food_suggestions || []
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:14, marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>
          {MEAL_ICONS[record.meal_type] || '🍽️'} {record.meal_name}
        </div>
        <button onClick={onClose} style={{ background:'#e2e8f0', border:'none', borderRadius:20, padding:'2px 10px', fontSize:12, color:'#64748b', cursor:'pointer' }}>
          閉じる ▲
        </button>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[
          { label:'カロリー', val:`${record.total_cal}kcal`, color:'#f59e0b' },
          { label:'タンパク質', val:`${Math.round(record.protein||0)}g`, color:'#185FA5' },
          { label:'脂質', val:`${Math.round(record.fat||0)}g`, color:'#BA7517' },
          { label:'炭水化物', val:`${Math.round(record.carbs||0)}g`, color:'#3B6D11' },
        ].map(item => (
          <div key={item.label} style={{ flex:1, background:'#fff', borderRadius:8, padding:'6px 4px', textAlign:'center', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:700, color:item.color }}>{item.val}</div>
            <div style={{ fontSize:9, color:'#888', marginTop:1 }}>{item.label}</div>
          </div>
        ))}
      </div>
      {record.advice && (
        <div style={{ background:'#fff', borderLeft:'3px solid #1a1a2e', borderRadius:'0 8px 8px 0', padding:'10px 12px', fontSize:12, lineHeight:1.7, color:'#374151', marginBottom:12 }}>
          {record.advice}
        </div>
      )}
      {suggestions.length > 0 ? (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a1a2e', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
            <span>🍽️</span> 次の食事で補いたい栄養素と料理
          </div>
          {suggestions.map((s, si) => (
            <div key={si} style={{ border:'1px solid #e8e8e8', borderRadius:10, marginBottom:6, overflow:'hidden' }}>
              <button onClick={() => setOpenIdx(openIdx === si ? -1 : si)}
                style={{ width:'100%', background: openIdx===si?'#1a1a2e':'#f8f8f8', border:'none', padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>{s.nutrient_icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color: openIdx===si?'#e8c97e':'#1a1a2e' }}>{s.nutrient_name}が不足</div>
                    <div style={{ fontSize:10, color: openIdx===si?'rgba(232,201,126,0.8)':'#888', marginTop:1 }}>{s.reason}</div>
                  </div>
                </div>
                <span style={{ fontSize:11, color: openIdx===si?'#e8c97e':'#aaa', flexShrink:0 }}>{openIdx===si?'▲':'▼'}</span>
              </button>
              {openIdx === si && (
                <div style={{ padding:'8px 10px', background:'#fff', display:'flex', flexDirection:'column', gap:8 }}>
                  {(s.foods || []).map((food, fi) => (
                    <div key={fi} style={{ background:'#f8f8f8', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>🥘 {food.food_name}</span>
                        <span style={{ fontSize:10, color:'#888', background:'#e8e8e8', padding:'1px 6px', borderRadius:20 }}>{food.amount}</span>
                      </div>
                      {(food.dishes || []).map((dish, di) => (
                        <div key={di} style={{ background:'#fff', borderRadius:7, padding:'7px 9px', borderLeft:'3px solid #e8c97e', marginBottom: di < (food.dishes||[]).length-1 ? 5 : 0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>🍴 {dish.dish_name}</div>
                            {dish.recipe_steps && dish.recipe_steps.length > 0 && (
                              <button onClick={() => setRecipeModal(dish)}
                                style={{ background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:600, cursor:'pointer', flexShrink:0, marginLeft:6 }}>
                                レシピ
                              </button>
                            )}
                          </div>
                          {dish.tip && <div style={{ fontSize:10, color:'#666', lineHeight:1.5 }}>💡 {dish.tip}</div>}
                          {dish.calories_approx && <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>📊 {dish.calories_approx}</div>}
                          {dish.goal_fit && <div style={{ fontSize:10, color:'#3B6D11', marginTop:2 }}>✅ {dish.goal_fit}</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:'8px 0' }}>
          栄養素の提案データがありません
        </div>
      )}
      {recipeModal && <RecipeModal dish={recipeModal} onClose={() => setRecipeModal(null)} />}
    </div>
  )
}

// ─── メインコンポーネント ───
export default function HistoryTab({ profile, dailyIntake = [], onDelete }) {
  const [records,      setRecords]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const jstMs = Date.now() + 9 * 60 * 60 * 1000
    return new Date(jstMs).toISOString().slice(0, 10)
  })
  const [deletingId,   setDeletingId]   = useState(null)
  const [confirmId,    setConfirmId]    = useState(null)
  const [openDetailId, setOpenDetailId] = useState(null)

  const todayJst = (() => {
    const jstMs = Date.now() + 9 * 60 * 60 * 1000
    return new Date(jstMs).toISOString().slice(0, 10)
  })()
  const isToday = selectedDate === todayJst

  useEffect(() => { fetchRecords() }, [selectedDate])
  // タブ切り替えでHistoryTabがマウントされたとき今日のデータを最新化
  useEffect(() => { if (isToday) fetchRecords() }, [])   // マウント時
  useEffect(() => { if (isToday) fetchRecords() }, [dailyIntake.length])  // 追加時

  async function fetchRecords() {
    setLoading(true)
    const from = selectedDate + 'T00:00:00+09:00'
    const to   = selectedDate + 'T23:59:59+09:00'
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
    setConfirmId(null); setDeletingId(null); setOpenDetailId(null)
    if (onDelete) onDelete(id)
  }

  const intakeForSummary = records.map(r => ({
    total_cal: r.total_cal, protein: r.protein, fat: r.fat,
    carbs: r.carbs, vitamins: r.vitamins, minerals: r.minerals,
  }))

  return (
    <>
      {/* 日付選択 */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <input type="date" value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setOpenDetailId(null) }}
          style={{ width:'100%' }} />
      </div>

      {/* 栄養バランスサマリー */}
      <DailySummaryCard profile={profile} dailyIntake={intakeForSummary} defaultOpen={true} />

      {/* ── 1日の食事総評 ── */}
      <DailyReviewCard
        records={records}
        profile={profile}
        reviewDate={selectedDate}
      />

      {/* 食事リスト */}
      <div style={{ background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>食事記録</div>
        <div style={{ fontSize:11, color:'#aaa', marginBottom:10 }}>
          💡 食事をタップするとアドバイス・不足栄養素・レシピが確認できます
        </div>

        {loading
          ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>読み込み中...</p>
          : records.length === 0
            ? <p style={{ textAlign:'center', color:'#aaa', padding:'1.5rem 0', fontSize:14 }}>この日の記録はありません</p>
            : records.map((r, i) => (
                <div key={r.id || i}>
                  <div
                    onClick={() => { if (confirmId === r.id) return; setOpenDetailId(openDetailId === r.id ? null : r.id) }}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: (openDetailId === r.id || confirmId === r.id) ? 'none' : '1px solid #f5f5f5', cursor:'pointer', background: openDetailId === r.id ? '#f8fafc' : 'transparent', borderRadius: openDetailId === r.id ? '8px 8px 0 0' : 0 }}>
                    <div style={{ fontSize:24, flexShrink:0 }}>{MEAL_ICONS[r.meal_type] || '🍽️'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:600 }}>{r.meal_name}</span>
                        {r.meal_type && (
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'#f0f0f0', color:'#666' }}>
                            {MEAL_LABELS[r.meal_type] || r.meal_type}
                          </span>
                        )}
                        {(r.food_suggestions?.length > 0 || r.advice) && (
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'#EAF3DE', color:'#3B6D11' }}>詳細あり</span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                        {r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Tokyo' }) : ''}
                        &ensp;P {Math.round(r.protein||0)}g · F {Math.round(r.fat||0)}g · C {Math.round(r.carbs||0)}g
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:18, fontWeight:700 }}>{r.total_cal}</div>
                        <div style={{ fontSize:11, color:'#888' }}>kcal</div>
                      </div>
                      <span style={{ fontSize:12, color:'#aaa' }}>{openDetailId === r.id ? '▲' : '▼'}</span>
                      {r.id && (
                        <button onClick={e => { e.stopPropagation(); setConfirmId(confirmId === r.id ? null : r.id) }}
                          style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'4px 8px', fontSize:16, cursor:'pointer', color:'#aaa' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {openDetailId === r.id && confirmId !== r.id && (
                    <MealDetail record={r} onClose={() => setOpenDetailId(null)} />
                  )}

                  {confirmId === r.id && (
                    <div style={{ background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'#A32D2D' }}>この記録を削除しますか？</span>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setConfirmId(null)} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer' }}>キャンセル</button>
                        <button onClick={() => deleteRecord(r.id)} disabled={deletingId === r.id}
                          style={{ background:'#A32D2D', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: deletingId === r.id ? 0.6 : 1 }}>
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
