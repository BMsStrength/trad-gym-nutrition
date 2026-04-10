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

    const p      = profile || {}
    const weight = p.weight || 60
    const height = p.height || 165
    const bmi    = Math.round(weight / ((height / 100) ** 2) * 10) / 10
    const goals  = (p.goals || [p.goal]).filter(Boolean)
    const goalLabels = goals.map(g => GOAL_LABELS[g] || g).join('・') || '健康維持'
    const sym    = (p.symptoms || []).join('・') || ''
    const age    = p.age || 30
    const mealHour  = mealTime ? parseInt(mealTime.split(':')[0]) : new Date().getHours()
    const isDiet    = goals.includes('diet')
    const isMuscle  = goals.includes('muscle')
    const isLateNight = mealHour >= 21 || mealHour < 4
    const isSenior  = age >= 65

    const systemPrompt = `あなたは日本の管理栄養士AIです。食事写真・メモを分析し、栄養計算とアドバイスをJSONのみで返してください。

【最重要ルール：二重計算の禁止】
- 写真とメモは「同じ一食」を異なる角度から表したものです
- 写真に写っているものとメモに書かれているものを別々に足してはいけません
- メモに「鶏肉210g・玄米200g」と書いてあれば、写真でも同じ食材が見える場合は一度だけ計算する
- メモに重量・食材名が明記されている場合はメモの情報を最優先し、写真は量の確認・補助として使う
- タレ・ソース・薬味は大さじ1〜2程度(30〜50kcal)として計算し、忘れずに加える

【栄養計算の基準値（必ず参照）】
- 鶏むね肉（皮なし）: 116kcal/100g, P24g, F2g
- 鶏もも肉（皮なし）: 138kcal/100g, P22g, F5g
- 鶏もも肉（皮あり）: 204kcal/100g（皮なし指定がなければ皮なしで計算）
- 白米ご飯（炊いた状態）: 156kcal/100g
- 玄米ご飯（炊いた状態）: 165kcal/100g
- ※「玄米200g」はご飯（炊いた状態）200g = 330kcal。乾燥重量で計算しないこと

【ユーザー情報】
- ${p.nickname || '会員'}（${age}歳・${p.gender === 'male' ? '男性' : '女性'}・${height}cm・${weight}kg・BMI${bmi}）
- 目標：${goalLabels} / 目標：${p.targetCal || 2000}kcal / PFC：P${p.pfcP || 120}g F${p.pfcF || 60}g C${p.pfcC || 250}g
${sym ? `- 症状：${sym}` : ''}${isSenior ? '\n- 65歳以上：タンパク質1.2g/kg以上' : ''}
${isLateNight ? '- 夜遅い食事：BMAL1リスクをadviceに記載' : ''}

【料理提案ルール】
${isDiet ? '- ダイエット：揚げ物禁止。蒸し・茹で・グリルのみ提案' : ''}
${isMuscle ? '- 筋肉増量：1食30g以上のタンパク質を優先' : ''}
${sym.includes('便秘') ? '- 便秘：水溶性食物繊維・発酵食品を優先' : ''}
${sym.includes('貧血') ? '- 貧血：ヘム鉄+ビタミンCセットを必ず提案' : ''}
${sym.includes('下痢') || sym.includes('腹痛') ? '- 胃腸症状：豆腐・白身魚・おかゆのみ。揚げ物・生野菜禁止' : ''}

【出力形式】JSONのみ。他テキスト不要。
- food_suggestions：不足栄養素を上位2件
- 各栄養素に食材1〜2個、各食材に料理1〜2品
- recipe_stepsは3ステップ

{
  "meal_name": "食事名",
  "identified_items": ["食材1","食材2"],
  "confidence": "high/medium/low",
  "total_cal": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "vitamins": {"A":{"amount":数値,"unit":"μgRE","rda_pct":数値},"B1":{"amount":数値,"unit":"mg","rda_pct":数値},"B2":{"amount":数値,"unit":"mg","rda_pct":数値},"B6":{"amount":数値,"unit":"mg","rda_pct":数値},"B12":{"amount":数値,"unit":"μg","rda_pct":数値},"C":{"amount":数値,"unit":"mg","rda_pct":数値},"D":{"amount":数値,"unit":"μg","rda_pct":数値},"E":{"amount":数値,"unit":"mg","rda_pct":数値},"K":{"amount":数値,"unit":"μg","rda_pct":数値},"葉酸":{"amount":数値,"unit":"μg","rda_pct":数値}},
  "minerals": {"カルシウム":{"amount":数値,"unit":"mg","rda_pct":数値},"鉄":{"amount":数値,"unit":"mg","rda_pct":数値},"マグネシウム":{"amount":数値,"unit":"mg","rda_pct":数値},"亜鉛":{"amount":数値,"unit":"mg","rda_pct":数値},"カリウム":{"amount":数値,"unit":"mg","rda_pct":数値},"ナトリウム":{"amount":数値,"unit":"mg","rda_pct":数値},"リン":{"amount":数値,"unit":"mg","rda_pct":数値},"銅":{"amount":数値,"unit":"mg","rda_pct":数値}},
  "advice": "150字程度。①この食事の良い点 ②改善点 ③具体的な提案",
  "public_nutrition_tip": "食育ポイント60字以内",
  "food_suggestions": [
    {
      "nutrient_name": "栄養素名",
      "nutrient_icon": "絵文字",
      "reason": "不足理由と体への影響30字以内",
      "foods": [
        {
          "food_name": "食材名",
          "amount": "1食の目安量",
          "dishes": [
            {
              "dish_name": "料理名",
              "tip": "調理のコツ・目標に合う理由30字",
              "calories_approx": "約XXXkcal",
              "goal_fit": "目標との適合性",
              "recipe_steps": ["手順1","手順2","手順3"]
            },
            {
              "dish_name": "別の料理名",
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

    const imageList = Array.isArray(images) ? images : (images ? [images] : [])
    const content   = []

    imageList.forEach(base64 => {
      if (!base64) return
      const clean = base64.includes(',') ? base64.split(',')[1] : base64
      let mediaType = 'image/jpeg'
      if (clean.startsWith('iVBORw0K')) mediaType = 'image/png'
      else if (clean.startsWith('R0lGOD'))  mediaType = 'image/gif'
      else if (clean.startsWith('UklGR'))   mediaType = 'image/webp'
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: clean } })
    })

    const parts = []
    if (imageList.length > 0) parts.push(`${imageList.length}枚の食事写真（メモと同じ食事の写真です）`)
    if (note)     parts.push(`食事メモ（最優先情報）: ${note}`)
    if (symptoms) parts.push(`体調: ${symptoms}`)
    if (mealType) parts.push(`食事区分: ${mealType}`)
    if (parts.length === 0) parts.push('食事を分析してください。')
    content.push({ type: 'text', text: parts.join('\n') })

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content }],
    })

    const raw = response.content.map(b => b.text || '').join('')
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI応答からJSONが取得できませんでした')

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (jsonErr) {
      // JSONが途中で切れた場合、food_suggestionsを除いて返す
      const truncated = jsonMatch[0]
        .replace(/,\s*"food_suggestions"\s*:\s*\[[\s\S]*$/, '') + ',"food_suggestions":[]}'
      try {
        parsed = JSON.parse(truncated)
      } catch (e2) {
        throw new Error('JSONの解析に失敗しました。もう一度お試しください。')
      }
    }
    res.json(parsed)

  } catch (e) {
    console.error('Analyze error:', e.message)
    res.status(500).json({ error: e.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }
