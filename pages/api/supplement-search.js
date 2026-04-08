// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// サプリメント検索API
// Open Food Facts（無料・500万製品以上）を使用
// 検索結果をSupabaseにキャッシュして高速化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 栄養素の単位を正規化する
function parseNutrient(val) {
  if (val === undefined || val === null || val === '') return 0
  return Math.round(parseFloat(val) * 10) / 10 || 0
}

// Open Food Facts のレスポンスを統一フォーマットに変換
function normalizeProduct(p) {
  const n = p.nutriments || {}

  // サービングサイズを取得（g単位に変換）
  const servingG = parseFloat(p.serving_quantity) || parseFloat(p.serving_size) || 100
  const servingLabel = p.serving_size || `${servingG}g`

  // 100gあたりの値からサービング量を計算
  const factor = servingG / 100

  // ビタミン・ミネラルの抽出
  const vitamins = {}
  const minerals = {}

  const vitMap = {
    'A': ['vitamin-a_100g', 'vitamin-a-retinol-equivalent_100g'],
    'B1': ['vitamin-b1_100g', 'thiamin_100g'],
    'B2': ['vitamin-b2_100g', 'riboflavin_100g'],
    'B6': ['vitamin-b6_100g', 'pyridoxine_100g'],
    'B12': ['vitamin-b12_100g', 'cobalamin_100g'],
    'C': ['vitamin-c_100g', 'ascorbic-acid_100g'],
    'D': ['vitamin-d_100g', 'vitamin-d3_100g'],
    'E': ['vitamin-e_100g', 'tocopherol_100g'],
    'K': ['vitamin-k_100g'],
    '葉酸': ['folates_100g', 'folic-acid_100g'],
  }
  const minMap = {
    'カルシウム': ['calcium_100g'],
    '鉄': ['iron_100g'],
    'マグネシウム': ['magnesium_100g'],
    '亜鉛': ['zinc_100g'],
    'カリウム': ['potassium_100g'],
    'ナトリウム': ['sodium_100g'],
    'リン': ['phosphorus_100g'],
    '銅': ['copper_100g'],
  }

  Object.entries(vitMap).forEach(([jpName, keys]) => {
    for (const k of keys) {
      if (n[k] !== undefined && n[k] !== null) {
        const val = parseNutrient(n[k]) * factor
        if (val > 0) vitamins[jpName] = Math.round(val * 100) / 100
        break
      }
    }
  })
  Object.entries(minMap).forEach(([jpName, keys]) => {
    for (const k of keys) {
      if (n[k] !== undefined && n[k] !== null) {
        // ナトリウムはmg換算
        let val = parseNutrient(n[k]) * factor
        if (jpName === 'ナトリウム') val = Math.round(val * 1000) // g→mg
        else val = Math.round(val * 1000) // g→mg
        if (val > 0) minerals[jpName] = val
        break
      }
    }
  })

  // ブランド名の整形
  const brand = (p.brands || '').split(',')[0].trim() || '不明'
  const name = p.product_name_ja || p.product_name_en || p.product_name || '名称不明'

  return {
    id: `off_${p._id || p.code || Math.random()}`,
    brand,
    name,
    serving_unit: servingLabel,
    servings_options: JSON.stringify([0.5, 1, 2]),
    calories_per_serving: parseNutrient((n['energy-kcal_serving']) || (n['energy-kcal_100g'] || 0) * factor),
    protein_per_serving:  parseNutrient((n['proteins_serving'])     || (n['proteins_100g']     || 0) * factor),
    fat_per_serving:      parseNutrient((n['fat_serving'])          || (n['fat_100g']           || 0) * factor),
    carbs_per_serving:    parseNutrient((n['carbohydrates_serving']) || (n['carbohydrates_100g'] || 0) * factor),
    vitamins_per_serving: vitamins,
    minerals_per_serving: minerals,
    special_per_serving: null,
    category: detectCategory(name, brand),
    category_icon: detectCategoryIcon(name, brand),
    source: 'openfoodfacts',
  }
}

// 製品名・ブランドからカテゴリを自動判定
function detectCategory(name, brand) {
  const t = (name + ' ' + brand).toLowerCase()
  if (t.match(/whey|ホエイ|casein|カゼイン|soy|ソイ|protein|プロテイン/)) return 'プロテイン'
  if (t.match(/bcaa|eaa|amino|アミノ/)) return 'BCAA/EAA'
  if (t.match(/creatine|クレアチン/)) return 'クレアチン'
  if (t.match(/omega|fish.?oil|dha|epa|フィッシュ|オメガ/)) return 'オメガ3/魚油'
  if (t.match(/vitamin|ビタミン|vit[. ]/)) return 'ビタミン'
  if (t.match(/mineral|iron|calcium|magnesium|zinc|鉄|カルシウム|マグネシウム|亜鉛/)) return 'ミネラル'
  if (t.match(/collagen|コラーゲン|hyaluron|ヒアルロン/)) return '美容・その他'
  if (t.match(/pre.?workout|pre-workout|caffeine|カフェイン/)) return 'プレワークアウト'
  return 'その他'
}

