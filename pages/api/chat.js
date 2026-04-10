import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GOAL_LABELS = {
  diet: 'ダイエット', muscle: '筋肉増量', maintain: '体型維持',
  performance: '競技パフォーマンス', health: '健康改善',
  energy: '疲労・エネルギー改善', condition: '体調不良改善',
}

const MAX_HISTORY_TURNS = 4

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { message, profile, dailyIntake, history, trends, timingTrends, suppNutrients } = req.body

    const p     = profile || {}
    const bmi   = p.weight && p.height ? Math.round(p.weight / ((p.height/100)**2) * 10) / 10 : '--'
    const goals = (p.goals || [p.goal]).filter(Boolean)
    const goalLabels      = goals.map(g => GOAL_LABELS[g] || g).join('・') || '健康維持'
    const profileSymptoms = (p.symptoms || []).join('・') || 'なし'
    const consumed        = (dailyIntake || []).reduce((s, r) => s + (r.total_cal || 0), 0)
    const todayMeals      = (dailyIntake || []).map(r => r.meal_name + '(' + r.total_cal + 'kcal)').join('、') || 'まだ記録なし'

    // 会話履歴を直近MAX_HISTORY_TURNS往復に制限（トークン爆発防止）
    const trimmedHistory = (history || []).slice(-(MAX_HISTORY_TURNS * 2))

    const systemPrompt = `あなたはTRADジムの専属栄養アドバイザーAIです。科学的根拠に基づき、実践的で親しみやすいアドバイスをします。医療行為の代替は行いません。

【会員情報】
- ${p.nickname || '会員'}（${p.age || '--'}歳・${p.gender === 'male' ? '男' : '女'}・${p.height || '--'}cm・${p.weight || '--'}kg・BMI${bmi}）
- 目標：${goalLabels} / 目標kcal：${p.targetCal || 2000}
- PFC目標：P${p.pfcP || '--'}g・F${p.pfcF || '--'}g・C${p.pfcC || '--'}g
- 登録症状：${profileSymptoms}
- 今日の摂取：${consumed}kcal（${todayMeals}）
${suppNutrients ? `- サプリ補給：${suppNutrients}` : ''}
${trends ? `\n【食事傾向（過去30日）】\n${trends}` : ''}
${timingTrends ? `\n【食事時刻の傾向】\n${timingTrends}` : ''}

【専門知識】
- PFC・ビタミン・ミネラルの過不足と体への影響
- 目標別の食事戦略（ダイエット:揚物禁止・低GI優先 / 増量:ロイシン豊富・高タンパク / 競技:グリコーゲン戦略）
- 症状別の栄養アプローチ（貧血:ヘム鉄+VitC / 便秘:水溶性食物繊維・発酵食品 / 疲労:B群・CoQ10・鉄 / 不眠:Mg・トリプトファン / うつ傾向:EPA/DHA・葉酸・B12）
- 時間栄養学（朝食の重要性・夜遅い食事のBMAL1リスク・食事タイミング）
- 分子栄養学の要点（ミトコンドリア代謝にB群・CoQ10・Mg必須 / テストステロンに亜鉛・Mg・VitD / セロトニンにB6・鉄・トリプトファン）
- サプリメント（Mg:グリシネート形態が最高吸収 / 亜鉛過剰で銅欠乏 / VitD+K2の相乗効果）
- コンビニ・外食での賢い選択方法
- 65歳以上：サルコペニア予防でタンパク1.2g/kg/日以上・VitD・カルシウム優先

【回答ルール】
1. 200字以内で簡潔に。長い場合は要点を箇条書き
2. 「今日の夕食に〇〇を追加」レベルの具体的提案を必ず含める
3. 疾患・血液検査は必ず「医療機関での確認を推奨」を添える
4. 精神系症状は「栄養は補助的アプローチ。医療機関受診も」と添える`

    const messages = [
      ...trimmedHistory.map(h => ({ role: h.role, content: h.content || h.text || '' })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     systemPrompt,
      messages,
    })

    res.json({ reply: response.content.map(b => b.text || '').join('') })

  } catch (e) {
    console.error('Chat error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
