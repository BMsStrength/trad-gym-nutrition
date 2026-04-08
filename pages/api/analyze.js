import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GOAL_LABELS = {
  diet: 'ダイエット', muscle: '筋肉増量', maintain: '体型維持',
  performance: '競技パフォーマンス', health: '健康改善',
  energy: '疲労・エネルギー改善', condition: '体調不良改善',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { images, note, symptoms, mealType, profile } = req.body
  const bmi = Math.round(profile.weight / ((profile.height / 100) ** 2) * 10) / 10

  const goals = profile.goals || [profile.goal]
  const goalLabels = goals.map(g => GOAL_LABELS[g] || g).join('・')
  const profileSymptoms = profile.symptoms?.length > 0
    ? profile.symptoms.join('・') + (profile.symptoms_other ? '・' + profile.symptoms_other : '')
    : null

  const systemPrompt = `あなたは日本の管理栄養士資格を持つ、食品栄養分析の専門家AIです。
以下の知識ベースを必ず参照して、正確な栄養計算を行ってください。

## 参照する栄養データベース（優先順位順）

### 1. コンビニ・外食チェーンの公式栄養成分値（最優先）
【セブン-イレブン主要商品例】
- おにぎり 鮭: 179kcal, P7.1g, F1.7g, C35.2g
- おにぎり ツナマヨ: 204kcal, P5.6g, F6.2g, C31.5g
- サラダチキン プレーン(115g): 116kcal, P26.8g, F1.3g, C0g
【マクドナルド主要商品例】
- ビッグマック: 557kcal, P26g, F30g, C48g
- マックフライポテトM: 454kcal, P6g, F22g, C59g
【吉野家】牛丼 並盛: 668kcal, P19g, F21g, C93g
【すき家】牛丼 並盛: 652kcal, P23g, F17g, C95g
【ケンタッキー】オリジナルチキン(1ピース): 237kcal, P18g, F14g, C10g
【丸亀製麺】かけうどん 並: 299kcal, P10g, F1g, C63g

### 2. 日本食品標準成分表2020年版（八訂）
【主食】白米ご飯150g: 234kcal, P3.8g, F0.5g, C51.9g / 食パン6枚切1枚: 158kcal, P5.3g, F2.5g, C29.1g
【たんぱく質】鶏むね肉(皮なし)100g: 116kcal, P24.4g, F1.9g / 卵1個(60g): 91kcal, P7.4g, F6.2g
【調理補正】揚げ物+20〜40%カロリー増 / 炒め物+100〜150kcal / タレ・ソース+30〜80kcal

## ユーザー情報
- ${profile.nickname}（${profile.gender==='male'?'男性':'女性'}、${profile.age}歳）
- 身長${profile.height}cm、体重${profile.weight}kg、BMI${bmi}
- 体脂肪率：${profile.bodyfat ? profile.bodyfat + '%' : '不明'}
- 目標：${goalLabels}
- 1日の目標カロリー：${profile.targetCal} kcal
- 推奨PFC：P${profile.pfcP}g / F${profile.pfcF}g / C${profile.pfcC}g
${profileSymptoms ? `- 登録済み症状：${profileSymptoms}` : ''}
${mealType ? `- 食事区分：${mealType}` : ''}
${symptoms ? `- 今日の体調・症状：${symptoms}` : ''}

## 分析手順
1. 画像・メモから全食材を特定し、量を推定する
2. データベースの値で栄養計算する（不確実な場合は多めに見積もる）
3. ビタミン・ミネラルを日本食品標準成分表から算出する
4. 目標と体調を考慮したアドバイスを作成する
5. この食事で不足している栄養素を特定し、食材・料理の提案を作成する

${profileSymptoms || symptoms ? `
## 体調・症状への対応指針
- 登録症状「${profileSymptoms || ''}」と今日の症状「${symptoms || ''}」を考慮すること
- 便秘→食物繊維・水分・マグネシウム不足を確認
- 貧血・立ちくらみ→鉄・葉酸・ビタミンB12・ビタミンC不足を確認
- 疲労・エネルギー低下→ビタミンB群・鉄・マグネシウム不足を確認
- イライラ・気分の落ち込み→ビタミンB6・ビタミンD・マグネシウム不足を確認
- 胃腸不良→消化に良い食品を推奨、刺激物を避けるよう指導
- 冷え性→鉄・ビタミンB12・マグネシウム不足を確認
` : ''}

## food_suggestionsの作成ルール
- rda_pct が60%未満の栄養素を優先度の高い順に最大3つ選ぶ
- 体調・症状がある場合は、その症状に関連する栄養素を最優先にする
- 各栄養素について食材2〜3個、各食材に料理2個を提案する
- 料理名はスーパーやコンビニで材料が揃い、家庭で再現しやすいものにする
- tipは「なぜこの組み合わせが効果的か」「調理の簡単なコツ」を具体的に書く

## 出力形式（JSONのみ、他のテキスト不要）
{
  "meal_name": "食事名",
  "identified_items": ["食材1", "食材2"],
  "confidence": "high/medium/low",
  "total_cal": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "vitamins": {
    "A":{"amount":数値,"unit":"μgRE","rda_pct":数値},
    "B1":{"amount":数値,"unit":"mg","rda_pct":数値},
    "B2":{"amount":数値,"unit":"mg","rda_pct":数値},
    "B6":{"amount":数値,"unit":"mg","rda_pct":数値},
    "B12":{"amount":数値,"unit":"μg","rda_pct":数値},
    "C":{"amount":数値,"unit":"mg","rda_pct":数値},
    "D":{"amount":数値,"unit":"μg","rda_pct":数値},
    "E":{"amount":数値,"unit":"mg","rda_pct":数値},
    "K":{"amount":数値,"unit":"μg","rda_pct":数値},
    "葉酸":{"amount":数値,"unit":"μg","rda_pct":数値}
  },
  "minerals": {
    "カルシウム":{"amount":数値,"unit":"mg","rda_pct":数値},
    "鉄":{"amount":数値,"unit":"mg","rda_pct":数値},
    "マグネシウム":{"amount":数値,"unit":"mg","rda_pct":数値},
    "亜鉛":{"amount":数値,"unit":"mg","rda_pct":数値},
    "カリウム":{"amount":数値,"unit":"mg","rda_pct":数値},
    "ナトリウム":{"amount":数値,"unit":"mg","rda_pct":数値},
    "リン":{"amount":数値,"unit":"mg","rda_pct":数値},
    "銅":{"amount":数値,"unit":"mg","rda_pct":数値}
  },
  "advice": "アドバイス150〜250字",
  "food_suggestions": [
    {
      "nutrient_name": "不足栄養素名（例：鉄分）",
      "nutrient_icon": "絵文字（例：🫀）",
      "reason": "なぜ不足しているか・体への影響（40字以内）",
      "foods": [
        {
          "food_name": "食材名（例：鶏レバー）",
          "amount": "1食の目安量（例：100g）",
          "dishes": [
            {"dish_name": "料理名（例：レバニラ炒め）", "tip": "おすすめ理由・調理のコツ（40字以内）"},
            {"dish_name": "別の料理名", "tip": "調理のコツ（40字以内）"}
          ]
        },
        {
          "food_name": "別の食材名",
          "amount": "目安量",
          "dishes": [
            {"dish_name": "料理名", "tip": "調理のコツ（40字以内）"},
            {"dish_name": "別の料理名", "tip": "調理のコツ（40字以内）"}
          ]
        }
      ]
    }
  ]
}`

  try {
    const imageList = Array.isArray(images) ? images : (images ? [images] : [])
    const content = []

    imageList.forEach(base64 => {
      if (base64) {
        content.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data: base64 } })
      }
    })

    const textParts = []
    if (imageList.length > 0) textParts.push(`${imageList.length}枚の食事画像を分析してください。`)
    if (note) textParts.push(`食事メモ: ${note}`)
    if (symptoms) textParts.push(`今日の体調・症状: ${symptoms}`)
    if (textParts.length === 0) textParts.push('食事を分析してください。')

    content.push({ type:'text', text: textParts.join('\n') })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role:'user', content }],
    })

    const raw = response.content.map(b => b.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    res.json(data)
  } catch(e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }
