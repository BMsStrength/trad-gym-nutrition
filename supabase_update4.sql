-- supplement_records テーブルに栄養素データカラムを追加
alter table supplement_records
  add column if not exists nutrients jsonb,
  add column if not exists product_id text,
  add column if not exists servings numeric default 1;

-- water_records テーブルにメモカラムを追加
alter table water_records
  add column if not exists memo text;
