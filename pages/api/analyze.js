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
以下の知識ベースを必ず参照して、正確な栄養計算と多角的なアドバイスを行ってください。

## 統合栄養学の分析視点（adviceとfood_suggestionsに反映すること）
- 【調理学】揚げ物・炒め物はカロリー増加を計上。水溶性ビタミンは加熱・水さらしで損失。脂溶性ビタミンは油と同時摂取で吸収率UP
- 【時間栄養学】朝食欠食・夜遅い食事は代謝効率が低下。朝のタンパク質が筋合成リズムを整える。夜22時以降の食事は同カロリーでも脂肪蓄積2倍
- 【病態栄養学】登録症状（糖尿病・高血圧・貧血・腸疾患等）に応じた疾患別栄養アドバイスを追加
- 【分子栄養学】ビタミン・ミネラルは酵素の補酵素。不足→代謝低下→体温低下→免疫低下の連鎖を意識
- 【スポーツ栄養学】筋肉増量目標には運動後30分以内のタンパク補給（20〜40g）を提案
- 【行動栄養学】改善提案は「今日の夕食に〇〇を追加」レベルの実行しやすい小さな一歩で
- 【サプリメント評価】食事だけで補えない栄養素にはサプリの補助提案も可（エビデンスレベルを明示）

## 参照する栄養データベース（優先順位順）

### 1. コンビニ・外食チェーンの公式栄養成分値（最優先）
【セブン-イレブン】
- おにぎり 鮭: 179kcal P7.1g F1.7g C35.2g
- おにぎり ツナマヨ: 204kcal P5.6g F6.2g C31.5g
- おにぎり 梅: 168kcal P3.6g F0.5g C36.5g
- サラダチキン プレーン(115g): 116kcal P26.8g F1.3g C0g
- ゆで卵2個: 130kcal P11.4g F9.0g C0.8g
- 豆腐一丁(300g): 168kcal P14.7g F9.0g C4.8g
- 野菜サラダ(100g): 20kcal P1g F0g C4g
- カスタードプリン: 226kcal P5.4g F6.5g C36.2g
【ローソン】
- おにぎり 鮭: 176kcal P7.0g F1.6g C34.5g
- ブランパン1個: 112kcal P5.4g F3.2g C16.7g
- サラダチキン(130g): 130kcal P27.3g F1.6g C0.5g
【ファミリーマート】
- おにぎり 鮭: 177kcal P7.2g F1.5g C34.8g
- ファミチキ(1枚): 260kcal P16g F16g C12g
【マクドナルド】
- ビッグマック: 557kcal P26g F30g C48g
- マックフライポテトM: 454kcal P6g F22g C59g
- マックフライポテトL: 517kcal P7g F25g C67g
- エッグマフィン: 290kcal P17g F12g C30g
- チキンマックナゲット5個: 265kcal P16g F15g C18g
【吉野家】
- 牛丼 並盛: 668kcal P19g F21g C93g
- 牛丼 大盛: 882kcal P25g F28g C123g
- 親子丼 並: 704kcal P24g F16g C110g
【すき家】
- 牛丼 並盛: 652kcal P23g F17g C95g
- 牛丼 ミニ: 466kcal P17g F12g C67g
- 豚汁: 108kcal P7g F5g C9g
【ケンタッキー】
- オリジナルチキン1ピース: 237kcal P18g F14g C10g
- チキンフィレサンド: 471kcal P27g F19g C50g
【丸亀製麺】
- かけうどん 並: 299kcal P10g F1g C63g
- ざるうどん 並: 310kcal P11g F1g C65g
- 天ぷら かき揚げ: 298kcal P5g F16g C34g
【松屋】
- 牛めし 並: 685kcal P21g F18g C104g
- 定食ライス(大): 482kcal P8g F2g C106g
【モスバーガー】
- モスバーガー: 389kcal P16g F18g C40g
- 野菜バーガー: 318kcal P11g F11g C43g
【サブウェイ】
- BLTサンド(15cm): 234kcal P14g F6g C32g
- チキンテリヤキ(15cm): 311kcal P20g F9g C38g
【スターバックス】
- ラテ トール(牛乳): 180kcal P11g F7g C19g
- フラペチーノ Tall: 380kcal P5g F14g C58g

### 2. 日本食品標準成分表2020年版（八訂）詳細版
【主食類】
- 白米ご飯 150g: 234kcal P3.8g F0.5g C51.9g
- 白米ご飯 200g: 312kcal P5.0g F0.6g C69.2g
- 玄米ご飯 150g: 228kcal P4.2g F1.5g C47.7g
- 食パン6枚切1枚(60g): 158kcal P5.3g F2.5g C29.1g
- 食パン8枚切1枚(45g): 119kcal P4.0g F1.9g C21.8g
- バゲット1切れ(50g): 140kcal P5g F1g C28g
- うどん(ゆで200g): 212kcal P5.8g F0.8g C43g
- そば(ゆで200g): 264kcal P9.6g F2.0g C50g
- スパゲッティ(乾燥100g): 378kcal P13g F1.9g C73g
- スパゲッティ(ゆで200g): 298kcal P10g F1.5g C58g

