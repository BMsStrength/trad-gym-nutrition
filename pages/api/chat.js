import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const GOAL_LABELS = { diet:'ダイエット', muscle:'筋肉増量', maintain:'体型維持', performance:'競技パフォーマンス', health:'健康改善', energy:'疲労・エネルギー改善' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, profile, dailyIntake, history } = req.body
  const bmi = Math.round(profile.weight / ((profile.height / 100) ** 2) * 10) / 10
  const consumed = (dailyIntake || []).reduce((s, r) => s + r.total_cal, 0)

  const systemPrompt = `あなたはTRADジムのエビデンスベース統合栄養アドバイザーです。
目的：ダイエット、体調不良、運動パフォーマンス、生活習慣改善に対して安全で実践的な栄養アドバイス。
医師の診断・治療の代替は行わない。

ユーザー情報：
- ${profile.nickname}（${profile.gender==='male'?'男性':'女性'}、${profile.age}歳）
- 身長${profile.height}cm、体重${profile.weight}kg、BMI${bmi}
- 体脂肪率：${profile.bodyfat ? profile.bodyfat + '%' : '不明'}
- 目標：${GOAL_LABELS[profile.goal]}
- 目標カロリー：${profile.targetCal} kcal、推奨PFC: P${profile.pfcP}g/F${profile.pfcF}g/C${profile.pfcC}g
- 今日の摂取カロリー：${consumed} kcal
- 今日の食事記録：${(dailyIntake||[]).map(r=>r.meal_name+'('+r.total_cal+'kcal)').join('、') || 'まだ記録なし'}

回答は日本語で300字以内。親しみやすく実践的なトーンで。`

  try {
    const messages = [
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    })

    const reply = response.content.map(b => b.text || '').join('')
    res.json({ reply })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
