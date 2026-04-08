-- profiles テーブルに新しい列を追加
alter table profiles
  add column if not exists goals jsonb default '[]',
  add column if not exists symptoms jsonb default '[]',
  add column if not exists symptoms_other text;

-- meal_records テーブルに新しい列を追加
alter table meal_records
  add column if not exists meal_type text,
  add column if not exists symptoms text;