function detectCategoryIcon(name, brand) {
  const cat = detectCategory(name, brand)
  const icons = {
    'プロテイン': '🥛', 'BCAA/EAA': '⚡', 'クレアチン': '💪',
    'オメガ3/魚油': '🐟', 'ビタミン': '🌟', 'ミネラル': '⚗️',
    '美容・その他': '✨', 'プレワークアウト': '🔥', 'その他': '💊'
  }
  return icons[cat] || '💊'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { q, category, page = 1 } = req.query
  if (!q && !category) return res.status(400).json({ error: '検索ワードまたはカテゴリが必要です' })

  try {
    // ① まずSupabaseキャッシュを検索
    let cacheQuery = supabaseAdmin.from('supplements_master')
      .select('*')
      .eq('is_active', true)

    if (q) {
      cacheQuery = cacheQuery.or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
    } else if (category) {
      cacheQuery = cacheQuery.eq('category', category)
    }
    cacheQuery = cacheQuery.order('brand').limit(30)
    const { data: cached } = await cacheQuery

    // キャッシュが10件以上あればそれを返す
    if (cached && cached.length >= 10) {
      return res.json({ products: cached, source: 'cache', total: cached.length })
    }

    // ② キャッシュが少ない場合はOpen Food Factsから取得
    const searchTerms = q || getCategorySearchTerms(category)
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?` +
      `search_terms=${encodeURIComponent(searchTerms)}` +
      `&search_simple=1&action=process&json=1` +
      `&page_size=30&page=${page}` +
      `&fields=_id,code,product_name,product_name_ja,product_name_en,brands,` +
      `serving_size,serving_quantity,nutriments` +
      `&tagtype_0=categories&tag_contains_0=contains&tag_0=dietary-supplements`

    const offRes = await fetch(offUrl, {
      headers: { 'User-Agent': 'TRADGymNutritionApp/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (!offRes.ok) {
      // Open Food Facts が失敗した場合はキャッシュのみ返す
      return res.json({ products: cached || [], source: 'cache_only', total: cached?.length || 0 })
    }

    const offData = await offRes.json()
    const normalized = (offData.products || [])
      .filter(p => p.product_name || p.product_name_en)
      .map(normalizeProduct)
      .filter(p => p.protein_per_serving > 0 || p.calories_per_serving > 0 || p.vitamins_per_serving && Object.keys(p.vitamins_per_serving).length > 0)

    // ③ 新しい製品をSupabaseにキャッシュ保存（バックグラウンド）
    if (normalized.length > 0) {
      const toInsert = normalized.map(p => ({
        id: p.id,
        brand: p.brand,
        name: p.name,
        category: p.category,
        category_icon: p.category_icon,
        serving_unit: p.serving_unit,
        servings_options: p.servings_options,
        calories_per_serving: p.calories_per_serving,
        protein_per_serving: p.protein_per_serving,
        fat_per_serving: p.fat_per_serving,
        carbs_per_serving: p.carbs_per_serving,
        vitamins_per_serving: p.vitamins_per_serving,
        minerals_per_serving: p.minerals_per_serving,
        special_per_serving: p.special_per_serving,
        is_active: true,
      }))
      supabaseAdmin.from('supplements_master')
        .upsert(toInsert, { onConflict: 'id', ignoreDuplicates: true })
        .then(() => {}) // バックグラウンドで保存（待たない）
    }

    // キャッシュ + 新規取得を合わせて返す（重複除去）
    const allIds = new Set((cached || []).map(p => p.id))
    const merged = [
      ...(cached || []),
      ...normalized.filter(p => !allIds.has(p.id))
    ].slice(0, 40)

    return res.json({ products: merged, source: 'openfoodfacts', total: offData.count || merged.length })

  } catch (e) {
    console.error('supplement-search error:', e)
    // エラー時はキャッシュのみ返す
    const { data: fallback } = await supabaseAdmin.from('supplements_master')
      .select('*').eq('is_active', true)
      .or(q ? `name.ilike.%${q}%,brand.ilike.%${q}%` : `category.eq.${category}`)
      .limit(20)
    return res.json({ products: fallback || [], source: 'fallback', error: e.message })
  }
}

// カテゴリから英語の検索ワードを生成
function getCategorySearchTerms(category) {
  const map = {
    'プロテイン': 'whey protein',
    'BCAA/EAA': 'BCAA amino acid',
    'クレアチン': 'creatine',
    'オメガ3/魚油': 'omega3 fish oil DHA',
    'ビタミン': 'multivitamin vitamin',
    'ミネラル': 'mineral supplement',
    '美容・その他': 'collagen supplement',
    'プレワークアウト': 'pre workout',
  }
  return map[category] || category
}
