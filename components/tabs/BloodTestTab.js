import { useState, useRef } from 'react'

const STATUS_STYLE = {
  optimal: { bg: '#EAF3DE', color: '#3B6D11', label: '最適' },
  warning: { bg: '#FEF3C7', color: '#92400E', label: '注意' },
  danger:  { bg: '#FCEBEB', color: '#A32D2D', label: '要注意' },
  unknown: { bg: '#F3F4F6', color: '#6B7280', label: '参考値' },
}

const CATEGORY_ICONS = {
  '血球検査': '🩸',
  'タンパク質代謝': '💪',
  '脂質代謝': '🧈',
  '糖代謝': '🍬',
  '肝機能': '🫁',
  '腎機能': '🫘',
}

export default function BloodTestTab({ profile }) {
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [expandedAdvice, setExpandedAdvice] = useState(0)
  const fileRef = useRef()

  // 食事時刻警告チェック（時間栄養学）
  const hour = new Date().getHours()
  const isLateNight = hour >= 21

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImage(ev.target.result)
      setImageBase64(ev.target.result.split(',')[1])
      setResult(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function analyze() {
    if (!imageBase64) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/blood-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, profile }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      alert('分析に失敗しました。写真が鮮明か確認してもう一度お試しください。')
    }
    setAnalyzing(false)
  }

  // カテゴリ別にグループ化
  const grouped = result?.items?.reduce((acc, item) => {
    const cat = item.category || 'その他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {}) || {}

  const s = {
    card: { background: '#fff', borderRadius: 16, padding: '1rem', marginBottom: 12 },
    uploadBox: { border: '2px dashed #ddd', borderRadius: 12, padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer', background: '#fafafa' },
    analyzeBtn: (disabled) => ({ width: '100%', background: disabled ? '#ccc' : '#1a1a2e', color: disabled ? '#fff' : '#e8c97e', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 10 }),
  }

  return (
    <>
      {/* 夜遅い食事の警告（時間栄養学） */}
      {isLateNight && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🌙</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>夜遅い時間帯です</div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 1.6 }}>
              21時以降の食事は同じカロリーでも脂肪として蓄積されやすくなります。
              軽めの食事・消化の良いものを選びましょう。
            </div>
          </div>
        </div>
      )}

      {/* 高齢者向けメッセージ（老年栄養学） */}
      {profile.age >= 65 && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>👴</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>シニア向け栄養アドバイス</div>
            <div style={{ fontSize: 12, color: '#1D4ED8', marginTop: 2, lineHeight: 1.6 }}>
              65歳以上はサルコペニア（筋肉減少）予防のため、
              たんぱく質を体重×1.2〜1.5g/日確保することが重要です。
              水分も意識的に1日1.5〜2L摂りましょう。
            </div>
          </div>
        </div>
      )}

      {/* 血液検査アップロードカード */}
      <div style={s.card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🩸 血液検査データの分析</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          健康診断の血液検査結果を写真で撮影してアップロードすると、
          栄養状態・内臓機能・不足している栄養素をAIが分析します。
        </div>

        {/* アップロードエリア */}
        {!image ? (
          <div style={s.uploadBox} onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>血液検査結果の写真をアップロード</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>タップして写真を選択</div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={image} style={{ width: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'contain', background: '#f8f8f8' }} />
            <button
              onClick={() => { setImage(null); setImageBase64(null); setResult(null) }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}
            >×</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {/* 分析ボタン */}
        {analyzing ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #eee', borderTopColor: '#1a1a2e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#888', fontSize: 13 }}>血液検査データを読み取り中...</p>
          </div>
        ) : (
          <button style={s.analyzeBtn(!image)} onClick={analyze} disabled={!image}>
            AIで血液検査を分析する
          </button>
        )}
      </div>

      {/* 分析結果 */}
      {result && (
        <>
          {/* 要医療機関受診アラート */}
          {result.requires_medical && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#A32D2D', marginBottom: 4 }}>⚠️ 医療機関への受診をおすすめします</div>
              <div style={{ fontSize: 12, color: '#A32D2D', lineHeight: 1.6 }}>{result.medical_reason}</div>
            </div>
          )}

          {/* 総合サマリー */}
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#e8c97e', fontWeight: 700, marginBottom: 4 }}>📊 総合評価</div>
            <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.7 }}>{result.summary}</div>
          </div>

          {/* 検査項目一覧（カテゴリ別） */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                {CATEGORY_ICONS[category] || '📋'} {category}
              </div>
              {items.map((item, i) => {
                const st = STATUS_STYLE[item.status] || STATUS_STYLE.unknown
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid #f5f5f5' : 'none', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{item.comment}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.value}</div>
                      <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, marginTop: 2 }}>
                        {st.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* 栄養アドバイス（食材・料理提案） */}
          {result.nutrition_advice?.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🍽️ 血液検査から見る食事アドバイス</div>
              {result.nutrition_advice.map((advice, ai) => (
                <div key={ai} style={{ border: '1px solid #e8e8e8', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedAdvice(expandedAdvice === ai ? -1 : ai)}
                    style={{ width: '100%', background: expandedAdvice === ai ? '#1a1a2e' : '#f8f8f8', border: 'none', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{advice.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: expandedAdvice === ai ? '#e8c97e' : '#1a1a2e' }}>
                          優先度{advice.priority}：{advice.issue}
                        </div>
                        <div style={{ fontSize: 11, color: expandedAdvice === ai ? 'rgba(232,201,126,0.8)' : '#888', marginTop: 1 }}>
                          {advice.detail}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: expandedAdvice === ai ? '#e8c97e' : '#aaa', flexShrink: 0 }}>
                      {expandedAdvice === ai ? '▲' : '▼'}
                    </span>
                  </button>

                  {expandedAdvice === ai && (
                    <div style={{ padding: '10px 12px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(advice.foods || []).map((food, fi) => (
                        <div key={fi} style={{ background: '#f8f8f8', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>🥘 {food.food_name}</span>
                            <span style={{ fontSize: 11, color: '#888', background: '#e8e8e8', padding: '2px 8px', borderRadius: 20 }}>{food.amount}</span>
                          </div>
                          {(food.dishes || []).map((dish, di) => (
                            <div key={di} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 4, borderLeft: '3px solid #e8c97e' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>🍴 {dish.dish_name}</div>
                              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>💡 {dish.tip}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
