import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GOAL_LABELS = {
  diet: 'ダイエット', muscle: '筋肉増量', maintain: '体型維持',
  performance: '競技パフォーマンス', health: '健康改善',
  energy: '疲労・エネルギー改善', condition: '体調不良改善',
}

// JSONを安全にパースする（前後のゴミを除去してから試みる）
function safeParseJSON(raw) {
  if (!raw) return null

  // コードブロック除去（全パターン対応）
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // { から始まる部分を探す
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || start > end) return null

  const jsonStr = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    return null
  }
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
    const goalLabels  = goals.map(g => GOAL_LABELS[g] || g).join('・') || '健康維持'
    const sym         = (p.symptoms || []).join('・') || ''
    const age         = p.age || 30
    const mealHour    = mealTime ? parseInt(mealTime.split(':')[0]) : new Date().getHours()
    const isDiet      = goals.includes('diet')
    const isMuscle    = goals.includes('muscle')
    const isLateNight = mealHour >= 21 || mealHour < 4
    const isSenior    = age >= 65

    const systemPrompt = `あなたは日本の管理栄養士AIです。食事写真・メモを分析し、栄養計算とアドバイスをJSONのみで返してください。

【絶対ルール①：二重計算の完全禁止】
写真とメモは「まったく同じ一食」を別の角度から表したものです。
写真に写っている食材とメモに書かれている食材を両方計算して足してはいけません。
メモに重量・食材名が書いてある場合：メモの情報のみで計算し、写真は確認用として使う。

【絶対ルール②：正確なカロリーデータベース（必ずこの値を使う）】
鶏肉（調理後の重量で計算）:
- 鶏むね肉 皮なし: 116kcal/100g  P24.4g  F1.9g
- 鶏もも肉 皮なし: 138kcal/100g  P22.0g  F5.0g
- 鶏もも肉 皮あり: 204kcal/100g（皮の指定がない場合は皮なしで計算）

主食（炊飯後・調理後の重量で計算）:
- 白米ご飯: 156kcal/100g  P2.5g  F0.3g  C35.6g
- 玄米ご飯: 165kcal/100g  P2.8g  F1.0g  C35.6g
- ※「玄米200g」= 炊いた状態200g = 330kcal（乾燥重量ではない）

タレ・調味料: カオマンガイのタレ30〜50kcal、醤油大さじ1=13kcal

計算例（カオマンガイ 鶏肉210g・玄米200g）:
→ 鶏むね皮なし210g: 244kcal + 玄米ご飯200g: 330kcal + タレ50kcal = 合計624kcal

【ユーザー情報】
- ${p.nickname || '会員'}（${age}歳・${p.gender === 'male' ? '男性' : '女性'}・${height}cm・${weight}kg・BMI${bmi}）
- 目標：${goalLabels} / 目標：${p.targetCal || 2000}kcal / PFC：P${p.pfcP || 120}g F${p.pfcF || 60}g C${p.pfcC || 250}g
${sym ? `- 症状：${sym}` : ''}${isSenior ? '\n- 65歳以上：タンパク質1.2g/kg以上推奨' : ''}
${isLateNight ? '- 夜遅い食事：BMAL1リスクをadviceに記載' : ''}

【料理提案ルール（food_suggestions）】
- 不足栄養素の上位2件を提案する（必ず含めること）
- 各栄養素に食材1〜2個、各食材に料理1〜2品
- recipe_stepsは3ステップ
${isDiet ? '- ダイエット：揚げ物禁止。蒸し・茹で・グリルのみ提案' : ''}
${isMuscle ? '- 筋肉増量：1食30g以上のタンパク質を優先' : ''}
${sym.includes('便秘') ? '- 便秘：水溶性食物繊維・発酵食品を優先' : ''}
${sym.includes('貧血') ? '- 貧血：ヘム鉄+ビタミンCセットを必ず提案' : ''}
${sym.includes('下痢') || sym.includes('腹痛') ? '- 胃腸症状：豆腐・白身魚・おかゆのみ。揚げ物・生野菜禁止' : ''}

【出力形式】
必ず { で始まり } で終わるJSONのみを返す。
説明文・前置き・コードブロック（\`\`\`）は絶対に含めない。

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
            }
          ]
        }
      ]
    }
  ]
}`

    // メッセージを構築
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
    if (imageList.length > 0) parts.push(`${imageList.length}枚の食事写真（下のメモと同じ食事です。写真とメモを合算しないこと）`)
    if (note)     parts.push(`食事メモ（この情報のみで計算すること）: ${note}`)
    if (symptoms) parts.push(`体調: ${symptoms}`)
    if (mealType) parts.push(`食事区分: ${mealType}`)
    if (parts.length === 0) parts.push('食事を分析してください。')
    content.push({ type: 'text', text: parts.join('\n') })

    // 最大2回リトライ
    let parsed = null
    let lastError = ''

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 2500,
          system:     systemPrompt,
          messages:   [{ role: 'user', content }],
        })

        const raw = response.content.map(b => b.text || '').join('')
        parsed = safeParseJSON(raw)

        if (parsed) {
          // food_suggestionsが欠けていれば空配列を補完
          if (!parsed.food_suggestions) parsed.food_suggestions = []
          break // 成功
        } else {
          lastError = `AI応答のJSON解析に失敗（試行${attempt}）`
          console.error(`Attempt ${attempt} parse failed. Raw:`, raw.slice(0, 200))
        }
      } catch (apiErr) {
        lastError = apiErr.message
        console.error(`Attempt ${attempt} API error:`, apiErr.message)
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000)) // 1秒待ってリトライ
      }
    }

    if (!parsed) {
      return res.status(500).json({ error: lastError || 'AI分析に失敗しました。もう一度お試しください。' })
    }

    res.json(parsed)

  } catch (e) {
    console.error('Analyze error:', e.message)
    res.status(500).json({ error: e.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }
