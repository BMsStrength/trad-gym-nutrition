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
    const { images, note, symptoms, mealType, mealTime, profile } = req.body

    const p = profile || {}
    const weight = p.weight || 60
    const height = p.height || 165
    const bmi = Math.round(weight / ((height / 100) ** 2) * 10) / 10
    const goals = (p.goals || [p.goal]).filter(Boolean)
    const goalLabels = goals.map(g => GOAL_LABELS[g] || g).join('・') || '健康維持'
    const sym = (p.symptoms || []).join('・') || ''
    const age = p.age || 30
    const mealHour = mealTime ? parseInt(mealTime.split(':')[0]) : new Date().getHours()

    const isDiet = goals.includes('diet')
    const isMuscle = goals.includes('muscle')
    const isLateNight = mealHour >= 21 || mealHour < 4
    const isSenior = age >= 65

    const systemPrompt = `あなたは日本の管理栄養士AIです。食事写真・メモを分析し、栄養計算とアドバイスをJSONのみで返してください。前置きや説明文は不要です。

【ユーザー情報】
- ${p.nickname || '会員'}（${age}歳・${p.gender === 'male' ? '男性' : '女性'}・身長${height}cm・体重${weight}kg・BMI${bmi}）
- 目標：${goalLabels} / 目標カロリー：${p.targetCal || 2000}kcal
- 推奨PFC：P${p.pfcP || 120}g / F${p.pfcF || 60}g / C${p.pfcC || 250}g
${sym ? `- 登録症状：${sym}` : ''}
${isSenior ? '- 65歳以上：タンパク質1.2g/kg/日以上推奨' : ''}
${isLateNight ? '- 夜遅い食事：脂肪蓄積リスクをadviceに必ず記載' : ''}

【量の推定ルール】
- 食器サイズで量を推定（茶碗=150g、どんぶり=250g）
- コンビニ商品はメモ・パッケージ情報を最優先
- 不明な場合は多めに見積もる

【料理提案ルール】
${isDiet ? '- ダイエット：揚げ物禁止。蒸し・茹で・グリルのみ' : ''}
${isMuscle ? '- 筋肉増量：1食タンパク質30g以上を優先' : ''}
${sym.includes('便秘') ? '- 便秘：水溶性食物繊維・発酵食品を優先' : ''}
${sym.includes('貧血') ? '- 貧血：ヘム鉄+ビタミンCの組み合わせを必ずセット' : ''}
${sym.includes('下痢') || sym.includes('腹痛') ? '- 胃腸症状：豆腐・白身魚・おかゆのみ。揚げ物・生野菜禁止' : ''}
- recipe_stepsは各料理に3〜4ステップで必ず記載

以下のJSON形式のみで回答：
{
  "meal_name": "食事名",
  "identified_items": ["食材1"],
  "confidence": "high",
  "total_cal": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0,
  "vitamins": {
    "A":{"amount":0,"unit":"μgRE","rda_pct":0},
    "B1":{"amount":0,"unit":"mg","rda_pct":0},
    "B2":{"amount":0,"unit":"mg","rda_pct":0},
    "B6":{"amount":0,"unit":"mg","rda_pct":0},
    "B12":{"amount":0,"unit":"μg","rda_pct":0},
    "C":{"amount":0,"unit":"mg","rda_pct":0},
    "D":{"amount":0,"unit":"μg","rda_pct":0},
    "E":{"amount":0,"unit":"mg","rda_pct":0},
    "K":{"amount":0,"unit":"μg","rda_pct":0},
    "葉酸":{"amount":0,"unit":"μg","rda_pct":0}
  },
  "minerals": {
    "カルシウム":{"amount":0,"unit":"mg","rda_pct":0},
    "鉄":{"amount":0,"unit":"mg","rda_pct":0},
    "マグネシウム":{"amount":0,"unit":"mg","rda_pct":0},
    "亜鉛":{"amount":0,"unit":"mg","rda_pct":0},
    "カリウム":{"amount":0,"unit":"mg","rda_pct":0},
    "ナトリウム":{"amount":0,"unit":"mg","rda_pct":0},
    "リン":{"amount":0,"unit":"mg","rda_pct":0},
    "銅":{"amount":0,"unit":"mg","rda_pct":0}
  },
  "advice": "アドバイス文",
  "public_nutrition_tip": "食育ワンポイント",
  "food_suggestions": [
    {
      "nutrient_name": "栄養素名",
      "nutrient_icon": "絵文字",
      "reason": "不足理由",
      "foods": [
        {
          "food_name": "食材名",
          "amount": "目安量",
          "dishes": [
            {
              "dish_name": "料理名",
              "tip": "調理のコツ",
              "calories_approx": "目安kcal",
              "goal_fit": "目標との適合性",
              "recipe_steps": ["手順1", "手順2", "手順3"]
            }
          ]
        }
      ]
    }
  ]
}`

    const imageList = Array.isArray(images) ? images : (images ? [images] : [])
    const content = []

    imageList.forEach(base64 => {
      if (!base64) return
      const clean = base64.includes(',') ? base64.split(',')[1] : base64
      let mediaType = 'image/jpeg'
      if (clean.startsWith('iVBORw0K')) mediaType = 'image/png'
      else if (clean.startsWith('R0lGOD')) mediaType = 'image/gif'
      else if (clean.startsWith('UklGR')) mediaType = 'image/webp'
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: clean } })
    })

    const parts = []
    if (imageList.length > 0) parts.push(`${imageList.length}枚の食事画像を分析してください。`)
    if (note) parts.push(`食事メモ: ${note}`)
    if (symptoms) parts.push(`体調: ${symptoms}`)
    if (mealType) parts.push(`食事区分: ${mealType}`)
    if (parts.length === 0) parts.push('食事を分析してください。')
    content.push({ type: 'text', text: parts.join('\n') })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    })

    const raw = response.content.map(b => b.text || '').join('')
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI応答からJSONが取得できませんでした')

    res.json(JSON.parse(jsonMatch[0]))

  } catch (e) {
    console.error('Analyze error:', e.message)
    res.status(500).json({ error: e.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }
