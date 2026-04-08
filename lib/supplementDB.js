// ============================================================
// サプリメントデータベース
// 主要メーカーの主力製品を網羅
// 1serving あたりの栄養素を記載
// ============================================================

export const SUPPLEMENT_DB = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // プロテイン
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  protein: {
    label: 'プロテイン',
    icon: '🥛',
    products: [
      {
        id: 'gold_standard_whey',
        brand: 'Optimum Nutrition',
        name: 'ゴールドスタンダード ホエイ',
        flavor_note: 'ダブルリッチチョコレート等',
        serving_unit: 'スクープ(30g)',
        servings_options: [0.5, 1, 1.5, 2],
        per_serving: {
          calories: 120, protein: 24, fat: 1.5, carbs: 3,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'zavas_whey100',
        brand: 'SAVAS（ザバス）',
        name: 'ホエイプロテイン100',
        flavor_note: 'ミルクチョコレート・バニラ等',
        serving_unit: 'スクープ(21g)',
        servings_options: [1, 2, 3],
        per_serving: {
          calories: 80, protein: 15, fat: 1.1, carbs: 4.4,
          vitamins: { B1: 0.36, B2: 0.41, B6: 0.45, C: 20 },
          minerals: { カルシウム: 130, マグネシウム: 16 }
        }
      },
      {
        id: 'kentai_whey',
        brand: '健康体力研究所（kentai）',
        name: 'ホエイプロテイン100 アドバンス',
        serving_unit: 'スクープ(25g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 96, protein: 20, fat: 1.3, carbs: 2.4,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'myprotein_impact_whey',
        brand: 'Myprotein',
        name: 'インパクトホエイプロテイン',
        serving_unit: 'スクープ(25g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 103, protein: 21, fat: 1.9, carbs: 1.0,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'dns_pro_whey',
        brand: 'DNS',
        name: 'プロテインホエイ100',
        serving_unit: 'スクープ(30g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 115, protein: 22.5, fat: 2.1, carbs: 3.0,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'bulksports_big_whey',
        brand: 'Bulk Sports',
        name: 'ビッグホエイ',
        serving_unit: 'スクープ(30g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 112, protein: 22, fat: 2.0, carbs: 2.5,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'savas_casein',
        brand: 'SAVAS（ザバス）',
        name: 'カゼインプロテイン',
        serving_unit: 'スクープ(21g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 75, protein: 14, fat: 0.5, carbs: 4.0,
          vitamins: {}, minerals: { カルシウム: 180 }
        }
      },
      {
        id: 'savas_soy',
        brand: 'SAVAS（ザバス）',
        name: 'ソイプロテイン100',
        serving_unit: 'スクープ(21g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 75, protein: 14.5, fat: 0.5, carbs: 3.5,
          vitamins: {}, minerals: {}
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BCAA / EAA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bcaa_eaa: {
    label: 'BCAA / EAA',
    icon: '⚡',
    products: [
      {
        id: 'scivation_xtend',
        brand: 'Scivation',
        name: 'XTEND BCAA',
        serving_unit: 'スクープ(14g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 0, protein: 7, fat: 0, carbs: 0,
          vitamins: { B6: 0.6 }, minerals: { ナトリウム: 190, カリウム: 160 }
        }
      },
      {
        id: 'dns_bcaa',
        brand: 'DNS',
        name: 'BCAA パウダー',
        serving_unit: 'スクープ(10g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 30, protein: 7.4, fat: 0, carbs: 0.1,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'myprotein_eaa',
        brand: 'Myprotein',
        name: 'Essential BCAA 2:1:1',
        serving_unit: 'スクープ(9g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 28, protein: 7, fat: 0, carbs: 0,
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'savas_bcaa',
        brand: 'SAVAS（ザバス）',
        name: 'BCAA パウダー',
        serving_unit: '1袋(4.5g)',
        servings_options: [1, 2, 3],
        per_serving: {
          calories: 16, protein: 4, fat: 0, carbs: 0,
          vitamins: {}, minerals: {}
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // クレアチン
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  creatine: {
    label: 'クレアチン',
    icon: '💪',
    products: [
      {
        id: 'on_creatine',
        brand: 'Optimum Nutrition',
        name: 'クレアチンパウダー',
        serving_unit: 'スプーン(5g)',
        servings_options: [1],
        per_serving: {
          calories: 0, protein: 0, fat: 0, carbs: 0,
          special: 'クレアチン5g',
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'dns_creatine',
        brand: 'DNS',
        name: 'クレアチンパウダー',
        serving_unit: 'スプーン(3g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 0, protein: 0, fat: 0, carbs: 0,
          special: 'クレアチン3g',
          vitamins: {}, minerals: {}
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // マルチビタミン・ビタミン単体
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  vitamins: {
    label: 'ビタミン',
    icon: '🌟',
    products: [
      {
        id: 'now_adam',
        brand: 'NOW Foods',
        name: 'ADAM マルチビタミン（男性用）',
        serving_unit: '2粒',
        servings_options: [1],
        per_serving: {
          calories: 10, protein: 0, fat: 0, carbs: 2,
          vitamins: { A: 750, B1: 25, B2: 12.5, B6: 25, B12: 100, C: 500, D: 25, E: 100, K: 120, '葉酸': 400 },
          minerals: { カルシウム: 200, マグネシウム: 100, 亜鉛: 15, カリウム: 99 }
        }
      },
      {
        id: 'fancl_multivitamin',
        brand: 'FANCL（ファンケル）',
        name: 'マルチビタミン',
        serving_unit: '1粒',
        servings_options: [1],
        per_serving: {
          calories: 2, protein: 0, fat: 0, carbs: 0.5,
          vitamins: { A: 540, B1: 1.2, B2: 1.4, B6: 1.3, B12: 2.4, C: 100, D: 5.5, E: 6.3, K: 75, '葉酸': 240 },
          minerals: {}
        }
      },
      {
        id: 'dhc_multivitamin',
        brand: 'DHC',
        name: 'マルチビタミン',
        serving_unit: '1粒',
        servings_options: [1],
        per_serving: {
          calories: 3, protein: 0, fat: 0.1, carbs: 0.6,
          vitamins: { A: 600, B1: 5, B2: 5, B6: 5, B12: 25, C: 500, D: 2.5, E: 50, '葉酸': 200 },
          minerals: {}
        }
      },
      {
        id: 'now_vitamin_d3',
        brand: 'NOW Foods',
        name: 'ビタミンD3 2000IU',
        serving_unit: '1粒',
        servings_options: [1, 2],
        per_serving: {
          calories: 0, protein: 0, fat: 0, carbs: 0,
          vitamins: { D: 50 }, minerals: {}
        }
      },
      {
        id: 'dhc_vitamin_c',
        brand: 'DHC',
        name: 'ビタミンC ハードカプセル',
        serving_unit: '2粒',
        servings_options: [1, 2],
        per_serving: {
          calories: 2, protein: 0, fat: 0, carbs: 0.5,
          vitamins: { C: 1000 }, minerals: {}
        }
      },
      {
        id: 'now_b_complex',
        brand: 'NOW Foods',
        name: 'B-50 コンプレックス',
        serving_unit: '1粒',
        servings_options: [1],
        per_serving: {
          calories: 5, protein: 0, fat: 0, carbs: 1,
          vitamins: { B1: 50, B2: 50, B6: 50, B12: 50, '葉酸': 400 },
          minerals: {}
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ミネラル
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  minerals: {
    label: 'ミネラル',
    icon: '⚗️',
    products: [
      {
        id: 'now_magnesium',
        brand: 'NOW Foods',
        name: 'マグネシウム 400mg',
        serving_unit: '2粒',
        servings_options: [0.5, 1, 2],
        per_serving: {
          calories: 0, protein: 0, fat: 0, carbs: 0,
          vitamins: {}, minerals: { マグネシウム: 400 }
        }
      },
      {
        id: 'dhc_iron',
        brand: 'DHC',
        name: '鉄',
        serving_unit: '2粒',
        servings_options: [1],
        per_serving: {
          calories: 3, protein: 0.1, fat: 0.1, carbs: 0.5,
          vitamins: { C: 50 }, minerals: { 鉄: 10 }
        }
      },
      {
        id: 'now_zinc',
        brand: 'NOW Foods',
        name: '亜鉛 50mg',
        serving_unit: '1粒',
        servings_options: [0.5, 1],
        per_serving: {
          calories: 0, protein: 0, fat: 0, carbs: 0,
          vitamins: {}, minerals: { 亜鉛: 50 }
        }
      },
      {
        id: 'fancl_calcium_mg',
        brand: 'FANCL（ファンケル）',
        name: 'カルシウム＋MG',
        serving_unit: '3粒',
        servings_options: [1],
        per_serving: {
          calories: 5, protein: 0.2, fat: 0.1, carbs: 1,
          vitamins: { D: 2.5 }, minerals: { カルシウム: 360, マグネシウム: 180 }
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // オメガ3・魚油
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  omega3: {
    label: 'オメガ3 / 魚油',
    icon: '🐟',
    products: [
      {
        id: 'now_omega3',
        brand: 'NOW Foods',
        name: 'オメガ3 1000mg',
        serving_unit: '1粒',
        servings_options: [1, 2, 3],
        per_serving: {
          calories: 10, protein: 0, fat: 1, carbs: 0,
          special: 'EPA 180mg, DHA 120mg',
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'dhc_dha',
        brand: 'DHC',
        name: 'DHA',
        serving_unit: '3粒',
        servings_options: [1],
        per_serving: {
          calories: 12, protein: 0.1, fat: 1.1, carbs: 0,
          special: 'DHA 223mg, EPA 47mg',
          vitamins: { E: 2 }, minerals: {}
        }
      },
    ]
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // その他
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  others: {
    label: 'その他',
    icon: '💊',
    products: [
      {
        id: 'now_coq10',
        brand: 'NOW Foods',
        name: 'CoQ10 100mg',
        serving_unit: '1粒',
        servings_options: [1, 2],
        per_serving: {
          calories: 5, protein: 0, fat: 0.5, carbs: 0,
          special: 'CoQ10 100mg',
          vitamins: {}, minerals: {}
        }
      },
      {
        id: 'dhc_collagen',
        brand: 'DHC',
        name: 'コラーゲン',
        serving_unit: '6粒',
        servings_options: [1],
        per_serving: {
          calories: 13, protein: 2.1, fat: 0.1, carbs: 0.9,
          special: 'コラーゲン2000mg',
          vitamins: { C: 50 }, minerals: {}
        }
      },
      {
        id: 'on_glutamine',
        brand: 'Optimum Nutrition',
        name: 'グルタミンパウダー',
        serving_unit: 'スプーン(5g)',
        servings_options: [1, 2],
        per_serving: {
          calories: 20, protein: 5, fat: 0, carbs: 0,
          special: 'L-グルタミン5g',
          vitamins: {}, minerals: {}
        }
      },
    ]
  },
}

// 全製品をフラットなリストで取得
export function getAllProducts() {
  return Object.values(SUPPLEMENT_DB).flatMap(cat =>
    cat.products.map(p => ({ ...p, category: cat.label, categoryIcon: cat.icon }))
  )
}

// カテゴリ一覧を取得
export function getCategories() {
  return Object.entries(SUPPLEMENT_DB).map(([id, cat]) => ({
    id, label: cat.label, icon: cat.icon, count: cat.products.length
  }))
}
