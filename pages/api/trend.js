import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const from30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const from7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // 過去30日の食事記録を全取得
    const { data: meals } = await supabase
      .from('meal_records')
      .select('total_cal, protein, fat, carbs, vitamins, minerals, meal_type, recorded_at, symptoms')
      .eq('user_id', userId)
      .gte('recorded_at', from30)
      .order('recorded_at')

    if (!meals || meals.length === 0) {
      return res.json({ hasTrend: false, message: '食事記録がまだ少ないため傾向を分析できません。' })
    }

    // 過去7日の食事記録
    const meals7 = meals.filter(m => m.recorded_at >= from7)

    // ━━━━━━━━━━━━━━━━━━
    // 日別集計
    // ━━━━━━━━━━━━━━━━━━
    const dailyMap = {}
    meals.forEach(m => {
      const date = m.recorded_at.slice(0, 10)
      if (!dailyMap[date]) dailyMap[date] = { cal: 0, protein: 0, fat: 0, carbs: 0, count: 0, mealTypes: [] }
      dailyMap[date].cal     += m.total_cal || 0
      dailyMap[date].protein += m.protein   || 0
      dailyMap[date].fat     += m.fat       || 0
      dailyMap[date].carbs   += m.carbs     || 0
      dailyMap[date].count   += 1
      if (m.meal_type) dailyMap[date].mealTypes.push(m.meal_type)
    })
    const days = Object.values(dailyMap)
    const recordedDays = days.length

    // ━━━━━━━━━━━━━━━━━━
    // 30日間の平均値
    // ━━━━━━━━━━━━━━━━━━
    const avg = {
      cal:     Math.round(days.reduce((s, d) => s + d.cal, 0) / recordedDays),
      protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / recordedDays),
      fat:     Math.round(days.reduce((s, d) => s + d.fat, 0) / recordedDays),
      carbs:   Math.round(days.reduce((s, d) => s + d.carbs, 0) / recordedDays),
    }

    // ━━━━━━━━━━━━━━━━━━
    // ビタミン・ミネラルの30日平均充足率
    // ━━━━━━━━━━━━━━━━━━
    const vitaminSums  = {}
    const mineralSums  = {}
    let vitaminCount = 0

    meals.forEach(m => {
      if (m.vitamins) {
        vitaminCount++
        Object.entries(m.vitamins).forEach(([k, v]) => {
          vitaminSums[k] = (vitaminSums[k] || 0) + (v.rda_pct || 0)
        })
      }
      if (m.minerals) {
        Object.entries(m.minerals).forEach(([k, v]) => {
          mineralSums[k] = (mineralSums[k] || 0) + (v.rda_pct || 0)
        })
      }
    })

    // 1食あたりの平均充足率→1日3食換算で推定日充足率
    const vitaminAvgPct = {}
    const mineralAvgPct = {}
    if (vitaminCount > 0) {
      Object.entries(vitaminSums).forEach(([k, v]) => {
        vitaminAvgPct[k] = Math.round((v / vitaminCount) * (avg.count || 2.5))
      })
    }
    Object.entries(mineralSums).forEach(([k, v]) => {
      mineralAvgPct[k] = Math.round((v / (vitaminCount || 1)) * (days.reduce((s,d)=>s+d.count,0)/recordedDays || 2.5))
    })

    // 不足栄養素（充足率50%未満）を抽出
    const lackingVitamins  = Object.entries(vitaminAvgPct).filter(([,v]) => v < 50).map(([k]) => `ビタミン${k}`)
    const lackingMinerals  = Object.entries(mineralAvgPct).filter(([,v]) => v < 50).map(([k]) => k)
    const lacking = [...lackingVitamins, ...lackingMinerals]

    // ━━━━━━━━━━━━━━━━━━
    // 朝食欠食パターン
    // ━━━━━━━━━━━━━━━━━━
    const breakfastDays = days.filter(d => d.mealTypes.includes('breakfast')).length
    const breakfastRate = Math.round(breakfastDays / recordedDays * 100)

    // ━━━━━━━━━━━━━━━━━━
    // 体調症状パターン
    // ━━━━━━━━━━━━━━━━━━
    const symptomsAll = meals.filter(m => m.symptoms && m.symptoms.trim()).map(m => m.symptoms)
    const symptomsText = symptomsAll.length > 0
      ? symptomsAll.slice(-10).join('・')
      : 'なし'

    // ━━━━━━━━━━━━━━━━━━
    // 直近7日 vs 30日の比較（改善・悪化の判定）
    // ━━━━━━━━━━━━━━━━━━
    const days7 = Object.values(
      meals7.reduce((acc, m) => {
        const d = m.recorded_at.slice(0, 10)
        if (!acc[d]) acc[d] = { cal: 0, protein: 0 }
        acc[d].cal     += m.total_cal || 0
        acc[d].protein += m.protein   || 0
        return acc
      }, {})
    )
    const avg7Cal     = days7.length ? Math.round(days7.reduce((s, d) => s + d.cal, 0) / days7.length) : avg.cal
    const avg7Protein = days7.length ? Math.round(days7.reduce((s, d) => s + d.protein, 0) / days7.length) : avg.protein

    const calTrend     = avg7Cal     > avg.cal     * 1.05 ? '増加傾向' : avg7Cal < avg.cal * 0.95 ? '減少傾向' : '安定'
    const proteinTrend = avg7Protein > avg.protein * 1.05 ? '増加傾向' : avg7Protein < avg.protein * 0.95 ? '減少傾向' : '安定'

    // ━━━━━━━━━━━━━━━━━━
    // PFCバランス傾向
    // ━━━━━━━━━━━━━━━━━━
    const totalCalForPFC = avg.protein * 4 + avg.fat * 9 + avg.carbs * 4
    const proteinPct = totalCalForPFC > 0 ? Math.round(avg.protein * 4 / totalCalForPFC * 100) : 0
    const fatPct     = totalCalForPFC > 0 ? Math.round(avg.fat     * 9 / totalCalForPFC * 100) : 0
    const carbPct    = totalCalForPFC > 0 ? Math.round(avg.carbs   * 4 / totalCalForPFC * 100) : 0

    const pfcIssues = []
    if (fatPct > 30)     pfcIssues.push(`脂質比率が${fatPct}%と高め（理想25%以下）`)
    if (carbPct < 50)    pfcIssues.push(`炭水化物比率が${carbPct}%と低め（理想60%以上）`)
    if (proteinPct < 12) pfcIssues.push(`タンパク質比率が${proteinPct}%と低め（理想15%）`)

    res.json({
      hasTrend: true,
      recordedDays,
      totalMeals: meals.length,
      avg,
      avg7: { cal: avg7Cal, protein: avg7Protein },
      calTrend,
      proteinTrend,
      pfc: { proteinPct, fatPct, carbPct },
      pfcIssues,
      lacking,
      breakfastRate,
      symptomsText,
      vitaminAvgPct,
      mineralAvgPct,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
