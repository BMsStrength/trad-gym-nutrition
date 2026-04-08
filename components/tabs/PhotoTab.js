import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const TIPS = [
  { icon: '🏪', title: 'コンビニ商品', desc: 'パッケージのラベルが写るように撮ると正確に読み取れます' },
  { icon: '🍔', title: 'チェーン店', desc: 'メモ欄に「マクドナルド ビッグマックセット」と書くと公式値を使用します' },
  { icon: '🍱', title: '定食・弁当', desc: '全品が1枚に収まるよう引いて撮影してください' },
  { icon: '📝', title: 'テキストだけでもOK', desc: 'メモ欄に「吉野家 牛丼並盛」と入力するだけで分析できます' },
]

export default function PhotoTab({ profile, onRecord }) {
  const [phase, setPhase] = useState('upload')
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [showTips, setShowTips] = useState(false)
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImageDataUrl(ev.target.result)
      setImageBase64(ev.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    setPhase('loading')
    const msgs = [
      '食材・商品を識別中...',
      '栄養データベースを参照中...',
      '栄養素を計算中...',
      'アドバイスを生成中...',
    ]
    let mi = 0
    setLoadingMsg(msgs[0])
    const interval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadingMsg(msgs[mi]) }, 2200)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, note, profile }),
      })
      const data = await res.json()
      clearInterval(interval)
      if (data.error) throw new Error(data.error)

      await supabase.from('meal_records').insert({
        user_id: profile.id,
        meal_name: data.meal_name,
        total_cal: data.total_cal,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        vitamins: data.vitamins,
        minerals: data.minerals,
        advice: data.advice,
        note,
        recorded_at: new Date().toISOString(),
      })
      onRecord(data)
      setResult(data)
      setPhase('result')
    } catch (e) {
      clearInterval(interval)
      setError('分析に失敗しました。もう一度お試しください。')
      setPhase('upload')
    }
  }

  function reset() {
    setPhase('upload'); setImageDataUrl(null); setImageBase64(null)
    setNote(''); setResult(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const confidenceLabel = {
    high:   { label: '高精度', color: '#3B6D11', bg: '#EAF3DE' },
    medium: { label: '中精度', color: '#854F0B', bg: '#FAEEDA' },
    low:    { label: '推定値', color: '#A32D2D', bg: '#FCEBEB' },
  }

  const s = {
    card: { background:'#fff', borderRadius:16, padding:'1rem', marginBottom:12 },
    upload: { border:'2px dashed #ddd', borderRadius:12, padding:'2rem 1rem', textAlign:'center', cursor:'pointer', background:'#fafafa' },
    btn: { width:'100%', background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:12, padding:13, fontSize:15, fontWeight:600, cursor:'pointer' },
    btnSub: { width:'100%', background:'#f0f0f0', color:'#333', border:'none', borderRadius:12, padding:12, fontSize:14, cursor:'pointer', marginTop:8 },
    loader: { textAlign:'center', padding:'3rem 0' },
    spinner: { width:36, height:36, border:'3px solid #eee', borderTopColor:'#1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' },
    secTitle: { fontSize:12, color:'#888', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, margin:'12px 0 8px' },
    pfcGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, margin:'8px 0' },
    pfcCard: { background:'#f8f8f8', borderRadius:8, padding:'8px', textAlign:'center' },
    nutriRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f5f5f5' },
    barWrap: { width:100, height:4, background:'#eee', borderRadius:2, overflow:'hidden', marginTop:3 },
    adviceBox: { background:'#f8f8f8', borderLeft:'3px solid #1a1a2e', borderRadius:'0 8px 8px 0', padding:'10px 12px', fontSize:13, lineHeight:1.7 },
    err: { background:'#fff0f0', border:'1px solid #fcc', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#c00', marginBottom:10 },
    tipRow: { display:'flex', gap:10, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #f5f5f5' },
    tipIcon: { fontSize:20, flexShrink:0, width:28, textAlign:'center' },
    itemTag: { display:'inline-block', background:'#f0f0f0', borderRadius:20, padding:'2px 8px', fontSize:11, color:'#555', margin:'2px 3px 2px 0' },
  }

  if (phase === 'loading') return (
    <div style={s.card}>
      <div style={s.loader}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={s.spinner} />
        <p style={{color:'#888', fontSize:14, marginBottom:6}}>{loadingMsg}</p>
        <p style={{color:'#bbb', fontSize:12}}>日本食品標準成分表・各社公式値を参照しています</p>
      </div>
    </div>
  )

  if (phase === 'result' && result) {
    const conf = confidenceLabel[result.confidence] || confidenceLabel.medium
    return (
      <>
        <div style={s.card}>
          {imageDataUrl && <img src={imageDataUrl} style={{width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10, marginBottom:10}} />}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
            <div style={{fontSize:14, fontWeight:700}}>{result.meal_name}</div>
            <span style={{fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600, background:conf.bg, color:conf.color}}>{conf.label}</span>
          </div>
          {result.identified_items?.length > 0 && (
            <div style={{marginBottom:10}}>
              {result.identified_items.map((item, i) => <span key={i} style={s.itemTag}>{item}</span>)}
            </div>
          )}
          <div style={{textAlign:'center', padding:'8px 0'}}>
            <div style={{fontSize:42, fontWeight:700}}>{result.total_cal}</div>
            <div style={{fontSize:14, color:'#888'}}>kcal</div>
          </div>
          <div style={s.pfcGrid}>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#185FA5'}}>{result.protein}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>たんぱく質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#BA7517'}}>{result.fat}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>脂質 g</div></div>
            <div style={s.pfcCard}><div style={{fontSize:20, fontWeight:700, color:'#3B6D11'}}>{result.carbs}</div><div style={{fontSize:11, color:'#888', marginTop:2}}>炭水化物 g</div></div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.secTitle}>ビタミン</div>
          {Object.entries(result.vitamins).map(([name, v]) => (
            <div key={name} style={s.nutriRow}>
              <div>
                <div style={{fontSize:13}}>ビタミン {name}</div>
                <div style={s.barWrap}><div style={{height:'100%', borderRadius:2, background: v.rda_pct>=80?'#3B6D11':v.rda_pct>=50?'#378ADD':'#BA7517', width:Math.min(100,v.rda_pct)+'%'}} /></div>
              </div>
              <div style={{textAlign:'right', fontSize:12}}>
                <div style={{fontWeight:600}}>{v.amount} {v.unit}</div>
                <div style={{color:'#aaa'}}>{v.rda_pct}%</div>
              </div>
            </div>
          ))}
          <div style={s.secTitle}>ミネラル</div>
          {Object.entries(result.minerals).map(([name, v]) => (
            <div key={name} style={s.nutriRow}>
              <div>
                <div style={{fontSize:13}}>{name}</div>
                <div style={s.barWrap}><div style={{height:'100%', borderRadius:2, background: v.rda_pct>=80?'#3B6D11':v.rda_pct>=50?'#378ADD':'#BA7517', width:Math.min(100,v.rda_pct)+'%'}} /></div>
              </div>
              <div style={{textAlign:'right', fontSize:12}}>
                <div style={{fontWeight:600}}>{v.amount} {v.unit}</div>
                <div style={{color:'#aaa'}}>{v.rda_pct}%</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.secTitle}>AIアドバイス</div>
          <div style={s.adviceBox}>{result.advice}</div>
          <button style={s.btnSub} onClick={reset}>別の食事を記録する</button>
        </div>
      </>
    )
  }

  return (
    <div style={s.card}>
      {error && <div style={s.err}>{error}</div>}

      <div style={s.upload} onClick={() => fileRef.current?.click()}>
        {imageDataUrl
          ? <img src={imageDataUrl} style={{width:'100%', maxHeight:220, objectFit:'cover', borderRadius:10}} />
          : <>
              <div style={{fontSize:36, marginBottom:8}}>📸</div>
              <div style={{fontSize:14, color:'#666'}}>食事の写真をタップしてアップロード</div>
              <div style={{fontSize:11, color:'#aaa', marginTop:4}}>JPG / PNG</div>
            </>
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} />

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={'食事メモ（精度アップに効果的）\n例: 「セブン サラダチキン＋おにぎり鮭」\n例: 「マクドナルド ビッグマックセットMサイズ」\n例: 「吉野家 牛丼並盛」'}
        style={{marginTop:10, height:90}}
      />

      <button
        style={{...s.btn, marginTop:10, opacity: (!imageDataUrl && !note) ? 0.4 : 1}}
        onClick={analyze}
        disabled={!imageDataUrl && !note}
      >
        AI栄養分析を開始
      </button>

      <div style={{marginTop:12}}>
        <button
          onClick={() => setShowTips(!showTips)}
          style={{background:'none', border:'none', fontSize:12, color:'#888', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:4}}
        >
          {showTips ? '▲' : '▼'} 精度を上げるコツ
        </button>
        {showTips && (
          <div style={{marginTop:8, background:'#f8f8f8', borderRadius:10, padding:'0.75rem'}}>
            {TIPS.map((t, i) => (
              <div key={i} style={s.tipRow}>
                <span style={s.tipIcon}>{t.icon}</span>
                <div>
                  <div style={{fontSize:12, fontWeight:600, marginBottom:2}}>{t.title}</div>
                  <div style={{fontSize:12, color:'#666', lineHeight:1.6}}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