【肉類】
- 鶏むね肉(皮なし)100g: 116kcal P24.4g F1.9g C0g
- 鶏もも肉(皮なし)100g: 138kcal P22.0g F5.0g C0g
- 鶏もも肉(皮あり)100g: 204kcal P17.3g F14.2g C0g
- 鶏ささみ100g: 109kcal P23.9g F0.8g C0g
- 豚ロース100g: 263kcal P19.3g F19.2g C0.2g
- 豚バラ100g: 395kcal P14.4g F35.4g C0.1g
- 豚ヒレ100g: 130kcal P22.2g F3.7g C0.3g
- 牛赤身100g: 193kcal P21.3g F11.7g C0.3g
- 牛バラ100g: 472kcal P11.0g F46.4g C0.1g
- 合いびき肉100g: 272kcal P17.1g F21.5g C0.3g

【魚介類】
- 鮭1切れ(100g): 138kcal P22.3g F4.1g C0.1g VD:32μg
- サバ1切れ(100g): 211kcal P20.6g F12.1g C0.3g
- マグロ赤身100g: 125kcal P26.4g F1.4g C0.1g
- ツナ缶(水煮70g): 52kcal P14.0g F0.7g C0.4g
- ツナ缶(油漬70g): 184kcal P13.0g F14.4g C0g
- あさり100g: 30kcal P6.0g F0.3g C0.4g Fe:3.8mg B12:52μg
- しじみ100g: 54kcal P7.5g F1.4g C4.5g B12:68μg
- エビ100g: 82kcal P19.6g F0.6g C0.1g

【卵・乳製品】
- 卵1個(60g): 91kcal P7.4g F6.2g C0.2g
- 卵2個(120g): 182kcal P14.8g F12.4g C0.4g
- 牛乳200ml: 134kcal P6.6g F7.6g C9.6g Ca:220mg
- ギリシャヨーグルト100g: 97kcal P10.0g F3.0g C7.7g
- プレーンヨーグルト100g: 62kcal P3.6g F3.0g C4.9g
- プロセスチーズ1枚(18g): 61kcal P3.8g F4.7g C0.3g Ca:126mg

【豆類・大豆製品】
- 木綿豆腐1/2丁(150g): 108kcal P10.5g F6.4g C2.4g
- 絹豆腐1/2丁(150g): 84kcal P7.4g F4.5g C2.7g
- 納豆1パック(50g): 100kcal P8.3g F5.0g C6.1g K2:270μg
- 豆乳200ml: 92kcal P7.2g F4.0g C6.2g
- 枝豆(冷凍100g): 118kcal P11.5g F6.1g C8.8g 葉酸:320μg

【野菜類】
- ほうれん草1束(200g): 40kcal P4.4g F0.8g C6.2g Fe:4mg 葉酸:420μg
- 小松菜1束(200g): 28kcal P3.0g F0.6g C4.6g Fe:5.6mg
- ブロッコリー100g: 33kcal P4.3g F0.5g C5.2g C:120mg
- トマト1個(200g): 38kcal P1.4g F0.2g C8.6g
- にんじん1本(100g): 39kcal P0.6g F0.2g C9.3g A:720μgRE
- 玉ねぎ1個(200g): 74kcal P2.0g F0.2g C17.1g
- キャベツ100g: 23kcal P1.3g F0.2g C5.2g C:41mg

【きのこ・海藻】
- 干しシイタケ(乾燥5g→戻し40g): 12kcal P1g F0g C2g VD:12μg
- えのき100g: 22kcal P2.7g F0.2g C7.6g
- ひじき(乾燥10g): 17kcal P1g F0.4g C4g Fe:5.5mg
- わかめ(生50g): 9kcal P1g F0.1g C1.6g

【果物】
- バナナ1本(100g): 86kcal P1.1g F0.2g C22.5g B6:0.38mg
- りんご1/2個(150g): 87kcal P0.3g F0.3g C24g
- みかん1個(100g): 46kcal P0.7g F0.1g C12g C:32mg

【油脂・調味料】
- オリーブオイル大さじ1(12g): 111kcal F12g
- サラダ油大さじ1(12g): 111kcal F12g
- バター10g: 75kcal P0.1g F8g C0g
- マヨネーズ大さじ1(12g): 84kcal P0.3g F9.1g C0.5g
- みそ大さじ1(18g): 35kcal P2g F1g C4g Na:1000mg

### 3. 調理補正係数（精度向上のため必ず適用）
- 揚げ物（天ぷら・フライ）: 素材カロリー×1.3〜1.5（衣+油の吸収）
- 炒め物（油使用）: +100〜150kcal、脂質+10〜15g
- 焼き物（油少量）: 素材比+5〜10%
- 茹で・蒸し: ほぼ素材のまま（水溶性ビタミンは20〜40%減）
- タレ・ドレッシング（大さじ1）: +30〜80kcal
- みりん・砂糖（大さじ1）: +43〜58kcal
- 揚げ出し豆腐1人前: +100〜150kcal（揚げ+タレ込み）
- 定食のご飯おかわり: +234kcal（150g）

### 4. 精度向上のための推定ルール
- 写真から量を推定する際は「多め」に見積もる（過小評価より過大評価を優先）
- チェーン店名・商品名がメモにある場合は公式値を最優先で使用
- 調理法が不明な場合は標準的な家庭料理の調理法を仮定
- 皮・骨・タレの有無を必ず考慮する
- 複数品目の場合は全品を合算して報告

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
  "advice": "アドバイス150〜250字。①この食事の良い点 ②改善できる点 ③時間栄養学の視点（食べた時刻・次の食事のタイミング） ④体調改善への具体的な食事提案を含める。",
  "public_nutrition_tip": "今日の食事から見る食育・生活習慣のワンポイント（80字以内。旬の食材・調理の工夫・食文化など実践的な豆知識を1つ）",
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
