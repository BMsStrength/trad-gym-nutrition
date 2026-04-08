-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- サプリメントマスターテーブル
-- トレーナーがSupabase管理画面から追加・編集可能
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists supplements_master (
  id text primary key,
  brand text not null,
  name text not null,
  category text not null,
  category_icon text default '💊',
  serving_unit text not null,
  servings_options jsonb default '[1, 2]',
  calories_per_serving numeric default 0,
  protein_per_serving numeric default 0,
  fat_per_serving numeric default 0,
  carbs_per_serving numeric default 0,
  vitamins_per_serving jsonb default '{}',
  minerals_per_serving jsonb default '{}',
  special_per_serving text,
  flavor_note text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 全ユーザーが読み取り可能（認証不要）
alter table supplements_master enable row level security;
create policy "全員が読み取り可能" on supplements_master
  for select using (true);
create policy "管理者のみ編集可能" on supplements_master
  for all using (exists (select 1 from admins where id = auth.uid()));

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 製品データ投入（約120製品）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ■ プロテイン（ホエイ）
insert into supplements_master values
('on_gold_whey','Optimum Nutrition','ゴールドスタンダード ホエイ','プロテイン','🥛','スクープ(30g)','[0.5,1,1.5,2]',120,24,1.5,3,'{}','{}',null,'ダブルリッチチョコ等',true,now()),
('on_gold_whey_isolate','Optimum Nutrition','プラチナムホエイ アイソレート','プロテイン','🥛','スクープ(32g)','[1,2]',130,25,1,3,'{}','{}',null,null,true,now()),
('myprotein_impact','Myprotein','インパクトホエイプロテイン','プロテイン','🥛','スクープ(25g)','[1,2]',103,21,1.9,1,'{}','{}',null,null,true,now()),
('myprotein_clear','Myprotein','クリアホエイアイソレート','プロテイン','🥛','スクープ(25g)','[1,2]',93,20,0.2,2,'{}','{}',null,null,true,now()),
('dymatize_iso100','Dymatize','ISO100 ホエイアイソレート','プロテイン','🥛','スクープ(30g)','[1,2]',120,25,0.5,2,'{}','{}',null,null,true,now()),
('dymatize_elite','Dymatize','エリートホエイ','プロテイン','🥛','スクープ(36g)','[1,2]',140,25,2.5,5,'{}','{}',null,null,true,now()),
('muscletech_nitrotech','MuscleTech','ニトロテック ホエイゴールド','プロテイン','🥛','スクープ(46g)','[1,2]',170,30,3.5,6,'{}','{}',null,null,true,now()),
('bsn_syntha6','BSN','シンサ6 アイソレート','プロテイン','🥛','スクープ(44g)','[1,2]',200,25,6,14,'{}','{}',null,null,true,now()),
('r1_whey_blend','Rule One Proteins','R1 ホエイブレンド','プロテイン','🥛','スクープ(30g)','[1,2]',120,25,1.5,2,'{}','{}',null,null,true,now()),
('r1_whey_isolate','Rule One Proteins','R1 ホエイアイソレート','プロテイン','🥛','スクープ(28g)','[1,2]',110,25,0.5,1,'{}','{}',null,null,true,now()),
('kaged_whey','Kaged','ホエイプロテインアイソレート','プロテイン','🥛','スクープ(31g)','[1,2]',120,25,0.5,3,'{}','{}',null,null,true,now()),
('transparent_whey','Transparent Labs','100% ホエイプロテインアイソレート','プロテイン','🥛','スクープ(32g)','[1,2]',120,28,0,1,'{}','{}',null,null,true,now()),
('ghost_whey','GHOST Lifestyle','ゴーストホエイ','プロテイン','🥛','スクープ(35g)','[1,2]',130,25,3.5,5,'{}','{}',null,null,true,now()),
('applied_iso','Applied Nutrition','Critical Whey','プロテイン','🥛','スクープ(30g)','[1,2]',113,22.6,2.2,3,'{}','{}',null,null,true,now()),
('usn_bluelab','USN','ブルーラボ 100%ホエイ','プロテイン','🥛','スクープ(34g)','[1,2]',132,24,2.5,3,'{}','{}',null,null,true,now()),
('olimp_whey','Olimp Sport Nutrition','100% ホエイプロテイン','プロテイン','🥛','スクープ(28g)','[1,2]',108,22,2,2,'{}','{}',null,null,true,now()),
('savas_whey100','SAVAS（ザバス）','ホエイプロテイン100','プロテイン','🥛','スクープ(21g)','[1,2,3]',80,15,1.1,4.4,'{"B1":0.36,"B2":0.41,"B6":0.45,"C":20}','{"カルシウム":130,"マグネシウム":16}',null,'ミルクチョコ等',true,now()),
('dns_whey','DNS','プロテインホエイ100','プロテイン','🥛','スクープ(30g)','[1,2]',115,22.5,2.1,3,'{}','{}',null,null,true,now()),
('valx_whey','VALX（バルクス）','ホエイプロテイン','プロテイン','🥛','スクープ(30g)','[1,2]',110,21,2,3,'{}','{}',null,null,true,now()),
('grong_whey','GronG（グロング）','ホエイプロテイン100 スタンダード','プロテイン','🥛','スクープ(30g)','[1,2]',116,22,2.5,2,'{}','{}',null,null,true,now()),
('alpron_whey','ALPRON（アルプロン）','WPCホエイプロテイン','プロテイン','🥛','スクープ(25g)','[1,2]',94,18,2,3,'{}','{}',null,null,true,now()),
('kentai_whey','kentai（健康体力研究所）','ホエイプロテイン100 アドバンス','プロテイン','🥛','スクープ(25g)','[1,2]',96,20,1.3,2.4,'{}','{}',null,null,true,now()),
('be_legend_whey','be LEGEND（ビーレジェンド）','ホエイプロテイン','プロテイン','🥛','スクープ(28g)','[1,2]',105,20,2,4,'{}','{}',null,null,true,now()),
('explosion_whey','X-PLOSION（エクスプロージョン）','ホエイプロテイン','プロテイン','🥛','スクープ(33g)','[1,2]',122,23,2.5,3,'{}','{}',null,null,true,now()),
('ultora_whey','ULTORA（ウルトラ）','ホエイプロテイン ダイエット','プロテイン','🥛','スクープ(25g)','[1,2]',90,18,1,3,'{}','{}',null,null,true,now()),
-- ソイ・カゼイン
('savas_soy','SAVAS（ザバス）','ソイプロテイン100','プロテイン','🥛','スクープ(21g)','[1,2]',75,14.5,0.5,3.5,'{}','{}',null,null,true,now()),
('myprotein_soy','Myprotein','ソイプロテインアイソレート','プロテイン','🥛','スクープ(25g)','[1,2]',96,24,1,0.5,'{}','{}',null,null,true,now()),
('on_casein','Optimum Nutrition','ゴールドスタンダード カゼイン','プロテイン','🥛','スクープ(34g)','[1,2]',120,24,1,4,'{}','{"カルシウム":600}',null,null,true,now()),

-- ■ BCAA / EAA
('xtend_bcaa','Scivation / XTEND','XTEND オリジナル BCAA','BCAA/EAA','⚡','スクープ(14.3g)','[1,2]',0,7,0,0,'{"B6":0.6}','{"ナトリウム":190,"カリウム":160}',null,null,true,now()),
('on_amino_energy','Optimum Nutrition','アミノ エナジー','BCAA/EAA','⚡','スクープ(9g)','[1,2,3]',30,5,0,3,'{}','{}','カフェイン100mg',null,true,now()),
('myprotein_bcaa','Myprotein','Essential BCAA 2:1:1','BCAA/EAA','⚡','スクープ(9g)','[1,2]',28,7,0,0,'{}','{}',null,null,true,now()),
('myprotein_eaa','Myprotein','EAAパウダー','BCAA/EAA','⚡','スクープ(11g)','[1,2]',35,9,0,0.5,'{}','{}',null,null,true,now()),
('kaged_bcaa','Kaged','BCAA 2:1:1','BCAA/EAA','⚡','スクープ(7g)','[1,2]',25,7,0,0,'{}','{}',null,null,true,now()),
('transparent_bcaa','Transparent Labs','BCAAs Glutamine','BCAA/EAA','⚡','スクープ(14g)','[1,2]',0,8,0,0,'{}','{}','グルタミン5g',null,true,now()),
('dns_bcaa','DNS','BCAA パウダー','BCAA/EAA','⚡','スクープ(10g)','[1,2]',30,7.4,0,0.1,'{}','{}',null,null,true,now()),
('savas_bcaa','SAVAS（ザバス）','BCAAパウダー8200','BCAA/EAA','⚡','1袋(4.5g)','[1,2,3]',16,4,0,0,'{}','{}',null,null,true,now()),
('valx_bcaa','VALX（バルクス）','BCAA パウダー','BCAA/EAA','⚡','スクープ(5g)','[1,2]',18,5,0,0,'{}','{}',null,null,true,now()),
('grong_eaa','GronG（グロング）','EAAパウダー','BCAA/EAA','⚡','スクープ(10g)','[1,2]',35,9,0,0.5,'{}','{}',null,null,true,now()),

-- ■ クレアチン
('on_creatine','Optimum Nutrition','マイクロナイズド クレアチン','クレアチン','💪','スプーン(5g)','[1]',0,0,0,0,'{}','{}','クレアチン5g',null,true,now()),
('myprotein_creatine','Myprotein','クレアチンモノハイドレート','クレアチン','💪','スプーン(5g)','[1]',0,0,0,0,'{}','{}','クレアチン5g',null,true,now()),
('transparent_creatine','Transparent Labs','クレアチン HMB','クレアチン','💪','スプーン(10g)','[1]',0,0,0,0,'{}','{}','クレアチン5g・HMB1.5g',null,true,now()),
('dns_creatine','DNS','クレアチン パウダー','クレアチン','💪','スプーン(3g)','[1,2]',0,0,0,0,'{}','{}','クレアチン3g',null,true,now()),
('grong_creatine','GronG（グロング）','クレアチンモノハイドレート','クレアチン','💪','スプーン(5g)','[1]',0,0,0,0,'{}','{}','クレアチン5g',null,true,now()),
('bulk_creatine','Bulk','クレアチンモノハイドレート','クレアチン','💪','スプーン(5g)','[1]',0,0,0,0,'{}','{}','クレアチン5g',null,true,now()),

-- ■ マルチビタミン
('now_adam','NOW Foods','ADAM マルチビタミン（男性）','ビタミン','🌟','2粒','[1]',10,0,0,2,'{"A":750,"B1":25,"B2":12.5,"B6":25,"B12":100,"C":500,"D":25,"E":100,"K":120,"葉酸":400}','{"カルシウム":200,"マグネシウム":100,"亜鉛":15}',null,null,true,now()),
('now_eve','NOW Foods','EVE マルチビタミン（女性）','ビタミン','🌟','3粒','[1]',15,0,0,3,'{"A":750,"B1":25,"B2":12.5,"B6":25,"B12":100,"C":500,"D":25,"E":100,"K":120,"葉酸":800}','{"カルシウム":500,"マグネシウム":100,"鉄":18,"亜鉛":12}',null,null,true,now()),
('thorne_basic','Thorne','ベーシック ニュートリエンツ','ビタミン','🌟','2粒','[1]',10,0,0,1,'{"A":500,"B1":50,"B2":25,"B6":25,"B12":200,"C":250,"D":25,"E":67,"葉酸":400}','{"カルシウム":100,"マグネシウム":50,"亜鉛":7,"銅":0.5}',null,null,true,now()),
('life_ext_two','Life Extension','Two-Per-Day マルチビタミン','ビタミン','🌟','2粒','[1]',20,0,0,3,'{"A":750,"B1":75,"B2":50,"B6":75,"B12":300,"C":1000,"D":25,"E":100,"K":90,"葉酸":400}','{"カルシウム":200,"マグネシウム":100,"亜鉛":10}',null,null,true,now()),
('garden_mykind','Garden of Life','mykind オーガニックマルチ','ビタミン','🌟','3粒','[1]',40,1,0.5,6,'{"A":405,"B1":1.4,"B2":1.4,"B6":2,"B12":4,"C":62,"D":20,"E":13,"K":80,"葉酸":400}','{"カルシウム":60,"マグネシウム":15,"鉄":8,"亜鉛":7}',null,null,true,now()),
('jarrow_multi','Jarrow Formulas','Multi 1-to-3 マルチビタミン','ビタミン','🌟','3粒','[1]',15,0,0,2,'{"A":600,"B1":25,"B2":25,"B6":25,"B12":100,"C":500,"D":25,"E":67,"葉酸":400}','{"カルシウム":200,"マグネシウム":100,"亜鉛":10}',null,null,true,now()),
('fancl_multi','FANCL（ファンケル）','マルチビタミン','ビタミン','🌟','1粒','[1]',2,0,0,0.5,'{"A":540,"B1":1.2,"B2":1.4,"B6":1.3,"B12":2.4,"C":100,"D":5.5,"E":6.3,"K":75,"葉酸":240}','{}',null,null,true,now()),
('dhc_multi','DHC','マルチビタミン','ビタミン','🌟','1粒','[1]',3,0,0.1,0.6,'{"A":600,"B1":5,"B2":5,"B6":5,"B12":25,"C":500,"D":2.5,"E":50,"葉酸":200}','{}',null,null,true,now()),
('dianatura_multi','ディアナチュラ（アサヒ）','マルチビタミン＆ミネラル','ビタミン','🌟','1粒','[1]',3,0,0,0.8,'{"A":540,"B1":1.2,"B2":1.4,"B6":1.3,"B12":2.4,"C":100,"D":5.5,"E":6.3,"葉酸":240}','{"カルシウム":210,"マグネシウム":100,"鉄":6.8,"亜鉛":8}',null,null,true,now()),
('naturemade_multi','ネイチャーメイド（大塚製薬）','マルチビタミン＆ミネラル','ビタミン','🌟','2粒','[1]',5,0,0,1,'{"A":500,"B1":1.2,"B2":1.4,"B6":1.3,"B12":2.4,"C":80,"D":5,"E":9,"葉酸":200}','{"カルシウム":210,"マグネシウム":100,"鉄":7}',null,null,true,now()),
('nutrabio_multi','NutraBio','マルチビタミン','ビタミン','🌟','6粒','[1]',25,0,0,4,'{"A":750,"B1":100,"B2":50,"B6":100,"B12":500,"C":1000,"D":50,"E":200,"K":120,"葉酸":800}','{"カルシウム":500,"マグネシウム":200,"亜鉛":25}',null,null,true,now()),

-- ■ ビタミン単体
('now_vitd3_2000','NOW Foods','ビタミンD3 2000IU','ビタミン','☀️','1粒','[1,2]',0,0,0,0,'{"D":50}','{}',null,null,true,now()),
('now_vitd3_5000','NOW Foods','ビタミンD3 5000IU','ビタミン','☀️','1粒','[1]',0,0,0,0,'{"D":125}','{}',null,null,true,now()),
('thorne_vitd3','Thorne','ビタミンD3 1000IU','ビタミン','☀️','1粒','[1,2,3]',0,0,0,0,'{"D":25}','{}',null,null,true,now()),
('dhc_vitc','DHC','ビタミンC ハードカプセル','ビタミン','🍊','2粒','[1,2]',2,0,0,0.5,'{"C":1000}','{}',null,null,true,now()),
('now_vitc_1000','NOW Foods','ビタミンC 1000mg','ビタミン','🍊','1粒','[1,2,3]',0,0,0,0,'{"C":1000}','{}',null,null,true,now()),
('solgar_vitc','Solgar','ビタミンC 1000mg','ビタミン','🍊','1粒','[1,2]',5,0,0,1,'{"C":1000}','{}',null,null,true,now()),
('now_bcomplex','NOW Foods','B-50 コンプレックス','ビタミン','🧡','1粒','[1]',5,0,0,1,'{"B1":50,"B2":50,"B6":50,"B12":50,"葉酸":400}','{}',null,null,true,now()),
('thorne_b_complex','Thorne','ベーシック B コンプレックス','ビタミン','🧡','1粒','[1]',5,0,0,1,'{"B1":35,"B2":15,"B6":20,"B12":200,"葉酸":400}','{}',null,null,true,now()),
('dhc_vitb','DHC','ビタミンB ミックス','ビタミン','🧡','2粒','[1]',3,0,0.1,0.5,'{"B1":5,"B2":5,"B6":5,"B12":25,"葉酸":200}','{}',null,null,true,now()),
('naturemade_vitd','ネイチャーメイド（大塚製薬）','ビタミンD 1000IU','ビタミン','☀️','1粒','[1,2]',0,0,0,0,'{"D":25}','{}',null,null,true,now()),
('orihiro_vitc','ORIHIRO（オリヒロ）','ビタミンC粒','ビタミン','🍊','2粒','[1,2]',2,0,0,0.5,'{"C":500}','{}',null,null,true,now()),

-- ■ ミネラル
('now_magnesium','NOW Foods','マグネシウム 400mg','ミネラル','⚗️','2粒','[0.5,1,2]',0,0,0,0,'{}','{"マグネシウム":400}',null,null,true,now()),
('thorne_magnesium','Thorne','マグネシウム シトレート','ミネラル','⚗️','1粒','[1,2]',0,0,0,0,'{}','{"マグネシウム":150}',null,null,true,now()),
('now_zinc_50','NOW Foods','亜鉛 50mg','ミネラル','⚗️','1粒','[0.5,1]',0,0,0,0,'{}','{"亜鉛":50}',null,null,true,now()),
('jarrow_zinc','Jarrow Formulas','亜鉛バランス','ミネラル','⚗️','1粒','[1]',0,0,0,0,'{}','{"亜鉛":15,"銅":1}',null,null,true,now()),
('dhc_iron','DHC','鉄','ミネラル','🫀','2粒','[1]',3,0.1,0.1,0.5,'{"C":50}','{"鉄":10}',null,null,true,now()),
('now_iron','NOW Foods','アイアン 36mg','ミネラル','🫀','1粒','[1]',5,0,0,1,'{"C":25}','{"鉄":36}',null,null,true,now()),
('fancl_ca_mg','FANCL（ファンケル）','カルシウム＋MG','ミネラル','⚗️','3粒','[1]',5,0.2,0.1,1,'{"D":2.5}','{"カルシウム":360,"マグネシウム":180}',null,null,true,now()),
('now_calcium','NOW Foods','カルシウム＆マグネシウム','ミネラル','⚗️','2粒','[1]',0,0,0,0,'{"D":5}','{"カルシウム":500,"マグネシウム":250}',null,null,true,now()),
('dianatura_iron','ディアナチュラ（アサヒ）','鉄・葉酸','ミネラル','🫀','1粒','[1]',2,0,0,0.5,'{"葉酸":240}','{"鉄":10}',null,null,true,now()),
('uha_iron','UHAグミサプリ','鉄分グミ','ミネラル','🫀','2粒','[1,2]',14,0,0,3,'{"C":50,"葉酸":120}','{"鉄":5}',null,null,true,now()),
('orihiro_calcium','ORIHIRO（オリヒロ）','カルシウム＆マグネシウム','ミネラル','⚗️','6粒','[1]',7,0.4,0.2,1.2,'{"D":2.5,"K":45}','{"カルシウム":360,"マグネシウム":180}',null,null,true,now()),

-- ■ オメガ3 / 魚油
('now_omega3','NOW Foods','オメガ3 1000mg','オメガ3/魚油','🐟','1粒','[1,2,3]',10,0,1,0,'{}','{}','EPA180mg・DHA120mg',null,true,now()),
('nordic_omega3','Nordic Naturals','アルティメットオメガ','オメガ3/魚油','🐟','2粒','[1]',25,0,2.5,0,'{"E":5}','{}','EPA650mg・DHA450mg',null,true,now()),
('dhc_dha','DHC','DHA','オメガ3/魚油','🐟','3粒','[1]',12,0.1,1.1,0,'{"E":2}','{}','DHA223mg・EPA47mg',null,true,now()),
('fancl_dha','FANCL（ファンケル）','DHA＆EPA＋ナットウキナーゼ','オメガ3/魚油','🐟','4粒','[1]',15,0,1.5,0,'{}','{}','DHA270mg・EPA108mg',null,true,now()),
('naturemade_dha','ネイチャーメイド（大塚製薬）','フィッシュオイル','オメガ3/魚油','🐟','2粒','[1]',18,0,2,0,'{"E":2}','{}','DHA220mg・EPA100mg',null,true,now()),
('santory_dha','サントリーウエルネス','DHA&EPA＋セサミンE','オメガ3/魚油','🐟','6粒','[1]',18,0,1.8,0.3,'{"E":8}','{}','DHA300mg・EPA81mg',null,true,now()),
('life_ext_omega','Life Extension','Super Omega-3 EPA/DHA','オメガ3/魚油','🐟','2粒','[1]',20,0,2,0,'{"E":5}','{}','EPA480mg・DHA360mg',null,true,now()),
('doctor_best_fish','Doctor''s Best','フィッシュオイル EPA/DHA','オメガ3/魚油','🐟','2粒','[1]',20,0,2,0,'{}','{}','EPA500mg・DHA250mg',null,true,now()),

-- ■ コラーゲン・美容
('dhc_collagen','DHC','コラーゲン','美容・その他','💊','6粒','[1]',13,2.1,0.1,0.9,'{"C":50}','{}','コラーゲン2000mg',null,true,now()),
('fancl_collagen','FANCL（ファンケル）','ディープチャージ コラーゲン','美容・その他','💊','3粒','[1]',10,1.5,0.1,1,'{"C":50,"B2":0.5}','{}','コラーゲン1500mg',null,true,now()),
('kobayashi_collagen','小林製薬','コラーゲン＆ヒアルロン酸','美容・その他','💊','3粒','[1]',8,1.2,0,1,'{"C":30}','{}','コラーゲン1200mg',null,true,now()),

-- ■ その他・機能系
('now_coq10','NOW Foods','CoQ10 100mg','美容・その他','💊','1粒','[1,2]',5,0,0.5,0,'{}','{}','CoQ10 100mg',null,true,now()),
('thorne_coq10','Thorne','CoQ10','美容・その他','💊','1粒','[1,2]',5,0,0.5,0,'{}','{}','CoQ10 100mg',null,true,now()),
('on_glutamine','Optimum Nutrition','グルタミンパウダー','美容・その他','💊','スプーン(5g)','[1,2]',20,5,0,0,'{}','{}','L-グルタミン5g',null,true,now()),
('now_acetyl_l','NOW Foods','アセチル L-カルニチン 500mg','美容・その他','💊','1粒','[1,2]',5,0,0,0,'{}','{}','ALC 500mg',null,true,now()),
('nutraceuticals_probio','Jarrow Formulas','プロバイオティクス Jarro-Dophilus','美容・その他','💊','1粒','[1]',0,0,0,0,'{}','{}','乳酸菌50億個',null,true,now()),
('santory_sesamin','サントリーウエルネス','セサミンE','美容・その他','💊','3粒','[1]',12,0.3,0.9,0.3,'{"E":30}','{}','セサミン10mg',null,true,now()),
('gc_protein_bar','GNC','プロテインバー','プロテイン','🥛','1本(45g)','[1]',190,20,7,17,'{}','{}',null,null,true,now())
on conflict (id) do nothing;

