import { useState, useRef, useEffect } from 'react'

const GOAL_LABELS = { diet:'ダイエット', muscle:'筋肉増量', maintain:'体型維持', performance:'競技パフォーマンス', health:'健康改善', energy:'疲労・エネルギー改善' }

export default function AdviceTab({ profile, dailyIntake }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `こんにちは、${profile.nickname}さん！TRADジム栄養士AIです。\n目標「${GOAL_LABELS[profile.goal]}」に向けて、食事・栄養・体づくりについて何でもご相談ください。`
  }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
    wrap: { display:'flex', flexDirection:'column', height:'calc(100vh - 220px)' },
    messages: { flex:1, overflowY:'auto', paddingBottom:8 },
    bubble: (role) => ({
      background: role==='user' ? '#1a1a2e' : '#fff',
      color: role==='user' ? '#e8c97e' : '#1a1a1a',
      borderRadius: role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      padding:'10px 14px', fontSize:13, lineHeight:1.7,
      maxWidth:'85%', marginLeft: role==='user'?'auto':'0',
      marginBottom:8, whiteSpace:'pre-wrap',
      border: role==='user' ? 'none' : '1px solid #eee',
    }),
    inputRow: { display:'flex', gap:8, paddingTop:8 },
    sendBtn: { background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:10, padding:'8px 16px', fontWeight:600, cursor:'pointer', flexShrink:0, opacity: sending?0.5:1 },
  }

  return (
    <div style={s.wrap}>
      <div style={s.messages}>
        {messages.map((m, i) => <div key={i} style={s.bubble(m.role)}>{m.text}</div>)}
        {sending && <div style={s.bubble('assistant')}><span style={{color:'#aaa'}}>考え中...</span></div>}
        <div ref={bottomRef} />
      </div>
      <div style={s.inputRow}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder="質問を入力..." style={{flex:1}} />
        <button style={s.sendBtn} onClick={send} disabled={sending}>送信</button>
      </div>
    </div>
  )
}
