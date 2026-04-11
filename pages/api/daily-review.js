import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GOAL_LABELS = {
  diet: 'ダイエット', muscle: '筋肉増量', maintain: '体型維持',
  performance: '競技パフォーマンス', health: '健康改善',
  energy: '疲労・エネルギー改善', condition: '体調不良改善',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { records, profile, targetDate } = req.body
    const p = profile || {}
    const goals = (p.goals || [p.goal]).filter(Boolean)
    const goalLabels = goals.map(g => GOAL_LABELS[g] || g).join('・') || '健康維持'
    const sym = (p.symptoms || []).join('・') || ''
    const isDiet   = goals.includes('diet')
    const isMuscle = goals.includes('muscle')

    // 1日の合計を計算
    const totalCal  = records.reduce((s, r) => s + (r.total_cal || 0), 0)
    const totalP    = records.reduce((s, r) => s + (r.protein  || 0), 0)
    const totalF    = records.reduce((s, r) => s + (r.fat      || 0), 0)
    const totalC    = records.reduce((s, r) => s + (r.carbs    || 0), 0)
    const mealNames = records.map(r => r.meal_name).join('、')

    // ビタミン・ミネラルの合計
    const vitTotals = {}; const minTotals = {}
    records.forEach(r => {
      if (r.vitamins) Object.entries(r.vitamins).forEach(([k, v]) => { vitTotals[k] = (vitTotals[k] || 0) + (v.amount || 0) })
      if (r.minerals) Object.entries(r.minerals).forEach(([k, v]) => { minTotals[k] = (minTotals[k] || 0) + (v.amount || 0) })
    })

    // 不足しているビタミン・ミネラルを特定
    const VIT_TARGETS = { 'A':800,'B1':1.2,'B2':1.4,'B6':1.3,'B12':2.4,'C':100,'D':10,'E':12,'K':100,'葉酸':240 }
    const MIN_TARGETS = { 'カルシウム':800,'鉄':10,'マグネシウム':340,'亜鉛':10,'カリウム':2500 }
    const lowVit = Object.entries(VIT_TARGETS).filter(([k,t]) => (vitTotals[k]||0) < t * 0.6).map(([k]) => `ビタミン${k}`)
    const lowMin = Object.entries(MIN_TARGETS).filter(([k,t]) => (minTotals[k]||0) < t * 0.6).map(([k]) => k)
    const deficiencies = [...lowVit, ...lowMin].slice(0, 5).join('・') || 'なし'

    const systemPrompt = `あなたは日本の管理栄養士AIです。1日の食事記録を分析し、総評と明日の食事提案をJSONのみで返してください。

【会員情報】
- 目標：${goalLabels} / 目標カロリー：${p.targetCal || 2000}kcal
- PFC目標：P${p.pfcP||120}g F${p.pfcF||60}g C${p.pfcC||250}g
${sym ? `- 登録症状：${sym}` : ''}

【本日の食事データ】
- 食事内容：${mealNames}
- 合計カロリー：${totalCal}kcal（目標比${Math.round(totalCal/(p.targetCal||2000)*100)}%）
- PFC：P${Math.round(totalP)}g F${Math.round(totalF)}g C${Math.round(totalC)}g
- 不足栄養素（60%未満）：${deficiencies}

【料理提案ルール】
${isDiet ? '- ダイエット：揚げ物禁止。蒸し・茹で・グリルのみ' : ''}
${isMuscle ? '- 筋肉増量：高タンパク（1食30g以上）を優先' : ''}
${sym.includes('貧血') ? '- 貧血：ヘム鉄+ビタミンCセットを必ず提案' : ''}

【出力形式】JSONのみ。{ で始まり } で終わること。
{
  "overall_score": 80,
  "score_label": "良好",
  "review": "本日の食事の総評200字程度。①良かった点 ②改善できる点 ③明日へのアドバイス",
  "tomorrow_suggestions": [
    {
      "nutrient_name": "不足栄養素名",
      "nutrient_icon": "絵文字",
      "reason": "なぜ必要か30字以内",
      "foods": [
        {
          "food_name": "食材名",
          "amount": "目安量",
          "dishes": [
            {
              "dish_name": "料理名",
              "tip": "調理のコツ30字",
              "calories_approx": "約XXXkcal",
              "goal_fit": "目標との適合性",
              "recipe_steps": ["手順1","手順2","手順3"]
            }
          ]
        }
      ]
    }
  ]
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `${targetDate}の食事記録を分析して総評と明日の食事提案をしてください。` }],
    })

    const raw = response.content.map(b => b.text || '').join('')
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const start = cleaned.indexOf('{')
    const end   = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('JSONが取得できませんでした')

    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    res.json(parsed)

  } catch (e) {
    console.error('Daily review error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
